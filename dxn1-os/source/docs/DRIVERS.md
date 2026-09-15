# DXN1-OS — Hardware Driver Support Matrix

This document lists the hardware supported by DXN1-OS, grouped by class.
The kernel configuration (`config/kernel.config`) and the userspace driver
build scripts (`drivers/*/build.sh`) implement this matrix.

**Status legend:**

| Symbol | Meaning                                              |
|--------|------------------------------------------------------|
| ✓      | Tested & supported. Driver built into the kernel.   |
| ◐      | Partially supported. Firmware blobs may be needed.  |
| ✗      | Not supported. Listed for tracking purposes.         |
| —      | Not applicable (no kernel module required).          |

---

## 1. GPU / Display

| Vendor   | Chip family                              | Kernel driver | Userspace (mesa)    | Status |
|----------|-----------------------------------------|---------------|---------------------|:------:|
| AMD      | Radeon HD 7000+ (Southern Islands+)    | `amdgpu`      | `radeonsi`          | ✓      |
| AMD      | Radeon HD 2000–6000                    | `radeon`      | `r600`              | ✓      |
| Intel    | Gen8+ (Broadwell → Tiger Lake+)        | `i915`        | `iris`              | ✓      |
| Intel    | Gen4–7 (Sandy Bridge → Haswell)        | `i915`        | `crocus`            | ✓      |
| NVIDIA   | GeForce 8+ (open)                      | `nouveau`     | `nouveau`           | ◐      |
| NVIDIA   | Turing / Ampere (closed)               | —             | —                   | ✗      |
| VMware   | SVGA-II                                | `vmwgfx`      | `vmwgfx` (swrast)   | ✓      |
| QEMU     | QXL                                    | `qxl`         | swrast              | ✓      |
| Bochs    | Bochs VBE                              | `bochs`       | swrast              | ✓      |
| ASPEED   | AST2400/2500/2600                      | `ast`         | swrast              | ✓      |
| Matrox   | G200                                   | `mgag200`     | swrast              | ✓      |

Userspace stack: **mesa 24.2.0** + **libdrm 2.4.123**. Vulkan enabled for
AMD (`radv`) and Intel (`anvil`).

---

## 2. Network (wired)

| Vendor     | Chip / family                    | Kernel driver         | Status |
|------------|----------------------------------|-----------------------|:------:|
| Intel      | PRO/1000 (82540–82580)          | `e1000`               | ✓      |
| Intel      | I210 / I217 / I219              | `e1000e`              | ✓      |
| Intel      | I350 / X550                     | `igb`                 | ✓      |
| Intel      | X540 / X550-T                   | `ixgbe`               | ✓      |
| Realtek    | RTL8111/8168/8125              | `r8169`               | ✓      |
| Realtek    | RTL8126 (5 GbE)                 | `r8169`               | ◐      |
| Broadcom   | NetXtreme BCM57xx              | `tg3`                 | ✓      |
| Broadcom   | NetXtreme II BCM5771x           | `bnx2` / `bnx2x`      | ✓      |
| Marvell    | Yukon 88E805x                  | `sky2`                | ✓      |
| Atheros    | AR8161/8171                     | `alx`                 | ✓      |
| Atheros    | L1C / L2C                       | `atl1c`               | ✓      |
| VirtIO     | virtio-net                      | `virtio_net`          | ✓      |

Userspace stack: **iproute2 6.10.0** + **dhcpcd 10.0.10**.

---

## 3. Wireless (Wi-Fi)

| Vendor     | Chip / family                          | Kernel driver        | Firmware required   | Status |
|------------|----------------------------------------|----------------------|----------------------|:------:|
| Intel      | Wireless-AC 7260 → AX210              | `iwlwifi` (+`iwlmvm`)| `iwlwifi-*.ucode`    | ✓      |
| Intel      | Wireless-N 1000/2200                  | `iwlwifi` (+`iwldvm`)| `iwlwifi-*.ucode`    | ✓      |
| Atheros    | AR9280–AR9462 (ath9k)                | `ath9k`              | none                 | ✓      |
| Atheros    | AR9271 USB (ath9k_htc)               | `ath9k_htc`          | `htc_9271.fw`        | ✓      |
| Qualcomm   | QCA9377 / QCA6174A (ath10k)          | `ath10k_pci`         | `ath10k/*`           | ✓      |
| Qualcomm   | WCN6855 / QCA6390 (ath11k)           | `ath11k_pci`         | `ath11k/*`           | ◐      |
| Broadcom   | BCM43430 / BCM43455 (Pi 3/4)         | `brcmfmac`           | `brcm/*.bin` + `.clm_blob` | ✓ |
| Broadcom   | BCM4360 / BCM4352 (MacBooks)         | `brcmfmac`           | `brcm/*.bin`         | ◐      |
| Realtek    | RTL8188EE / RTL8723BE                | `rtl8188ee`/`rtl8723be` | `rtlwifi/*.bin`   | ✓      |
| Realtek    | RTL8812AU / RTL8814AU                | `rtl8812au` (out-of-tree) | —             | ✗      |
| Realtek    | RTL8852BE (rtw89)                    | `rtw89_8852be`       | `rtw89/*.bin`        | ◐      |
| Ralink     | RT2800USB                            | `rt2800usb`          | `rt2870.bin`         | ✓      |

Userspace supplicants: **iwd 2.20** (primary) + **wpa_supplicant 2.11**
(fallback). Regulatory domain agent: **crda 4.15**.

---

## 4. Bluetooth

