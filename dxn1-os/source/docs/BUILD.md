# DXN1-OS — Build from Source Guide

This document describes the full DXN1-OS build pipeline. It is intended for
developers who want to:

* Build the entire distribution from source (LFS-style).
* Rebuild a single component after editing.
* Add or upgrade a package.

End-user installation instructions are in [INSTALL.md](INSTALL.md).

---

## 1. Build philosophy

DXN1-OS follows the LFS methodology: every binary on the installed system is
compiled from source by a **two-stage toolchain**:

1. **Stage 02 (bootstrap toolchain)** — A cross toolchain (`${LFS_TGT}-gcc`)
   built *on the host* with the host's compiler. This produces `/tools`,
   which is used only for bootstrapping and never ships on the installed
   system.
2. **Stage 04 (base system)** — The base userland (bash, coreutils, glibc,
   gcc final) is built *inside a chroot* using the `/tools` toolchain, then
   the chroot is rebooted into itself for a final native rebuild.

The result is a fully self-hosted system: the installed DXN1-OS can rebuild
itself without any host binaries.

---

## 2. Host requirements

The build host must already be a working Linux distribution. LFS recommends a
recent stable release; we test against:

* Debian 12 (bookworm) and later
* Ubuntu 24.04 LTS and later
* Arch Linux (rolling)
* Fedora 40 and later

Required host packages (Debian names):

```bash
sudo apt install build-essential gcc g++ make patch bison flex gawk \
    m4 texinfo gettext bc wget curl ca-certificates \
    xorriso mtools dosfstools squashfs-tools \
    parted grub-pc-bin grub-efi-amd64-bin syslinux isolinux \
    dialog whiptail libncurses-dev \
    python3 perl rsync git
```

Required kernel features on the host: `devtmpfs`, `tmpfs`, `overlayfs`
optional but recommended for the rootfs staging.

Disk space: **≥ 25 GiB** for a full build.

---

## 3. Build directory layout

The build pipeline writes everything under `${DXN1_OUT}` (default
`/var/lib/dxn1/build`):

```
${DXN1_OUT}/
├── sources/            unpacked upstream source trees
├── tarballs/           cached source tarballs (.tar.xz, .tar.gz)
├── toolchain/          → /tools (cross toolchain from stage 02)
├── kernel/             bzImage, System.map, modules.tar.xz, config
├── rootfs/             the staged DXN1-OS rootfs
├── target/             rootfs mounted on the target disk during install
├── iso/                final ISO + rootfs.sqfs
├── logs/               per-stage build logs
└── state/              *.done stamp files + disk-layout.env
```

---

## 4. Running a full build

```bash
# Clone the source tree.
git clone https://dxn1.org/src/dxn1-os.git
cd dxn1-os/source

# Review configuration.
$EDITOR config/environment
$EDITOR config/packages.list
$EDITOR config/kernel.config

# Run the entire pipeline (00 → 08).
sudo ./build.sh --all
```

Stage 02 is the slowest (3–6 hours on a 4-core machine). Stages 03–08 take
~30 minutes combined. Total wall time on a modern laptop: ~4–7 hours.

To run only a subset:

```bash
# Single stage.
sudo ./build.sh --stage 03            # just the kernel

# Range of stages.
sudo ./build.sh --from 04 --to 07     # base system → ISO
```

Each stage writes a `.done` stamp to `${DXN1_STATE_DIR}` and skips itself if
the stamp exists. Delete the stamp to force a rebuild:

```bash
rm /var/lib/dxn1/build/state/stage-03.done
sudo ./build.sh --stage 03
```

---

## 5. The stage pipeline

