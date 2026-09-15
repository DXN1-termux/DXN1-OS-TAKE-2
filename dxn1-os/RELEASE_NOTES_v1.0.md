# DXN1-OS 1.0 'oxide' — Release Notes

**Tag:** `v1.0`
**Codename:** oxide
**Date:** 2026-09-15
**Commit:** db899048c747614812e7ab9fc7c2d3ef16136f89

## Downloads

| File | Size | Description |
|------|------|-------------|
| `dxn1-os-1.0.iso` | 15.3 MiB | Real bootable UEFI Linux live ISO |
| `dxn1-os-source.zip` | 91 KB | Full source tree (live-boot installer + updater + GitHub workflow) |

## Verify

```
sha256: 3f965f38774dd76fd5d18e45297012a663a8d0c3e750eaaff5529ec971d4c7e4  dxn1-os-1.0.iso
```

```bash
echo "3f965f38774dd76fd5d18e45297012a663a8d0c3e750eaaff5529ec971d4c7e4  dxn1-os-1.0.iso" | sha256sum -c
# dxn1-os-1.0.iso: OK
```

## What this is

A **real, bootable minimal Linux** — not a simulation:

- **Real Linux kernel** (Debian 5.10 LTS, `vmlinuz-5.10.0-32-amd64`, 7 MB, `EFI_STUB` enabled)
- **Real busybox 1.35** static (musl) initramfs (711 KB cpio.gz, 358 entries)
- **Real ISO9660** image with El Torito boot record + boot catalog
- The kernel is a valid PE32+ EFI application → **UEFI firmware boots it directly**, no grub/isolinux required

Verified: `file dxn1-os-1.0.iso` → `ISO 9660 CD-ROM filesystem data 'DXN1OS' (bootable)`

## ISO contents

```
   18  /VERSION
   86  /startup.nsh                 # UEFI shell auto-boot script
 1463  /README.txt
 2048  /boot.cat                    # El Torito boot catalog
704245  /boot/initramfs.img          # real busybox initramfs
7071904  /boot/bzImage               # real Linux 5.10 kernel
 505  /boot/grub/grub.cfg
 53  /dxn1/VERSION
1131168  /dxn1/busybox               # the static binary, for reference
7071904  /EFI/BOOT/BOOTX64.EFI      # kernel copy = UEFI boot entry
 561  /isolinux/isolinux.cfg
```

## Boot menu (in the initramfs /init)

1. **Live mode** — explore without installing (drops to busybox root shell)
2. **Install DXN1-OS to disk** — runs the real installer
3. **Run dxn1-update** — check for OS updates
4. Reboot
5. Power off

## Installer — fully installable from the live boot

Run `dxn1-installer` (or pick option 2 from the boot menu). Three modes:

| Mode | What it does |
|------|-------------|
| `auto-5gb` | Creates a 5GB GPT partition alongside your existing OS, formats ext2, installs DXN1-OS |
| `full-wipe` | Erases the entire disk, creates ESP (512M FAT32) + swap (1G) + root (rest, ext2), installs as the only OS |
| `manual` | Pick an existing partition, format, install |

The installer uses **real busybox tools**: `fdisk`, `mkfs.ext2`, `mkfs.vfat`, `mkswap`, `mount`, `blkid`, `cp`. Sets up UEFI boot by copying the kernel (a valid EFI app via `EFI_STUB`) to `/EFI/BOOT/BOOTX64.EFI` + a `startup.nsh` with the `root=` cmdline — **no bootloader needed**.

## Auto-updater — `dxn1-update`

Run on the installed system:

```bash
dxn1-update           # check + install updates interactively
dxn1-update --check   # check only
dxn1-update --force   # reinstall even if current
```

It checks this repo's GitHub Releases for a newer version, downloads the new `bzImage` + `initramfs.img`, verifies the sha256 sidecar, backs up the old kernel, installs the new, and refreshes the UEFI boot entry.

## Install / boot instructions

### Flash to USB
```bash
sudo dd if=dxn1-os-1.0.iso of=/dev/sdX bs=4M conv=fsync status=progress
sync
# boot from USB in UEFI mode → boot menu → option 2 (Install)
```

### DriveDroid (boot from your phone)
Import `dxn1-os-1.0.iso` as a raw image in the DriveDroid Android app → boot any PC from it.

### Test in QEMU (UEFI)
```bash
qemu-system-x86_64 -bios /usr/share/OVMF/OVMF_CODE.fd \
  -cdrom dxn1-os-1.0.iso -m 512 -enable-kvm
```

## How to build from source

```bash
# download real kernel + busybox, build initramfs, assemble ISO
python3 scripts/build-initramfs.py dxn1-os/build/initramfs-staging \
  dxn1-os/build/busybox-static dxn1-os/build/initramfs.img
python3 scripts/build-iso-real.py
```

## License

GPLv2+ (kernel + busybox) — (c) DXN1 Project 2025
