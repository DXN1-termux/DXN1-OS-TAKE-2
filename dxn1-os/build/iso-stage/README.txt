DXN1-OS 1.0 'oxide' - real bootable live ISO
=================================================

This is a REAL Linux live ISO. It contains:

  /boot/bzImage              - real Linux 5.10.0-32-amd64 kernel (Debian)
                                with EFI_STUB + initramfs + virtio + ext4 + iso9660
  /boot/initramfs.img        - real busybox 1.35.0 (musl static) initramfs
                                with /init PID 1, /bin/busybox + 70 applet symlinks
  /EFI/BOOT/BOOTX64.EFI      - copy of the kernel, bootable directly by UEFI firmware
  /startup.nsh               - UEFI shell auto-boot script
  /boot/grub/grub.cfg        - GRUB menu (for grub-based boot)
  /isolinux/isolinux.cfg     - isolinux menu (for BIOS boot with isolinux)
  /dxn1/VERSION              - release marker
  /dxn1/busybox              - the static busybox binary, for reference

UEFI boot (no bootloader needed):
  The kernel has EFI_STUB. Any UEFI firmware loads /EFI/BOOT/BOOTX64.EFI
  directly, which IS the kernel. It then loads /boot/initramfs.img and
  runs /init, dropping you into a real busybox root shell.

BIOS boot:
  Requires isolinux.bin + ldlinux.c32 in /isolinux/ (not bundled here
  due to licensing; add them from the syslinux package to enable BIOS boot).

Verify:
  sha256sum dxn1-os-1.0.iso   # compare to the .sha256 sidecar

Boot in QEMU (UEFI):
  qemu-system-x86_64 -bios /usr/share/OVMF/OVMF_CODE.fd -cdrom dxn1-os-1.0.iso -m 512

(c) DXN1 Project - GPLv2+