| Vendor     | Chip                                | Kernel driver        | Firmware required    | Status |
|------------|-------------------------------------|----------------------|-----------------------|:------:|
| Intel      | Wireless-AC 8260 → AX210 Bluetooth | `btusb` + `btintel`  | `intel/ibt-*.sfi`     | ✓      |
| Realtek    | RTL8761B / RTL8821C                | `btusb` + `btrtl`    | `rtl_bt/*.bin`        | ✓      |
| Broadcom   | BCM20702 / BCM4354                 | `btusb` + `btbcm`    | `broadcom/*.hcd`      | ◐      |
| Qualcomm   | QCA6174A / QCA9377                 | `btusb` + `btrtl`    | `rtl_bt/*.bin`        | ◐      |

Userspace daemon: `bluetoothd` (from BlueZ 5.x). Default privacy mode: device.

---

## 5. Audio (codec / HDA)

| Codec class                                | Kernel driver              | Status |
|--------------------------------------------|----------------------------|:------:|
| Realtek ALC892/1150/1220/283/298/386      | `snd-hda-codec-realtek`    | ✓      |
| Conexant CX20585 / CX20722                | `snd-hda-codec-conexant`   | ✓      |
| Cirrus Logic CS4206/4208 (MacBooks)      | `snd-hda-codec-cirrus`     | ◐      |
| C-Media CMI9880                           | `snd-hda-codec-cmedia`     | ✓      |
| Analog Devices AD1984/1988                | `snd-hda-codec-analog`     | ✓      |
| Intel HDMI / DisplayPort audio            | `snd-hda-codec-hdmi`       | ✓      |
| USB audio class (UAC1/2/3)                | `snd-usb-audio`            | ✓      |
| Intel ICH (legacy)                         | `snd-intel8x0`             | ✓      |
| AMD ACP (Renoir / Van Gogh)               | `snd-pci-acp6x`            | ◐      |

Userspace stack: **alsa-lib 1.2.12** + **alsa-utils 1.2.12** +
**pipewire 1.2.1** with **wireplumber 0.5.5** session manager. PulseAudio
compatibility shim provided by pipewire-pulse.

---

## 6. Input

| Device class                | Kernel driver                | Userspace           | Status |
|-----------------------------|------------------------------|----------------------|:------:|
| Generic evdev keyboard/mouse | `evdev`, `mousedev`, `psmouse` | `libinput 1.26.2`  | ✓      |
| Synaptics trackpad (PS/2)   | `mouse_synaptics_i2c`        | `xf86-input-synaptics` | ✓   |
| Synaptics trackpad (USB)    | `mouse_synaptics_usb`        | `xf86-input-synaptics` | ✓   |
| ELAN touchscreens           | `elan_i2c`                  | `libinput`           | ✓      |
| Apple SPI keyboard / trackpad | `keyboard_applespi`        | `libinput`           | ◐      |
| Wacom tablets              | `wacom`                      | `libinput`           | ✓      |
| Generic USB HID             | `usbhid`, `hid-generic`     | `libinput`           | ✓      |
| Logitech Unifying receivers | `hid-logitech-dj`            | `libinput` + `solaar`| ✓      |

`/dev/uinput` is created with mode 0660 group `input`; users in the
`input` group can drive uinput-based virtual input.

---

## 7. Storage

| Storage class              | Kernel driver                | Status |
|----------------------------|------------------------------|:------:|
| SATA / AHCI                | `ahci`, `ata_piix`           | ✓      |
| NVMe (PCIe)                | `nvme`, `blkdev`             | ✓      |
| USB mass-storage (UAS)     | `usb-storage`, `uas`         | ✓      |
| USB mass-storage (BOT)     | `usb-storage`                | ✓      |
| eMMC / SD                  | `mmcblk`, `sdhci-pci`        | ✓      |
| virtio-blk / virtio-scsi   | `virtio_blk`, `virtio_scsi`  | ✓      |
| LVM2 / device-mapper       | `dm-mod`                     | ✓      |
| mdadm RAID 0/1/10/5/6      | `md_mod`                     | ✓      |
| bcache                     | `bcache`                     | ✓      |
| dm-crypt (LUKS)            | `dm_crypt`                   | ✓      |

---

## 8. Filesystems

| FS           | Status | Notes                                                    |
|--------------|:------:|----------------------------------------------------------|
| ext4         | ✓      | Default root filesystem.                                 |
| xfs          | ✓      | Tested on install + boot.                                |
| btrfs        | ✓      | Boot + subvolume support.                                 |
| f2fs         | ✓      | Recommended for SD-card installs.                         |
| fat/vfat     | ✓      | ESP / EFI System Partition.                              |
| exfat        | ✓      | For external media.                                      |
| ntfs3        | ✓      | Read-write via the in-kernel driver.                     |
| iso9660      | ✓      | Required for the installer ISO.                          |
| udf         | ✓      | For Blu-ray / UDF media.                                 |
| squashfs     | ✓      | Live ISO rootfs compression (zstd).                      |
| overlayfs    | ✓      | Used for the live ISO's writable overlay (optional).     |
| tmpfs        | ✓      | `/run`, `/tmp` mounts.                                   |

---

## 9. Reporting missing hardware

If your hardware isn't on this list but you'd like DXN1-OS to support it,
open a ticket at <https://dxn1.org/bugs/> with the output of:

```bash
lspci -nn
lsusb
lscpu
cat /proc/cpuinfo | head -n 30
```

We'll triage the request and add the kernel `CONFIG_*` and userspace build
steps in a follow-up release.
