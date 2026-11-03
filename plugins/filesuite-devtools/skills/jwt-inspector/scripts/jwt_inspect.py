#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Decode and security-audit a JWT locally. Stdlib only; nothing leaves the machine.

Usage:
  python3 jwt_inspect.py <token>
  echo "$TOKEN" | python3 jwt_inspect.py -
  python3 jwt_inspect.py <token> --secret "$HS_SECRET"   # verify HS256/384/512
  python3 jwt_inspect.py <token> --json                   # machine-readable

Exit codes: 0 = no high-severity findings, 1 = high-severity findings, 2 = bad input.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import sys
import time
from typing import Any

HMAC_ALGS = {"HS256": hashlib.sha256, "HS384": hashlib.sha384, "HS512": hashlib.sha512}
SENSITIVE_CLAIM_HINTS = ("password", "passwd", "secret", "ssn", "card", "cvv", "pin", "private")
MAX_REASONABLE_LIFETIME_S = 24 * 3600
CLOCK_SKEW_S = 60


def b64url_decode(segment: str) -> bytes:
    padded = segment + "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def decode(token: str) -> tuple[dict[str, Any], dict[str, Any], str]:
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise ValueError(f"JWT must have 3 dot-separated parts, got {len(parts)}")
    try:
        header = json.loads(b64url_decode(parts[0]))
        payload = json.loads(b64url_decode(parts[1]))
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError(f"header/payload is not base64url JSON: {exc}") from exc
    if not isinstance(header, dict) or not isinstance(payload, dict):
        raise ValueError("header and payload must be JSON objects")
    return header, payload, parts[2]


def verify_hmac(token: str, alg: str, secret: str) -> bool:
    signing_input, _, signature = token.strip().rpartition(".")
    digest = hmac.new(secret.encode(), signing_input.encode("ascii"), HMAC_ALGS[alg]).digest()
    expected = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return hmac.compare_digest(expected, signature)


def audit(header: dict[str, Any], payload: dict[str, Any], signature: str, now: float) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []

    def add(severity: str, code: str, message: str) -> None:
        findings.append({"severity": severity, "code": code, "message": message})

    alg = str(header.get("alg", ""))
    if alg.lower() == "none" or not signature:
        add("high", "alg-none", "Unsigned token (alg=none or empty signature). Must be rejected by verifiers.")
    if not alg:
        add("high", "alg-missing", "Header has no 'alg'.")
    if "jku" in header or "x5u" in header:
        add("medium", "remote-key-url", "Header references a remote key URL (jku/x5u); verifiers must allow-list it.")
    if alg.startswith("HS") and "kid" not in header:
        add("low", "no-kid", "HMAC token without 'kid' makes key rotation harder.")

    exp, nbf, iat = payload.get("exp"), payload.get("nbf"), payload.get("iat")
    if exp is None:
        add("high", "no-exp", "No 'exp' claim: token never expires.")
    elif isinstance(exp, (int, float)):
        if exp < now - CLOCK_SKEW_S:
            add("medium", "expired", f"Expired {int(now - exp)}s ago.")
        if isinstance(iat, (int, float)) and exp - iat > MAX_REASONABLE_LIFETIME_S:
            add("medium", "long-lived", f"Lifetime is {(exp - iat) / 3600:.1f}h (> 24h).")
    else:
        add("medium", "exp-not-numeric", "'exp' must be a NumericDate (seconds since epoch).")
    if isinstance(nbf, (int, float)) and nbf > now + CLOCK_SKEW_S:
        add("low", "not-yet-valid", f"'nbf' is {int(nbf - now)}s in the future.")
    if isinstance(iat, (int, float)) and iat > now + CLOCK_SKEW_S:
        add("medium", "iat-future", "'iat' is in the future: clock skew or forged token.")
    for claim in ("iss", "aud"):
        if claim not in payload:
            add("low", f"no-{claim}", f"No '{claim}' claim; verifiers cannot pin {claim}.")
    for key in payload:
        if any(hint in key.lower() for hint in SENSITIVE_CLAIM_HINTS):
            add("high", "sensitive-claim", f"Claim '{key}' looks sensitive. JWT payloads are readable by anyone.")
    return findings


def human_time(value: Any) -> str | None:
    if isinstance(value, (int, float)):
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(value))
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("token", help="JWT string, or '-' to read from stdin")
    parser.add_argument("--secret", help="HMAC secret to verify HS* signatures")
    parser.add_argument("--json", action="store_true", help="emit JSON")
    args = parser.parse_args(argv)

    token = sys.stdin.read().strip() if args.token == "-" else args.token.strip()
    try:
        header, payload, signature = decode(token)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    findings = audit(header, payload, signature, time.time())
    verification: str = "not-attempted"
    alg = str(header.get("alg", ""))
    if args.secret is not None:
        if alg in HMAC_ALGS:
            verification = "valid" if verify_hmac(token, alg, args.secret) else "INVALID"
            if verification == "INVALID":
                findings.append({"severity": "high", "code": "bad-signature", "message": "HMAC signature mismatch."})
        else:
            verification = f"unsupported-alg:{alg} (stdlib verifies HS* only)"

    times = {k: human_time(payload.get(k)) for k in ("iat", "nbf", "exp") if human_time(payload.get(k))}
    report = {"header": header, "payload": payload, "times_utc": times, "signature": verification, "findings": findings}

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("Header:  " + json.dumps(header))
        print("Payload: " + json.dumps(payload, indent=2))
        for k, v in times.items():
            print(f"  {k}: {v}")
        print(f"Signature: {verification}")
        if not findings:
            print("Findings: none")
        for f in sorted(findings, key=lambda f: ("high", "medium", "low").index(f["severity"])):
            print(f"  [{f['severity'].upper():6}] {f['code']}: {f['message']}")

    return 1 if any(f["severity"] == "high" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
