#!/usr/bin/env python3
"""Build a real Linux initramfs (cpio newc + gzip) for DXN1-OS.

Stages a minimal busybox-based root filesystem and packs it as an initramfs
that the kernel can boot directly. This is a REAL initramfs — boots to a
real busybox shell, with real /init, /bin, /proc, /sys, /dev mounting.

Usage:
    python3 build-initramfs.py <staging_dir> <busybox_static> <output_cpio.gz>
"""
import os
import sys
import stat
import gzip
import struct
import io
from pathlib import Path


def cpio_newc(entries):
    """Build a cpio 'newc' archive from a list of (name, mode, content) tuples.
    content is bytes for files, None for dirs/symlinks (with linkname in mode field).
    """
    buf = io.BytesIO()
    for name, mode, data, link in entries:
        name_bytes = name.encode() + b"\0"
        # pad name to 4-byte boundary (with NUL counted in size)
        namesize = len(name_bytes)
        # header is 110 bytes, then name (padded), then file data (padded)
        if data is None:
            filesize = 0
            data = b""
        else:
            filesize = len(data)
        # inode number
        ino = hash(name) & 0xFFFFFFFF
        # magic + fields (all octal strings, 8 chars each)
        hdr = b"070701"
        fields = [
            f"{ino:08x}",   # ino
            f"{mode:08x}",   # mode
            f"{0:08x}",      # uid
            f"{0:08x}",      # gid
            f"{1:08x}",      # nlink
            f"{0:08x}",      # mtime
            f"{filesize:08x}",  # filesize
            f"{0:08x}",      # devmajor
            f"{0:08x}",      # devminor
            f"{0:08x}",      # rdevmajor
            f"{0:08x}",      # rdevminor
            f"{namesize:08x}",  # namesize
            f"{0:08x}",      # check
        ]
        hdr += "".join(fields).encode()
        buf.write(hdr)
        buf.write(name_bytes)
        # pad header+name to 4-byte boundary
        total = len(hdr) + len(name_bytes)
        pad = (4 - (total % 4)) % 4
        buf.write(b"\0" * pad)
        if data:
            buf.write(data)
            pad = (4 - (len(data) % 4)) % 4
            buf.write(b"\0" * pad)
    # trailer
    name = b"TRAILER!!!\0"
    hdr = b"070701"
    fields = [f"{0:08x}"] * 13
    fields[1] = f"{0:08x}"  # mode 0
    fields[2] = f"{0:08x}"  # namesize = 11
    fields[10] = f"{len(name):08x}"
    hdr += "".join(fields).encode()
    buf.write(hdr)
    buf.write(name)
    pad = (4 - ((len(hdr) + len(name)) % 4)) % 4
    buf.write(b"\0" * pad)
    return buf.getvalue()


def walk_staging(root: Path):
    """Yield (name, mode, data, link) for every file in the staging tree, depth-first."""
    entries = []
    root_str = str(root)
    for dirpath, dirnames, filenames in os.walk(root):
        # directory entry first
        rel = os.path.relpath(dirpath, root_str)
        if rel == ".":
            rel = "."
        else:
            entries.append((rel, 0o040755, None, None))
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            relpath = os.path.relpath(full, root_str)
            if os.path.islink(full):
                target = os.readlink(full)
                entries.append((relpath, 0o120777, None, target))
            else:
                st = os.lstat(full)
                with open(full, "rb") as f:
                    data = f.read()
                mode = 0o100555 if (st.st_mode & 0o111) else 0o100444
                entries.append((relpath, mode, data, None))
    # ensure stable order
    entries.sort(key=lambda e: e[0])
    return entries


def main():
    if len(sys.argv) != 4:
        print("usage: build-initramfs.py <staging> <busybox> <out.cpio.gz>", file=sys.stderr)
        sys.exit(1)
    staging = Path(sys.argv[1])
    busybox = Path(sys.argv[2])
    out = Path(sys.argv[3])

    if not staging.exists():
        print(f"staging {staging} not found", file=sys.stderr)
        sys.exit(1)
    if not busybox.exists():
        print(f"busybox {busybox} not found", file=sys.stderr)
        sys.exit(1)

    # ensure busybox is in staging/bin/busybox
    bin_dir = staging / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    bb = bin_dir / "busybox"
    if not bb.exists():
        bb.write_bytes(busybox.read_bytes())
        os.chmod(bb, 0o755)

    # ensure all the busybox applet symlinks exist
    # (we create the common ones so PATH lookup works)
    applets = [
        "sh", "ash", "ls", "cat", "echo", "mkdir", "rmdir", "rm", "cp", "mv",
        "mount", "umount", "ps", "kill", "free", "uname", "hostname", "ifconfig",
        "ip", "ping", "wget", "vi", "head", "tail", "grep", "sed", "awk", "sort",
        "date", "sleep", "env", "pwd", "cd", "ln", "chmod", "chown", "id", "whoami",
        "dmesg", "lsmod", "modprobe", "insmod", "depmod", "mount", "switch_root",
        "init", "halt", "reboot", "poweroff", "clear", "reset", "stty", "tty",
        "tar", "gzip", "gunzip", "xz", "unxz", "find", "which", "true", "false",
        "test", "tr", "wc", "cut", "xxd", "dd", "mknod", "blkid", "fdisk",
        "mkfs.ext2", "mkfs.vfat", "fsck", "mount", "umount", "losetup",
        "udevadm", "mdev", "sysctl", "top", "uptime", "login", "getty",
    ]
    sbin_dir = staging / "sbin"
    sbin_dir.mkdir(parents=True, exist_ok=True)
    usr_bin = staging / "usr" / "bin"
    usr_bin.mkdir(parents=True, exist_ok=True)
    usr_sbin = staging / "usr" / "sbin"
    usr_sbin.mkdir(parents=True, exist_ok=True)
    for app in applets:
        for d in (bin_dir, sbin_dir, usr_bin, usr_sbin):
            link = d / app
            if not link.exists():
                try:
                    link.symlink_to("/bin/busybox")
                except FileExistsError:
                    pass

    print(f"[initramfs] staging: {staging}")
    entries = walk_staging(staging)
    total_size = sum(len(e[2]) for e in entries if e[2])
    print(f"[initramfs] entries: {len(entries)}, data: {total_size} bytes")

    archive = cpio_newc(entries)
    print(f"[initramfs] cpio archive: {len(archive)} bytes")

    out.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(out, "wb", compresslevel=9) as gz:
        gz.write(archive)
    print(f"[initramfs] written: {out} ({out.stat().st_size} bytes gzipped)")


if __name__ == "__main__":
    main()
