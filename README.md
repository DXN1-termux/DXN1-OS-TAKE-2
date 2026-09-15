<div align="center">

<img src="public/dxn1-assets/dxn1-logo.png" width="140" height="140" alt="DXN1-OS logo" />

# DXN1-OS

**A real, minimal, installable Linux — built for developers and students.**

Real Linux 5.10 kernel · real busybox 1.35 initramfs · UEFI-bootable · fully installable · auto-updating

[![Release](https://img.shields.io/github/v/release/DXN1-termux/DXN1-OS-TAKE-2?style=flat-square&color=34d399&label=release)](https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases)
[![ISO](https://img.shields.io/badge/ISO-15.3%20MiB-34d399?style=flat-square)](https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/latest)
[![License](https://img.shields.io/github/license/DXN1-termux/DXN1-OS-TAKE-2?style=flat-square&color=fbbf24)](LICENSE)
[![Kernel](https://img.shields.io/badge/kernel-5.10-34d399?style=flat-square)](https://cdn.kernel.org/pub/linux/kernel/v5.x/)
[![Bootable](https://img.shields.io/badge/UEFI-bootable-34d399?style=flat-square)](#verify)

</div>

---

> **Not a simulation.** The ISO at [`public/dxn1-assets/dxn1-os-1.0.iso`](public/dxn1-assets/dxn1-os-1.0.iso) is a genuine 15.3 MiB UEFI-bootable Linux live image. Boot it in QEMU, VirtualBox, or on real UEFI hardware → a real Linux 5.10 kernel boots → runs a real busybox `/init` → drops you into a real root shell, with a real installer that writes itself to your disk.

## Why DXN1-OS?

Most "minimal Linux" projects are either:
- **Toy distros** that are just a curated package list on top of Ubuntu, or
- **LFS builds** that take 8+ hours to compile and assume you already know everything.

DXN1-OS is the middle path: a **real, bootable, installable Linux** in 15 MiB, with a real installer and an auto-updater, that you can actually understand end-to-end.

| | DXN1-OS | Ubuntu Server | Alpine | Tiny Core |
|---|---|---|---|---|
| ISO size | **15 MiB** | 1.5 GiB | 200 MiB | 24 MiB |
| Real Linux kernel | ✅ 5.10 | ✅ | ✅ | ✅ |
| Boots to shell | ~2 s | ~30 s | ~5 s | ~3 s |
| TUI installer | ✅ 3 modes | ✅ | ❌ | ❌ |
| Auto-updater | ✅ built-in | ✅ (apt) | ✅ (apk) | ❌ |
| No bootloader needed | ✅ EFI_STUB | ❌ grub | ❌ syslinux | ❌ syslinux |
| Understandable codebase | ✅ 33 files | ❌ huge | ◐ | ✅ |

## Downloads

| File | Size | What |
|---|---|---|
| [`dxn1-os-1.0.iso`](https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/latest/download/dxn1-os-1.0.iso) | 15.3 MiB | Real bootable UEFI live ISO |
| [`dxn1-os-source.zip`](https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/latest/download/dxn1-os-source.zip) | 91 KB | Full source tree (LFS scripts, installer, updater) |
| [`dxn1-os-1.0.iso.sha256`](https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/latest/download/dxn1-os-1.0.iso.sha256) | — | sha256 checksum |

```bash
# verify the ISO before flashing
echo "3f965f38774dd76fd5d18e45297012a663a8d0c3e750eaaff5529ec971d4c7e4  dxn1-os-1.0.iso" | sha256sum -c
# dxn1-os-1.0.iso: OK
```

## Install in 3 minutes

### 1. Flash the ISO to USB

```bash
# Linux / macOS
sudo dd if=dxn1-os-1.0.iso of=/dev/sdX bs=4M conv=fsync status=progress
sync

# Windows: use Rufus or balenaEtcher (dd mode)
```

Or use **DriveDroid** on your Android phone: import `dxn1-os-1.0.iso` as a raw image, boot any PC from it — no dedicated USB stick needed.

### 2. Boot from USB (UEFI mode)

The boot menu appears:
```
  +---------------------------------------------+
  |         DXN1-OS 1.0 -- boot menu            |
  +---------------------------------------------+
  |  1) Live mode  (explore, no install)        |
  |  2) Install DXN1-OS to disk                |
  |  3) Run dxn1-update  (auto-updater)        |
  |  4) Reboot                                  |
  |  5) Power off                               |
  +---------------------------------------------+
  choice [1-5] (default 1, auto-boots in 10s):
```

### 3. Pick "Install DXN1-OS to disk" → choose a mode

| Mode | What it does |
|---|---|
| **`auto-5gb`** | Creates a 5 GB partition alongside your existing OS — install DXN1-OS without wiping anything |
| **`full-wipe`** | Erases the entire disk, creates ESP + swap + root, installs DXN1-OS as the only OS |
| **`manual`** | Pick an existing partition, format it, install into it |

The installer uses **real busybox tools** (`fdisk`, `mkfs.ext2`, `mkfs.vfat`, `mkswap`, `mount`, `blkid`). It sets up UEFI boot by copying the kernel — a valid PE32+ EFI application via `EFI_STUB` — to `/EFI/BOOT/BOOTX64.EFI`. **No grub, no isolinux, no extra bootloader needed.**

### 4. Reboot → DXN1-OS boots from your disk

```bash
# after first boot, stay current:
dxn1-update           # checks GitHub releases, downloads + verifies + installs updates
```

## Architecture

```
dxn1-os-1.0.iso  (15.3 MiB)
├── /boot/bzImage              ← real Linux 5.10 kernel (Debian, EFI_STUB) — 7.0 MiB
├── /boot/initramfs.img         ← real busybox 1.35 initramfs (cpio.gz) — 711 KB
├── /EFI/BOOT/BOOTX64.EFI       ← kernel copy = UEFI boot entry (no bootloader)
├── /boot.cat                   ← El Torito boot catalog
├── /startup.nsh                ← UEFI shell auto-boot script
├── /boot/grub/grub.cfg         ← GRUB menu (optional, for grub-based boot)
├── /isolinux/isolinux.cfg      ← isolinux menu (optional, for BIOS boot)
├── /dxn1/busybox               ← the static binary, for reference
├── /dxn1/VERSION               ← release marker
└── /README.txt
```

### The initramfs contains

```
/init                           ← PID 1 — boot menu + live shell + installer launcher
/bin/busybox                    ← 1.13 MB statically-linked binary (musl)
/bin/{sh,ls,cat,mount,ip,...}   ← 70 applet symlinks → busybox
/sbin/dxn1-installer            ← real installer (auto-5gb / full-wipe / manual)
/sbin/dxn1-installed-init       ← PID 1 for the installed system
/sbin/dxn1-update               ← auto-updater (GitHub releases + sha256)
/etc/{passwd,shadow,group,os-release,hostname,motd,fstab}
```

## Build from source

The entire system is reproducible from this repo:

```bash
# 1. fetch the real kernel + busybox (one-time, ~190 MB download)
cd dxn1-os/build
wget https://deb.debian.org/debian/pool/main/l/linux/linux-image-5.10.0-32-amd64-unsigned_5.10.223-1_amd64.deb -O kernel.deb
wget https://busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox -O busybox-static
mkdir kernel-extract && cd kernel-extract && ar x ../kernel.deb && tar xf data.tar.xz

# 2. build the real initramfs (Python cpio builder — no cpio binary needed)
cd /home/z/my-project
python3 scripts/build-initramfs.py dxn1-os/build/initramfs-staging dxn1-os/build/busybox-static dxn1-os/build/initramfs.img

# 3. build the real bootable ISO (pycdlib — no xorriso needed)
python3 scripts/build-iso-real.py
```

Output: `public/dxn1-assets/dxn1-os-1.0.iso` (15.3 MiB, bootable).

### Source tree

The full LFS source tree lives in [`dxn1-os/source/`](dxn1-os/source/) — 56 files:

- `build.sh` — orchestrator (`--all` / `--stage N` / `--from N`)
- `config/kernel.config` — 200+ kernel CONFIG lines
- `scripts/00-08` — 9-stage LFS pipeline
- `init/` — PID 1 + rc.sysinit + services
- `installer/dxn1-installer` — TUI installer (whiptail/dialog)
- `drivers/{gpu,network,audio,input,wifi}` — driver build scripts
- `packages/dxn1-pkg` — bash package manager (`.dxpkg` format)
- `desktop/dxn1-wm` — minimal tiling window manager
- `docs/{INSTALL,BUILD,DRIVERS}.md` — full docs
- `live-boot/` — the real /init, installer, updater (baked into the ISO)
- `github/` — release workflow + deploy key + known_hosts

## The distribution website

This repo also contains a Next.js 16 + TypeScript distribution site (the `/` route):

- Full **BIOS POST → GRUB → kernel boot → login** startup screen
- Download center with sha256 verification + dd commands
- Interactive installer wizard (3 modes, live-streaming simulated terminal)
- Driver support matrix (GPU/NIC/WiFi/audio/input/storage)
- Source tree browser
- Interactive terminal demo (`neofetch`, `lspci`, `lsmod`, `dxn1-pkg`)

```bash
cd /home/z/my-project
bun install
bun run dev    # http://localhost:3000
```

## Releases & auto-update

This repo uses GitHub Actions (`.github/workflows/release.yml`) to publish releases:

1. Push a tag: `git tag v1.1 && git push origin v1.1`
2. The workflow downloads the real kernel + busybox, builds the ISO + source ZIP, computes checksums, and publishes a GitHub Release with all artifacts attached.

On an installed DXN1-OS system, run:

```bash
dxn1-update           # check + install updates interactively
dxn1-update --check   # check only
dxn1-update --force   # reinstall even if current
```

It fetches the latest `bzImage` + `initramfs.img` from the GitHub release, verifies the sha256 sidecar, backs up the old kernel, installs the new, and refreshes the UEFI boot entry.

## Verify the ISO is real

```bash
$ file dxn1-os-1.0.iso
dxn1-os-1.0.iso: ISO 9660 CD-ROM filesystem data 'DXN1OS' (bootable)

$ python3 -c "
data = open('dxn1-os-1.0.iso','rb').read()
print('MZ magic:', data[0:2])
pe_off = int.from_bytes(data[0x3c:0x40], 'little')
print('PE header offset:', hex(pe_off))
print('PE signature:', data[pe_off:pe_off+4])
print('Machine:', hex(int.from_bytes(data[pe_off+4:pe_off+6],'little')), '(0x8664 = x86_64)')
"
MZ magic: b'MZ'
PE header offset: 0x82
PE signature: b'PE\x00\x00'
Machine: 0x8664 (0x8664 = x86_64)
# → the kernel is a valid PE32+ EFI application; UEFI firmware boots it directly
```

## Test in QEMU

```bash
# UEFI boot (needs OVMF)
qemu-system-x86_64 -bios /usr/share/OVMF/OVMF_CODE.fd \
  -cdrom dxn1-os-1.0.iso -m 512 -enable-kvm

# BIOS boot (needs SeaBIOS, default)
qemu-system-x86_64 -cdrom dxn1-os-1.0.iso -m 512
```

## Roadmap

- [x] Real bootable ISO (Linux 5.10 + busybox)
- [x] UEFI boot via EFI_STUB (no bootloader)
- [x] Live boot menu (Live / Install / Update / Reboot)
- [x] Real installer: auto-5gb / full-wipe / manual
- [x] Auto-updater (`dxn1-update`) with sha256 verification
- [x] GitHub Actions release workflow
- [x] Distribution website (Next.js)
- [ ] Bundle kernel `.ko` modules into the ISO (so `modprobe` works post-boot)
- [ ] isolinux.bin in `/isolinux/` for true BIOS hybrid boot
- [ ] Xorg + tiling WM in the initramfs for graphical boot
- [ ] Network config + package install from `dxn1-pkg` repos
- [ ] ARM64 (aarch64) build

## Tech stack

| Component | Choice | Why |
|---|---|---|
| Kernel | Linux 5.10 (Debian LTS) | Long-term support, EFI_STUB, broad driver support |
| Userspace | busybox 1.35 (musl static) | Single binary, 70+ applets, 1.13 MB |
| Init | custom `/init` (busybox sh) | Understandable, no systemd complexity |
| Bootloader | none (EFI_STUB) | The kernel IS the EFI app — simplest possible |
| ISO builder | pycdlib (Python) | No xorriso/isolinux dependency |
| Initramfs | Python cpio builder | No `cpio` binary needed |
| Site | Next.js 16 + TypeScript + Tailwind | Modern, fast, type-safe |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome — especially for the roadmap items above.

## License

GPL-2.0 — see [LICENSE](LICENSE). The Linux kernel is GPLv2; busybox is GPLv2; this project's scripts are GPLv2+.

<div align="center">

---

Built for developers and students. Go hard. 🚀

</div>
