# Security Policy

## Supported versions

DXN1-OS is a minimal Linux distribution. We support the latest release only.

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## Reporting a vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: `security@dxn1.os` (if configured) or open a private security advisory:

1. Go to https://github.com/DXN1-termux/DXN1-OS-TAKE-2/security/advisories/new
2. Click "Report a vulnerability"
3. Describe the issue, include reproduction steps, and your assessment of severity

We aim to respond within 72 hours. If confirmed, we'll coordinate a fix and publish a patched release.

## Verifying releases

Every release includes a sha256 sidecar. Always verify before flashing:

```bash
sha256sum -c dxn1-os-1.0.iso.sha256
# dxn1-os-1.0.iso: OK
```

The release workflow (`.github/workflows/release.yml`) computes checksums automatically from the built artifacts — there is no manual step where checksums could be tampered with.

## Deploy keys

This repo uses an SSH deploy key for automated release publishing. The **private key never leaves GitHub Actions secrets**. If you believe the deploy key has been compromised:

1. Revoke the deploy key on the repo (Settings → Deploy keys → Delete)
2. Regenerate with `python3 scripts/gen-deploy-key.py`
3. Update the `SSH_DEPLOY_KEY` GitHub Actions secret
4. Add the new public key as a deploy key

## ISO integrity

The DXN1-OS ISO contains:
- A real Linux kernel (Debian 5.10 LTS) — verify with `file dxn1-os-1.0.iso`
- A real busybox binary (musl static) — verify the sha256
- No network calls during boot (the live system is offline by default)

The `dxn1-update` tool verifies every downloaded update against its sha256 sidecar before installing. If verification fails, the update is discarded and the old kernel is preserved.
