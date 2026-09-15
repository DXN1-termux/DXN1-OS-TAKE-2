# Changelog

All notable changes to DXN1-OS are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0] — 2025-01-15

### Added
- **Real bootable ISO** (15.3 MiB): genuine Linux 5.10 kernel (Debian LTS, `vmlinuz-5.10.0-32-amd64`, EFI_STUB enabled) + real busybox 1.35 static initramfs (musl, 711 KB cpio.gz, 358 entries).
- **UEFI boot via EFI_STUB** — the kernel is a valid PE32+ EFI application, so UEFI firmware loads `/EFI/BOOT/BOOTX64.EFI` directly. No grub, no isolinux, no extra bootloader.
- **Live boot menu** in `/init`: Live mode / Install DXN1-OS / Run dxn1-update / Reboot / Power off. 10-second timeout auto-boots to Live mode.
- **Real installer** (`dxn1-installer`): three install modes — `auto-5gb` (5GB partition alongside existing OS), `full-wipe` (erase entire disk, ESP+swap+root), `manual` (pick existing partition). Uses real busybox `fdisk`, `mkfs.ext2`, `mkfs.vfat`, `mkswap`, `mount`, `blkid`. Sets up UEFI boot by copying the kernel to the ESP as `BOOTX64.EFI` + a `startup.nsh`.
- **Auto-updater** (`dxn1-update`): checks GitHub releases for a newer version, downloads new `bzImage` + `initramfs.img`, verifies sha256 against sidecar, backs up old kernel, installs new, refreshes UEFI boot entry. Supports `--check` and `--force`.
- **Installed-system init** (`dxn1-installed-init`): PID 1 for the disk-installed system — mounts fstab, devtmpfs, sets hostname, swapon, drops to login shell.
- **GitHub Actions release workflow** (`.github/workflows/release.yml`): on `git tag v*`, downloads real kernel + busybox, builds initramfs + ISO + source ZIP, computes checksums, publishes a Release with all artifacts attached.
- **SSH deploy key** for the repo (`dxn1-os/deploy_key` / `.pub`).
- **Distribution website** (Next.js 16 + TypeScript): full BIOS POST → GRUB → kernel boot → login startup screen; download center with sha256 verification; interactive installer wizard with live-streaming terminal; driver support matrix; source tree browser; interactive terminal demo (`neofetch`, `lspci`, `lsmod`, `dxn1-pkg`).
- **Full LFS source tree** (56 files): `build.sh` orchestrator, `config/kernel.config` (200+ CONFIG lines), `scripts/00-08` 9-stage pipeline, `init/` + services, `installer/dxn1-installer` TUI, `drivers/{gpu,network,audio,input,wifi}`, `packages/dxn1-pkg` package manager, `desktop/dxn1-wm` tiling WM, `docs/{INSTALL,BUILD,DRIVERS}.md`.

### Verified
- `file dxn1-os-1.0.iso` → `ISO 9660 CD-ROM filesystem data 'DXN1OS' (bootable)`
- ISO contents: `/boot/bzImage` (7 MB real kernel), `/boot/initramfs.img` (711 KB real cpio), `/EFI/BOOT/BOOTX64.EFI` (7 MB), `/boot.cat` (El Torito catalog), `startup.nsh`, configs.
- Kernel PE/EFI header verified: MZ magic, PE\0\0 signature at 0x82, Machine 0x8664 (x86_64), Optional magic 0x20b (PE32+).
- Initramfs verified: gzip integrity OK, 358 cpio entries, `/init` present, installer + updater strings confirmed.

### Known limitations
- No kernel `.ko` modules bundled in the ISO (planned for v1.1) — `modprobe` won't find modules post-boot.
- BIOS boot requires `isolinux.bin` in `/isolinux/` (not bundled due to licensing) — UEFI boot works out of the box.
- No graphical environment in the initramfs yet (console-only).
- `dxn1-update` requires network config to reach github.com.

### Build tooling
- `scripts/build-initramfs.py` — Python cpio (newc) + gzip builder (no `cpio` binary needed). Stages busybox + 70 applet symlinks + `/init` + `/etc`.
- `scripts/build-iso-real.py` — pycdlib ISO9660 + Rock Ridge + El Torito assembler (no `xorriso` needed).
- `scripts/gen-deploy-key.py` — OpenSSH ed25519 deploy key generator (no `ssh-keygen` needed).

## [1.3] — 2025-03-01 'spark'

### Added
- **DXN1 App Store** (`dxn1-store`) — GUI package manager (Python/Tkinter) wrapping `dxn1-pkg`. Browse, search, install, remove.
- **DXN1 Settings app** (`dxn1-settings`) — system config GUI (System/Network/Display/Users/About tabs).
- **Ollama** package recipe — run LLMs locally (Llama 3, Qwen Coder, DeepSeek). AI-native dev.
- **Package repository index** — 28 version-pinned packages (system/terminal/browser/desktop/dev/ai).
- App icons + desktop mockup generated via AI image generation.

## [1.2] — 2025-02-15 'ion'

### Added
- **GNOME 46 desktop** recipe — optional, `dxn1-pkg install gnome-shell`. 13 components + gdm service.
- **KDE Plasma 6.1 desktop** recipe — optional, `dxn1-pkg install plasma-shell`. 11 components + sddm service.
- v1.2 wallpaper (dark futuristic desktop with emerald circuit accents).

## [1.1] — 2025-02-01 'flux'

### Added
- **Kitty terminal** recipe — GPU-accelerated terminal, default on DXN1-OS.
- **Firefox ESR 130** recipe — Mozilla Firefox, ships preinstalled.
- **2 new install modes**: `side-install` (dual-boot alongside Windows/macOS, shrinks existing partition + GRUB menu), `encrypted` (full-disk LUKS + passphrase at boot).
- Installer now offers 5 modes: auto-5gb / full-wipe / manual / side-install / encrypted.
- All recipes syntax-checked with real busybox.

## [Unreleased]

### Planned
- Bundle kernel `.ko` modules into the ISO for `modprobe` support
- isolinux.bin + ldlinux.c32 for true BIOS hybrid boot
- Xorg + tiling WM in the initramfs for graphical boot
- Network configuration post-install (dhcpcd / static IP)
- ARM64 (aarch64) build
- Signed releases (GPG / cosign)
