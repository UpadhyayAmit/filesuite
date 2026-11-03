---
name: jwt-inspector
description: Decode a JWT locally and audit it for security problems (alg=none, missing/long exp, sensitive claims, bad HMAC signature). Use when the user pastes a token starting with "eyJ", asks what is inside a JWT, debugs a 401/403 from an auth header, or reviews token-issuing code. Never send the token to a website or external API.
---

# JWT Inspector

Local, stdlib-only JWT decode + audit. The token never leaves the machine — do not paste it into
web decoders, and do not echo full tokens back in your reply (show the first 12 chars + `…`).

## Run

The script is `scripts/jwt_inspect.py` next to this file.

```bash
python3 <skill-dir>/scripts/jwt_inspect.py "<token>"          # human-readable
python3 <skill-dir>/scripts/jwt_inspect.py "<token>" --json   # for further processing
printf '%s' "$TOKEN" | python3 <skill-dir>/scripts/jwt_inspect.py -   # avoids shell history
python3 <skill-dir>/scripts/jwt_inspect.py "<token>" --secret "$JWT_SECRET"  # verify HS256/384/512
```

Prefer the stdin form when the token is in an env var or file. Exit code `1` means at least one
high-severity finding; `2` means the input is not a JWT.

## How to report

1. One-line verdict: valid shape? expired? signature verified or not attempted?
2. Table of findings, high → low, with the concrete fix for each (e.g. "issuer must set `exp` ≤ 1h").
3. Only the claims relevant to the user's question — not the whole payload dump.

## Limits

- RS*/ES*/EdDSA verification needs a public key and a crypto library; say so instead of guessing.
- `alg` in the header is attacker-controlled. If the user's verifier reads `alg` from the token
  rather than pinning it, flag that as the real bug.