| # | Stage           | Script                  | Output                                           |
|--:|-----------------|-------------------------|--------------------------------------------------|
| 00 | prepare         | 00-prepare.sh           | Verified host, `lfs` user, build dirs.           |
| 01 | partition       | 01-partition.sh         | `${DXN1_STATE_DIR}/disk-layout.env`              |
| 02 | bootstrap       | 02-bootstrap.sh         | `/tools` — cross + native toolchain              |
| 03 | kernel          | 03-build-kernel.sh      | `${DXN1_KERNEL_DIR}/bzImage` + `modules.tar.xz`  |
| 04 | system          | 04-build-system.sh      | `${DXN1_ROOTFS}/` populated                       |
| 05 | drivers         | 05-drivers.sh           | mesa, alsa, libinput, iwd, firmware blobs        |
| 06 | install         | 06-install.sh           | Target disk: rootfs + GRUB + fstab                |
| 07 | iso             | 07-create-iso.sh        | `${DXN1_ISO_DIR}/dxn1-os-1.0.iso`                |
| 08 | usb             | 08-usb-flash.sh         | Flashed USB or DriveDroid image                  |

Stages 01, 06, and 08 require `--disk /dev/sdX`. Stages 02–05 and 07 do not
touch any block device and are safe to re-run.

---

## 6. Adding or upgrading a package

### 6.1 Add a new package to the build

1. Add the package to `config/packages.list`:
   ```
   mypkg-1.2.3
   ```

2. Add the URL to the fetcher in `scripts/02-bootstrap.sh` (for toolchain
   deps) or `scripts/04-build-system.sh` (for base-system deps), following
   the existing pattern:
   ```bash
   fetch_pkg mypkg 1.2.3 "https://example.com/mypkg-1.2.3.tar.xz"
   ```

3. Add the build command in the chroot-side `native-build.sh` block in
   stage 04:
   ```bash
   build_pkg mypkg 1.2.3 \
       "./configure --prefix=/usr --disable-static" \
       "make" "make install"
   ```

4. Rebuild:
   ```bash
   rm /var/lib/dxn1/build/state/stage-04.done
   sudo ./build.sh --stage 04
   ```

### 6.2 Bump a package version

Update the version string in `config/packages.list`, delete the relevant
`.stamp` file in `${DXN1_STATE_DIR}`, and re-run the affected stage. The
stage script will re-fetch (cached in `tarballs/`) and rebuild.

### 6.3 Add a new driver class

Create `drivers/<class>/build.sh` (use `drivers/gpu/build.sh` as a template),
then add it to the `DRIVERS` array in `scripts/05-drivers.sh`:

```bash
declare -a DRIVERS=(
    "gpu|drivers/gpu/build.sh"
    ...
    "myclass|drivers/myclass/build.sh"
)
```

---

## 7. Reproducibility

DXN1-OS is designed to be reproducible:

* All package versions are pinned in `config/packages.list`.
* `SOURCE_DATE_EPOCH` is set in `config/environment` so timestamps in build
  artefacts are stable.
* `MAKEFLAGS=-j$(nproc)` is used throughout; this can produce slightly
  different binaries on different core counts but not different
  *functionality*.

To verify reproducibility:

```bash
sudo ./build.sh --clean
sudo ./build.sh --all
sha256sum /var/lib/dxn1/build/iso/dxn1-os-1.0.iso > first.sha256

sudo ./build.sh --clean
sudo ./build.sh --all
sha256sum /var/lib/dxn1/build/iso/dxn1-os-1.0.iso > second.sha256

diff first.sha256 second.sha256    # should be empty
```

If you see differences, check that `SOURCE_DATE_EPOCH` is set and that no
build step captures the build host's hostname.

---

## 8. Debugging a failed build

Each stage logs to `${DXN1_LOG_DIR}/stage-NN-*.log`. To debug:

```bash
# Tail the live log of a running stage.
sudo tail -F /var/lib/dxn1/build/logs/stage-02-*.log

# Re-run a single package's build with verbose output.
sudo -u lfs bash -c 'cd /var/lib/dxn1/build/sources/gcc-14.2.0/build && make V=1'
```

If the bootstrap toolchain (stage 02) fails, the most common cause is a
stale host compiler. Verify:

```bash
gcc --version       # must be ≥ 12
ld --version        # must be ≥ 2.39
```

---

## 9. Contributing

Patches welcome via the project bug tracker at
<https://dxn1.org/bugs/>. Sign your commits (`git commit -s`) and include a
one-line summary of the change in the commit message.

For larger features, open a design discussion before submitting code.
