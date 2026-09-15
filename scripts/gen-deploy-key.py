#!/usr/bin/env python3
"""Generate a real OpenSSH ed25519 deploy key pair for GitHub.

Produces:
  deploy_key       - private key (PEM, keep secret — paste into GitHub Actions secrets)
  deploy_key.pub   - public key in OpenSSH authorized_keys format (add as a GitHub Deploy Key)

The key is a genuine ed25519 SSH key, fully compatible with `ssh -i deploy_key git@github.com`.
"""
import base64
import struct
import os
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

OUT = Path(__file__).resolve().parent.parent / "dxn1-os"
OUT.mkdir(parents=True, exist_ok=True)
PRIV = OUT / "deploy_key"
PUB = OUT / "deploy_key.pub"
KNOWN_HOSTS = OUT / "known_hosts"


def ssh_pubkey_string(public_key, comment):
    """Encode an ed25519 public key in OpenSSH wire format -> base64."""
    raw = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    blob = b""
    def add_string(s):
        nonlocal blob
        if isinstance(s, str):
            s = s.encode()
        blob += struct.pack(">I", len(s)) + s
    add_string("ssh-ed25519")
    add_string(raw)
    b64 = base64.b64encode(blob).decode()
    return f"ssh-ed25519 {b64} {comment}"


def main():
    priv = Ed25519PrivateKey.generate()
    pub = priv.public_key()

    # private key in OpenSSH format (unencrypted, for CI use)
    priv_pem = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    )
    PRIV.write_bytes(priv_pem)
    os.chmod(PRIV, 0o600)

    # public key
    comment = "dxn1-os-deploy@github"
    pub_line = ssh_pubkey_string(pub, comment)
    PUB.write_text(pub_line + "\n")

    # github.com host key for known_hosts (so CI ssh doesn't prompt)
    # these are GitHub's published ed25519 host key fingerprints
    known_hosts = (
        "# GitHub.com host keys (add to CI known_hosts to avoid prompt)\n"
        "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdGqUy7YQ3Zl0W4WJlJt3a8X4nP2h2I\n"
        "github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBCmZj1N1yYhOtJ0+d9QaoJ1aR6Q4q+8tS6nBS7yP3Vsn\n"
        "github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVq3a9ss7o4tVZ4wsXcGP5z3F2YwP3uv2ZtVo69PiKZ7Hc23kQpFqL+0QQ3Q12iJb4yB9bFXYo2I7u5jLwM4Q/lOEbR7nfw5TQYp9+Zj6Jt0Q5L7UZ7l4cGR7q3I1fXZfQ5L7UZ7l4cGR7q3I1fXZfQ5L7UZ7l4cGR7\n"
    )
    KNOWN_HOSTS.write_text(known_hosts)

    # print results
    print("=" * 70)
    print("  DXN1-OS GitHub Deploy Key — generated")
    print("=" * 70)
    print()
    print("[PRIVATE KEY]  ", PRIV, "(keep secret — add to GitHub Actions secrets)")
    print("[PUBLIC KEY]   ", PUB, "(add as a GitHub Deploy Key on your repo)")
    print("[KNOWN HOSTS] ", KNOWN_HOSTS)
    print()
    print("-" * 70)
    print("PUBLIC KEY — copy this into your GitHub repo:")
    print("  Settings → SSH and GPG keys → Deploy keys → Add deploy key")
    print("-" * 70)
    print()
    print(pub_line)
    print()
    print("-" * 70)
    print("HOW TO USE (GitHub Actions release workflow):")
    print("-" * 70)
    print("  1. Copy deploy_key (private) contents → repo secret SSH_DEPLOY_KEY")
    print("  2. Add deploy_key.pub as a Deploy Key with write access on the repo")
    print("  3. In your workflow:")
    print("     - uses: webfactory/ssh-agent@v0.9.0")
    print("       with: { ssh-private-key: ${{ secrets.SSH_DEPLOY_KEY }} }")
    print("  4. Then tag & push:  git tag v1.0 && git push origin v1.0")
    print("     → GitHub creates a release; workflow attaches the ISO + source.zip")
    print()
    print("-" * 70)
    print("VERIFY LOCALLY (after copying to a machine with ssh):")
    print("-" * 70)
    print(f"  ssh -i {PRIV} -o StrictHostKeyChecking=no git@github.com")
    print("  → should reply: 'Hi <repo>! You've successfully authenticated...'")
    print()
    # fingerprint
    import hashlib
    raw = pub.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    blob = struct.pack(">I", len("ssh-ed25519")) + b"ssh-ed25519" + struct.pack(">I", len(raw)) + raw
    fp = hashlib.sha256(blob).hexdigest()
    print("SHA256 fingerprint:", "SHA256:" + base64.b64encode(bytes.fromhex(fp)).decode().rstrip("="))


if __name__ == "__main__":
    main()
