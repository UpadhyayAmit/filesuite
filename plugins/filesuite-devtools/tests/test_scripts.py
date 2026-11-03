"""Stdlib unittest suite for the filesuite-devtools scripts.

Run:  python3 -m unittest discover -s plugins/filesuite-devtools/tests -v

Fake secrets are assembled at runtime so this file never contains a literal that
secret scanners (including our own guard and GitHub push protection) would flag.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(rel: str):
    path = ROOT / rel
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


jwt_inspect = load("skills/jwt-inspector/scripts/jwt_inspect.py")
infer_schema = load("skills/json-schema-infer/scripts/infer_schema.py")
context_budget = load("skills/context-budget/scripts/context_budget.py")
guard = load("hooks/scripts/guard_secrets.py")
validate = load("hooks/scripts/validate_structured.py")


def b64(obj) -> str:
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()


def make_jwt(payload: dict, secret: str = "s3cret", alg: str = "HS256") -> str:
    signing_input = f"{b64({'alg': alg, 'typ': 'JWT'})}.{b64(payload)}"
    sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return signing_input + "." + base64.urlsafe_b64encode(sig).rstrip(b"=").decode()


def quiet(fn, *args):
    with redirect_stdout(io.StringIO()) as buf:
        code = fn(*args)
    return code, buf.getvalue()


def write_temp(suffix: str, content: str) -> str:
    fd, name = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(content)
    return name


class JwtInspectTests(unittest.TestCase):
    def test_good_token_verifies(self):
        now = int(time.time())
        token = make_jwt({"sub": "1", "iss": "a", "aud": "b", "iat": now, "exp": now + 600})
        code, out = quiet(jwt_inspect.main, [token, "--secret", "s3cret", "--json"])
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out)["signature"], "valid")

    def test_wrong_secret_is_high(self):
        token = make_jwt({"exp": int(time.time()) + 60})
        code, out = quiet(jwt_inspect.main, [token, "--secret", "nope", "--json"])
        self.assertEqual(code, 1)
        self.assertIn("bad-signature", [f["code"] for f in json.loads(out)["findings"]])

    def test_alg_none_and_no_exp(self):
        token = f"{b64({'alg': 'none'})}.{b64({'sub': 'x', 'password': 'p'})}."
        code, out = quiet(jwt_inspect.main, [token, "--json"])
        codes = {f["code"] for f in json.loads(out)["findings"]}
        self.assertEqual(code, 1)
        self.assertTrue({"alg-none", "no-exp", "sensitive-claim"} <= codes)

    def test_garbage_is_exit_2(self):
        with redirect_stdout(io.StringIO()), open(os.devnull, "w") as devnull:
            sys_stderr, sys.stderr = sys.stderr, devnull
            try:
                self.assertEqual(jwt_inspect.main(["not-a-jwt"]), 2)
            finally:
                sys.stderr = sys_stderr


class InferSchemaTests(unittest.TestCase):
    def test_merge_detects_optional_and_union(self):
        schema = infer_schema.infer([{"id": 1, "tag": "a"}, {"id": 2.5}, {"id": 3, "tag": None}])
        self.assertEqual(schema["required"], ["id"])
        self.assertEqual(schema["properties"]["id"], {"type": "number"})
        self.assertEqual({v["type"] for v in schema["properties"]["tag"]["anyOf"]}, {"null", "string"})

    def test_strict_mode(self):
        schema = infer_schema.infer([{"a": 1, "b": "x"}, {"a": 2}], strict=True, examples=False)
        self.assertEqual(schema["required"], ["a", "b"])
        self.assertFalse(schema["additionalProperties"])
        self.assertIn({"type": "null"}, schema["properties"]["b"]["anyOf"])

    def test_array_of_objects(self):
        schema = infer_schema.infer([[{"x": 1}, {"x": 2, "y": True}]])
        self.assertEqual(schema["items"]["required"], ["x"])


class ContextBudgetTests(unittest.TestCase):
    def test_chunk_count(self):
        self.assertEqual(context_budget.chunk_count(0, 100, 10), 0)
        self.assertEqual(context_budget.chunk_count(100, 100, 10), 1)
        self.assertEqual(context_budget.chunk_count(190, 100, 10), 2)
        self.assertEqual(context_budget.chunk_count(191, 100, 10), 3)

    def test_budget_fail_lists_drops(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, "big.txt").write_text("a" * 4000)
            Path(d, "small.txt").write_text("a" * 40)
            Path(d, "bin.dat").write_bytes(b"\x00\x01" * 10)
            code, out = quiet(context_budget.main, [d, "--budget", "500", "--json", "--no-git"])
            result = json.loads(out)
            self.assertEqual(code, 1)
            self.assertEqual(result["skipped_binary_or_large"], 1)
            self.assertTrue(result["budget"]["drop_to_fit"][0].endswith("big.txt"))


class GuardSecretsTests(unittest.TestCase):
    aws = "AKIA" + "ABCDEFGHIJKLMNOP"
    pem = "-----BEGIN " + "RSA PRIVATE KEY-----"

    def run_hook(self, event: dict):
        proc = subprocess.run(
            [sys.executable, str(ROOT / "hooks/scripts/guard_secrets.py"), "--claude-hook"],
            input=json.dumps(event), capture_output=True, text=True, check=True,
        )
        return json.loads(proc.stdout) if proc.stdout.strip() else None

    def test_denies_hard_secret_on_write(self):
        out = self.run_hook({"tool_name": "Write", "tool_input": {"file_path": "x.py", "content": f"k = '{self.aws}'"}})
        self.assertEqual(out["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertNotIn(self.aws, out["hookSpecificOutput"]["permissionDecisionReason"])  # redacted

    def test_asks_on_jwt_in_multiedit(self):
        jwt = make_jwt({"sub": "1"})
        out = self.run_hook({"tool_name": "MultiEdit", "tool_input": {"file_path": "t.ts", "edits": [{"new_string": jwt}]}})
        self.assertEqual(out["hookSpecificOutput"]["permissionDecision"], "ask")

    def test_clean_and_allow_marker(self):
        self.assertIsNone(self.run_hook({"tool_name": "Edit", "tool_input": {"new_string": "x = 1"}}))
        line = f"{self.pem}  # {guard.ALLOW_MARKER}"
        self.assertIsNone(self.run_hook({"tool_name": "Write", "tool_input": {"content": line}}))

    def test_placeholder_connection_string_ignored(self):
        self.assertEqual(guard.scan("postgres://user:your_password@localhost/db"), [])
        fake = "postgres://admin:" + "hunter22x@db.internal/app"
        self.assertEqual(guard.scan(fake)[0].rule, "connection-string-password")

    def test_soft_findings_warn_unless_strict(self):
        name = write_temp(".ts", make_jwt({"sub": "demo"}) + "\n")
        try:
            self.assertEqual(quiet(guard.main, [name])[0], 0)
            self.assertEqual(quiet(guard.main, ["--strict", name])[0], 1)
        finally:
            os.unlink(name)

    def test_file_mode(self):
        name = write_temp(".env", self.pem + "\n")
        try:
            with open(os.devnull, "w") as devnull:
                sys_stderr, sys.stderr = sys.stderr, devnull
                try:
                    code, out = quiet(guard.scan_files, [name])
                finally:
                    sys.stderr = sys_stderr
            self.assertEqual(code, 1)
            self.assertIn("private-key", out)
        finally:
            os.unlink(name)


class ValidateStructuredTests(unittest.TestCase):
    def check(self, name: str, content: str):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d, name)
            path.write_text(content)
            return validate.validate(str(path))

    def test_json(self):
        self.assertIsNone(self.check("a.json", '{"a": 1}'))
        self.assertIn("line 1", self.check("a.json", '{"a": 1,}'))

    def test_jsonc_skipped(self):
        self.assertIsNone(self.check("tsconfig.json", '{ // comment\n "a": 1 }'))

    def test_jsonl(self):
        self.assertIn("line 2", self.check("e.jsonl", '{"a":1}\n{bad}\n'))

    @unittest.skipIf(sys.version_info < (3, 11), "tomllib needs 3.11+")
    def test_toml(self):
        self.assertIsNone(self.check("p.toml", 'a = 1\n'))
        self.assertIsNotNone(self.check("p.toml", 'a = \n'))

    def test_hook_blocks_with_reason(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, "bad.json").write_text("{nope")
            proc = subprocess.run(
                [sys.executable, str(ROOT / "hooks/scripts/validate_structured.py"), "--claude-hook"],
                input=json.dumps({"cwd": d, "tool_name": "Write", "tool_input": {"file_path": "bad.json"}}),
                capture_output=True, text=True, check=True,
            )
            self.assertEqual(json.loads(proc.stdout)["decision"], "block")


if __name__ == "__main__":
    unittest.main()
