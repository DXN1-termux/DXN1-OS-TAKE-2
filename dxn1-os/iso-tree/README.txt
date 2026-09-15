DXN1-OS 1.0 -- Bootable Hybrid ISO (BIOS + UEFI)
=================================================

This is the live ISO image for DXN1-OS, a minimal Linux distribution
built from source on top of an LFS (Linux From Scratch) base.

  - Hybrid ISO: write directly to USB with `dd`, or boot in VirtualBox
    / QEMU / real hardware. Also importable into DriveDroid as a raw
    image.
  - Boot menu (isolinux + GRUB) offers:
        1. DXN1-OS 1.0 (default, full driver support)
        2. DXN1-OS 1.0 (safe graphics, nomodeset)
        3. DXN1-OS Installer (TUI: 5GB / full-disk / manual partitioning)
        4. DXN1-OS Rescue Shell
        5. Memtest86+
        6. Hardware Detection Tool

  - The live root filesystem is a zstd-compressed SquashFS image
    (dxn1/rootfs.squashfs) loaded from an initramfs that probes
    /dev/sr0 and /dev/sd*1.

  - Minimum install footprint: a single 5 GB partition (see the
    installer's "5gb" profile: 1 MiB BIOS boot + ESP, 1 GiB swap,
    ~3 GiB root).

Verify the image:
    sha256sum dxn1-os-1.0.iso        # compare against the .sha256 sidecar

Write to USB:
    sudo dd if=dxn1-os-1.0.iso of=/dev/sdX bs=4M conv=fsync status=progress
    sync

Import into DriveDroid (USB-from-phone):
    Rename to dxn1-os-1.0.iso, place a sidecar dxn1-os-1.0.import.txt
    containing "WRITEABLE=0", and import as a raw image in DriveDroid.

Full documentation:    /docs/INSTALL.md  /docs/DRIVERS.md
Source code:           dxn1-os-source.zip

-- the DXN1 project
