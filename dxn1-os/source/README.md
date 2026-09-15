# DXN1-OS

**DXN1-OS** is a minimal, x86_64 Linux distribution built from source following the
[LFS (Linux From Scratch)](https://www.linuxfromscratch.org/) methodology. It ships
with a full hardware driver stack, a bootable installer ISO, and first-class support
for installing onto small partitions — including a 5 GB minimal-install profile
designed for embedded systems, USB sticks, and DriveDroid images on Android phones.

The distribution is intentionally small: there is no systemd-by-default story, no
display manager pushed at the user, and no opaque package manager state. Every byte
on the installed system is reproducible from the sources in this tree.

---

## Features

| Feature                       | Description                                                                 |
|-------------------------------|-----------------------------------------------------------------------------|
| **LFS-based bootstrap**       | Stage 0–3 cross toolchain (binutils → gcc → glibc → gcc pass 2) built live. |
| **Full driver matrix**        | amdgpu, nouveau, i915, e1000, r8169, iwlwifi, ath9k, brcmfmac, snd-hda…    |
| **5 GB minimal install**      | Single 4 GiB root + 1 GiB swap partition option for constrained devices.     |
| **Bootable ISO**              | xorriso + isolinux + squashfs rootfs image, BIOS & UEFI bootable.           |
| **USB / DriveDroid flashing** | `dd`-based flasher with `bs=4M conv=fsync` and post-write SHA-256 verify.  |
| **PID 1 init**                | Tiny shell-based init with rc.sysinit and a services/ directory.            |
| **TUI installer**             | whiptail/dialog-based installer usable from a serial or VT console.         |
| **Reproducible builds**      | All package versions pinned in `config/packages.list`.                       |

---

## Quick start

```bash
# 1. Clone the source tree
git clone https://dxn1.org/src/dxn1-os.git
cd dxn1-os/source

# 2. Review the build configuration
$EDITOR config/environment
$EDITOR config/packages.list

# 3. Run the entire pipeline (requires root + a spare block device)
sudo ./build.sh --all

# Or run a single stage
sudo ./build.sh --stage 03      # just build the kernel
sudo ./build.sh --stage 07      # just create the ISO
```

The pipeline writes its outputs to `$DXN1_OUT` (default `/var/lib/dxn1/build`):

* `toolchain/`           — stage 1/2 cross + native toolchain
* `kernel/bzImage`       — stage 3 kernel image + modules tarball
* `rootfs/`              — stage 4 base system rootfs
* `rootfs.sqfs`          — stage 7 squashfs-compressed rootfs for the ISO
* `dxn1-os-1.0.iso`      — stage 7 final bootable ISO

---

## Build prerequisites

The build host must already be a working Linux system with a compiler toolchain
(LFS recommends a recent distribution). Required host packages:

```
bash >= 5.0       binutils >= 2.39     bison >= 3.4
coreutils         diffutils            findutils
gawk              gcc >= 12            glibc-devel
grep              gzip                 m4
make >= 4.3       patch                perl >= 5.36
python3 >= 3.11   sed                  tar
texinfo           wget/aria2           xz-utils

xorriso           mksquashfs           isolinux/syslinux
parted            dosfstools           grub-pc-bin grub-efi-amd64-bin
dialog/whiptail    bc                   flex
```

You also need:

* A free block device or image file for testing installs (`/dev/sdX`, `/dev/nvme0nX`,
  or a loop file created with `truncate -s 8G disk.img`).
* Approximately **25 GiB** of free disk for a full build.
* Internet access to fetch sources from the LFS mirror set.

Run `scripts/00-prepare.sh` to verify all of the above automatically.

---

## Obtaining the prebuilt ISO

If you don't want to build from source, prebuilt images are published on every
tagged release:

| Artifact                         | URL                                                            |
|----------------------------------|----------------------------------------------------------------|
| `dxn1-os-1.0.iso`                | https://dxn1.org/releases/1.0/dxn1-os-1.0.iso                  |
| `dxn1-os-1.0.iso.sha256`         | https://dxn1.org/releases/1.0/dxn1-os-1.0.iso.sha256           |
| `dxn1-os-1.0.img.gz` (USB-ready) | https://dxn1.org/releases/1.0/dxn1-os-1.0.img.gz                |
| DriveDroid image                 | https://dxn1.org/releases/1.0/dxn1-os-1.0.drivedroid.img        |

Verify before use:

```bash
sha256sum -c dxn1-os-1.0.iso.sha256
```

Flash to USB or DriveDroid:

```bash
sudo ./scripts/08-usb-flash.sh --iso dxn1-os-1.0.iso --device /dev/sdX
# or, in DriveDroid image mode:
sudo ./scripts/08-usb-flash.sh --iso dxn1-os-1.0.iso --drivedroid
```

---

## Repository layout

```
source/
├── README.md               This file.
├── build.sh                Build orchestrator (calls scripts/00-08 in order).
├── config/                 Build configuration.
│   ├── environment          LFS environment variables.
│   ├── kernel.config        Kernel .config excerpt (driver matrix).
│   └── packages.list        Pinned package versions.
├── scripts/                Stage scripts 00 → 08.
├── init/                   PID 1 init + rc.sysinit + services.
├── installer/              TUI installer + partitioner + post-install.
├── drivers/                Per-class driver build scripts.
├── packages/               dxn1-pkg package manager + repos.list.
├── desktop/                Minimal tiling WM launcher.
└── docs/                   INSTALL.md, BUILD.md, DRIVERS.md.
```

---

## Documentation

* [`docs/INSTALL.md`](docs/INSTALL.md) — End-user installation guide.
* [`docs/BUILD.md`](docs/BUILD.md) — Developer build-from-source guide.
* [`docs/DRIVERS.md`](docs/DRIVERS.md) — Hardware support matrix.

---

## License

DXN1-OS build scripts are MIT-licensed. Each upstream package retains its own
license; see `docs/LICENSES.md` (generated at build time) for the full set.

Project homepage: https://dxn1.org/
Bug tracker:     https://dxn1.org/bugs/
