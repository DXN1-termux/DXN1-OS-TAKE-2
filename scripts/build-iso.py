#!/usr/bin/env python3
"""Build a real, mountable ISO9660 + Rock Ridge image for DXN1-OS 1.0.

Uses pycdlib to assemble the staging tree at dxn1-os/iso-tree/ into a
hybrid-style ISO image with an El Torito boot record. Rock Ridge gives
us long, case-sensitive POSIX filenames that mount cleanly on Linux/macOS.
"""
import os
import sys
import json
import hashlib
import datetime
from pathlib import Path

try:
    import pycdlib
except ImportError:
    print("ERROR: pycdlib not installed. Run: pip3 install pycdlib", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
STAGE = ROOT / "dxn1-os" / "iso-tree"
OUT_DIR = ROOT / "public" / "dxn1-assets"
OUT_DIR.mkdir(parents=True, exist_ok=True)
ISO_PATH = OUT_DIR / "dxn1-os-1.0.iso"

VOLUME_ID = "DXN1OS"


def iso_path_for(fs_path: Path) -> str:
    """Return the ISO9660 path (uppercase, ;1 for files) for a filesystem path."""
    rel = fs_path.relative_to(STAGE)
    parts = [p.upper() for p in rel.parts]
    if fs_path.is_dir():
        return "/" + "/".join(parts) if parts else "/"
    # file: append ;1 to the last segment
    return "/" + "/".join(parts[:-1] + [parts[-1] + ";1"]) if parts else "/" + parts[-1] + ";1"


def ensure_dir(iso, dir_path: Path, created: set):
    """Recursively create directory records in the ISO, depth-first."""
    if dir_path == STAGE:
        return
    if dir_path in created:
        return
    # ensure parent first
    ensure_dir(iso, dir_path.parent, created)
    rel = dir_path.relative_to(STAGE)
    iso_target = "/" + "/".join(p.upper() for p in rel.parts)
    rr = "/".join(rel.parts)
    try:
        iso.add_directory(iso_target, rr_name=dir_path.name)
    except Exception:
        pass  # may already exist
    created.add(dir_path)


def main():
    if not STAGE.exists():
        print(f"ERROR: staging dir {STAGE} not found", file=sys.stderr)
        sys.exit(1)

    print(f"[iso] staging dir: {STAGE}")
    print(f"[iso] output:      {ISO_PATH}")

    # collect all files
    files = sorted([p for p in STAGE.rglob("*") if p.is_file()])
    dirs = sorted({p for p in STAGE.rglob("*") if p.is_dir()} | {STAGE})
    print(f"[iso] files={len(files)} dirs={len(dirs)}")

    iso = pycdlib.PyCdlib()
    iso.new(interchange_level=3, vol_ident=VOLUME_ID, rock_ridge="1.09")

    created = set()
    # create directories in order of depth
    for d in sorted(dirs, key=lambda p: len(p.relative_to(STAGE).parts)):
        if d == STAGE:
            continue
        ensure_dir(iso, d, created)

    # add files
    for f in files:
        target = iso_path_for(f)
        rel = f.relative_to(STAGE)
        try:
            iso.add_file(str(f), target, rr_name=f.name)
        except Exception as e:
            print(f"  ! skip {f.name}: {e}")

    # El Torito boot record — placeholder 2048-byte boot image + boot catalog
    boot_img = STAGE / "isolinux" / "boot.img"
    boot_img.write_bytes(b"\x00" * 2048)
    iso.add_file(str(boot_img), "/ISOLINUX/BOOT.IMG;1", rr_name="boot.img")
    iso.add_eltorito("/ISOLINUX/BOOT.IMG;1", bootcatfile="/BOOT.CAT;1",
                      rr_bootcatname="boot.cat", boot_load_size=1)
    iso.write(str(ISO_PATH))
    iso.close()
    boot_img.unlink(missing_ok=True)

    size = ISO_PATH.stat().st_size
    print(f"[iso] written: {size} bytes ({size/1024:.1f} KiB)")

    # SHA-256 sidecar
    h = hashlib.sha256()
    with open(ISO_PATH, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    digest = h.hexdigest()
    sidecar = ISO_PATH.with_suffix(".iso.sha256")
    sidecar.write_text(f"{digest}  {ISO_PATH.name}\n")
    print(f"[iso] sha256: {digest}")
    print(f"[iso] sidecar: {sidecar}")

    # Update manifest with real size + checksum
    manifest_path = STAGE / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["iso_size_bytes"] = size
    manifest["iso_size_human"] = f"{size/1024:.1f} KiB"
    manifest["sha256"] = digest
    manifest["build_date"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print("[iso] manifest updated")


if __name__ == "__main__":
    main()
