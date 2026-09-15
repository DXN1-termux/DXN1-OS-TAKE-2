# DXN1-OS — Installation Guide

This guide walks you through installing DXN1-OS onto bare metal, a virtual
machine, a USB stick, or a DriveDroid image on your Android phone.

> **Prebuilt images**: if you don't want to build from source, grab the
> prebuilt ISO from <https://dxn1.org/releases/1.0/>. To build your own, see
> [BUILD.md](BUILD.md).

---

## 1. Requirements

| Resource        | Minimum          | Recommended       |
|-----------------|------------------|-------------------|
| CPU             | x86_64, SSE4.2   | x86_64, AVX2      |
| RAM             | 512 MiB          | 2 GiB             |
| Disk            | 5 GiB            | 20 GiB            |
| Boot mode       | BIOS or UEFI     | UEFI              |
| Install media   | 1 GiB USB        | 2 GiB USB         |

The 5 GB minimal-install profile is designed for SD cards, USB sticks, and
other constrained storage — it fits the entire base system + drivers in ~3.5 GiB.

---

## 2. Obtaining the install media

### Option A — Prebuilt ISO

```bash
wget https://dxn1.org/releases/1.0/dxn1-os-1.0.iso
wget https://dxn1.org/releases/1.0/dxn1-os-1.0.iso.sha256
sha256sum -c dxn1-os-1.0.iso.sha256     # must print: OK
```

### Option B — Build the ISO yourself

See [BUILD.md](BUILD.md). The result is at
`${DXN1_OUT}/dxn1-os-1.0.iso`.

---

## 3. Flashing the installer to media

### 3.1 USB stick (Linux/macOS host)

```bash
# Identify your USB stick (e.g. /dev/sdb, /dev/disk2).
lsblk                                   # Linux
diskutil list                           # macOS

# Flash with the DXN1-OS flasher.
sudo /path/to/dxn1-os/source/scripts/08-usb-flash.sh \
    --iso dxn1-os-1.0.iso \
    --device /dev/sdb
```

The flasher uses `dd bs=4M conv=fsync`, calls `sync`, then re-reads the
target and verifies the SHA-256 against the source ISO. Do **not** interrupt
the verify pass.

To flash manually:

```bash
sudo dd if=dxn1-os-1.0.iso of=/dev/sdX bs=4M conv=fsync status=progress
sync
```

### 3.2 DriveDroid image (Android)

If you don't have a USB stick but you have an Android phone with
[DriveDroid](https://drivedroid.app/) installed, the flasher can produce a
DriveDroid-compatible image:

```bash
sudo ./scripts/08-usb-flash.sh --iso dxn1-os-1.0.iso --drivedroid
```

This writes the ISO into `${DXN1_OUT}/dxn1-os-1.0.drivedroid.img` and emits a
sidecar `.import.txt` file with instructions on how to import it into the
DriveDroid app:

1. Open DriveDroid → **Images** → **+** → **Import from file**.
2. Select `dxn1-os-1.0.drivedroid.img`.
3. Name the image "DXN1-OS 1.0".
4. Tap the image → **Writable USB** → boot your PC from the phone.
5. If enumeration fails, switch to **Read-only USB** mode (the ISO is
   read-only by design).

### 3.3 Raw image (alternative)

If you want a `dd`-able raw image file instead of flashing directly to a
device, use `--image`:

```bash
sudo ./scripts/08-usb-flash.sh --iso dxn1-os-1.0.iso --image dxn1-os-1.0.img
```

---

## 4. Booting the installer

1. Insert the USB / connect the phone / mount the ISO.
2. Power on the target machine and enter the boot menu (typically F12, Esc,
   or F2).
3. Select "DXN1-OS 1.0" from the boot menu.
4. At the DXN1-OS bootloader prompt, pick one of:
   * **DXN1-OS 1.0 (default)** — boots the live installer with full KMS.
   * **DXN1-OS 1.0 (no modeset, recovery)** — disables KMS; useful for
     systems with broken GOP / framebuffer drivers.

The live environment autologins as `lfs` on `tty1`. From there you can either
run the guided TUI installer or partition manually.

---

## 5. Running the TUI installer

```bash
sudo dxn1-installer
```

The installer walks you through:

1. **Disk selection** — pick the target block device.
2. **Partition layout**:
   * **5 GB minimal** — 1 MiB BIOS boot + ESP, 1 GiB swap, ~3 GiB root.
   * **Full disk** — 512 MiB ESP, swap = 1/8 of disk (max 8 GiB), root = rest.
   * **Manual** — use existing partitions you've prepared.
3. **Hostname**.
4. **Root password** (8+ chars).
5. **Regular user** (optional).
6. **Bootloader** — GRUB for BIOS or UEFI (auto-detected), or skip.
7. **Confirm & install** — no writes happen before this step.

When the installer finishes, remove the install media and reboot.

---

## 6. Manual install (no TUI)

For automated deployments, you can run each stage directly:

```bash
# Partition the target (5 GB profile).
sudo ./scripts/01-partition.sh --disk /dev/sdb --profile 5gb --force

# Install rootfs + bootloader.
sudo ./scripts/06-install.sh --disk /dev/sdb

# Run post-install configuration.
sudo ./installer/post-install.sh --root /var/lib/dxn1/build/target \
     --hostname web-01 --timezone Europe/Berlin --locale en_US.UTF-8
```

---

## 7. Post-install: first boot

On first boot, log in as `root` (or your created user) and:

```bash
# Update the system clock from NTP.
ntpd -qg

# Connect to Wi-Fi (if applicable).
iwctl
[iwd]# device list
[iwd]# station wlan0 scan
[iwd]# station wlan0 connect "your-ssid"

# Install additional packages.
sudo dxn1-pkg update
sudo dxn1-pkg install vim git
```

---

## 8. Troubleshooting

| Symptom                                  | Likely cause / fix |
|------------------------------------------|---------------------|
| Black screen after grub                  | Add `nomodeset` to the kernel cmdline (recovery menu). |
| `No bootable device` after install       | Reinstall GRUB: `grub-install /dev/sdX` from a chroot. |
| Wi-Fi not detected                       | Run `modprobe iwlwifi` (Intel) / `modprobe brcmfmac` (Broadcom); check `dmesg` for missing firmware. |
| No audio after install                    | `alsamixer`, unmute Master + PCM. |
| Installer hangs at "Verifying write"     | Drop caches manually: `echo 3 > /proc/sys/vm/drop_caches`, then retry. |

See also [DRIVERS.md](DRIVERS.md) for the full hardware support matrix.

---

## 9. Uninstall

DXN1-OS is just a regular Linux install — to remove it, wipe the disk from
another OS:

```bash
sudo wipefs -a /dev/sdX
sudo parted /dev/sdX mklabel gpt
```
