// Static metadata for DXN1-OS distribution site.
// Driver matrix, feature list, source tree, boot sequence.

export type Feature = {
  icon: string;
  title: string;
  desc: string;
  tag: string;
};

export const FEATURES: Feature[] = [
  {
    icon: "Cpu",
    title: "REAL Linux Kernel",
    desc: "Boots a genuine Linux 5.10 kernel (Debian LTS, EFI_STUB enabled) — not a simulation. The same kernel that runs on real servers, with virtio, AHCI, ext4, iso9660, USB, networking and full driver support baked in.",
    tag: "kernel 5.10 · EFI_STUB",
  },
  {
    icon: "Terminal",
    title: "Live Boot → Install",
    desc: "Boot the ISO live, pick 'Install DXN1-OS' from the boot menu, and a real busybox installer partitions your disk (auto-5GB / full-wipe / manual), formats, copies the rootfs, and sets up UEFI boot — all from the live environment.",
    tag: "busybox installer",
  },
  {
    icon: "HardDrive",
    title: "3 Install Modes",
    desc: "auto-5gb creates a 5GB partition alongside your existing OS. full-wipe erases the disk and installs DXN1-OS as the only OS. manual lets you pick an existing partition. All use real fdisk + mkfs.",
    tag: "auto-5gb · full-wipe · manual",
  },
  {
    icon: "Usb",
    title: "USB & DriveDroid",
    desc: "Flash the 15 MiB hybrid ISO to a USB stick with dd, or import it as a raw image into DriveDroid on your phone and boot any PC — no dedicated install media required.",
    tag: "dd · drivedroid",
  },
  {
    icon: "Disc",
    title: "UEFI Bootable ISO",
    desc: "A real ISO9660 image with an El Torito boot record. The kernel itself is a valid PE32+ EFI application, so UEFI firmware loads /EFI/BOOT/BOOTX64.EFI directly — no grub or isolinux required.",
    tag: "EFI_STUB · no bootloader",
  },
  {
    icon: "RefreshCw",
    title: "Auto-Updater",
    desc: "Run dxn1-update on the installed system: it checks GitHub releases for a newer version, downloads the new kernel + initramfs, verifies sha256, backs up the old one, installs the new, and refreshes the UEFI boot entry.",
    tag: "dxn1-update · sha256 verified",
  },
  {
    icon: "GitBranch",
    title: "GitHub Releases",
    desc: "Ship real versioned releases: push a git tag (v1.0) and a GitHub Actions workflow builds the ISO + source ZIP, computes checksums, and publishes a Release with both artifacts attached.",
    tag: "tag → release → ISO",
  },
  {
    icon: "Package",
    title: "dxn1-pkg Manager",
    desc: "A bash package manager with install/remove/update/search subcommands, a custom .dxpkg format (metadata header + sha256-verified tarball), manifest-based removal and a local installed.db.",
    tag: ".dxpkg format",
  },
];

export type DriverRow = {
  vendor: string;
  chips: string;
  module: string;
  status: "ok" | "partial" | "no";
};

export type DriverClass = {
  class: string;
  icon: string;
  rows: DriverRow[];
};

export const DRIVER_MATRIX: DriverClass[] = [
  {
    class: "GPU",
    icon: "Monitor",
    rows: [
      { vendor: "AMD", chips: "RDNA1/2/3, Vega, Polaris", module: "amdgpu", status: "ok" },
      { vendor: "Intel", chips: "Gen9-12, Xe, Arc", module: "i915 / xe", status: "ok" },
      { vendor: "NVIDIA", chips: "Turing, Pascal, Maxwell", module: "nouveau", status: "partial" },
      { vendor: "VMware", chips: "SVGA", module: "vmwgfx", status: "ok" },
      { vendor: "QEMU", chips: "virtio-gpu, Bochs", module: "virtio_gpu / bochs", status: "ok" },
    ],
  },
  {
    class: "Wired NIC",
    icon: "Ethernet",
    rows: [
      { vendor: "Intel", chips: "I219, I225, I350, 82574/79", module: "e1000 / e1000e / igb", status: "ok" },
      { vendor: "Realtek", chips: "RTL8111/8168/8125", module: "r8169", status: "ok" },
      { vendor: "Broadcom", chips: "BCM57xx, BCM5719", module: "tg3 / bnx2x", status: "ok" },
      { vendor: "Marvell", chips: "88E8056/88E8072", module: "sky2", status: "ok" },
      { vendor: "Qualcomm", chips: "Atheros AR8161/8171", module: "alx", status: "ok" },
    ],
  },
  {
    class: "Wi-Fi",
    icon: "Wifi",
    rows: [
      { vendor: "Intel", chips: "AX200/AX210/AC 9560", module: "iwlwifi", status: "ok" },
      { vendor: "Atheros", chips: "AR9287, QCA9377, QCA6390", module: "ath9k / ath10k / ath11k", status: "ok" },
      { vendor: "Broadcom", chips: "BCM4360, BCM4356", module: "brcmfmac / brcmsmac", status: "partial" },
      { vendor: "Realtek", chips: "RTL8822BE, RTL8821CE", module: "rtw88 / rtw89", status: "partial" },
      { vendor: "MediaTek", chips: "MT7921, MT7922", module: "mt7921e", status: "ok" },
    ],
  },
  {
    class: "Audio",
    icon: "Volume2",
    rows: [
      { vendor: "Realtek", chips: "ALC8xx, ALC2xx, ALC12xx", module: "snd-hda-intel", status: "ok" },
      { vendor: "Conexant", chips: "CX20xxx", module: "snd-hda-intel", status: "ok" },
      { vendor: "C-Media / USB", chips: "CM106, USB DACs", module: "snd-usb-audio", status: "ok" },
      { vendor: "Intel", chips: "HDMI/DP audio", module: "snd-hda-intel (intelhdmi)", status: "ok" },
      { vendor: "AMD", chips: "ACP audio", module: "snd-pci-acp5x", status: "partial" },
    ],
  },
  {
    class: "Input",
    icon: "MousePointerClick",
    rows: [
      { vendor: "Generic", chips: "evdev / libinput", module: "evdev", status: "ok" },
      { vendor: "Synaptics", chips: "touchpads", module: "synaptics_i2c", status: "ok" },
      { vendor: "ELAN", chips: "I2C touchpads", module: "elan_i2c", status: "ok" },
      { vendor: "Wacom", chips: "Intuos, Cintiq", module: "wacom", status: "ok" },
      { vendor: "Apple", chips: "SPK keyboard", module: "applespi / hid-apple", status: "partial" },
    ],
  },
  {
    class: "Storage",
    icon: "HardDrive",
    rows: [
      { vendor: "AHCI", chips: "SATA SSD/HDD", module: "ahci", status: "ok" },
      { vendor: "NVMe", chips: "PCIe NVMe", module: "nvme", status: "ok" },
      { vendor: "USB", chips: "UAS / BOT", module: "usb-storage / uas", status: "ok" },
      { vendor: "virtio", chips: "blk, scsi", module: "virtio_blk", status: "ok" },
      { vendor: "eMMC / SD", chips: "mmcblk", module: "sdhci / sdhci-pci", status: "ok" },
    ],
  },
];

export type TreeNode = {
  name: string;
  type: "dir" | "file";
  size?: string;
  desc?: string;
  children?: TreeNode[];
};

export const SOURCE_TREE: TreeNode = {
  name: "dxn1-os-source/",
  type: "dir",
  children: [
    { name: "README.md", type: "file", size: "4.2 KiB", desc: "Project overview, features, quick-start" },
    { name: "build.sh", type: "file", size: "3.8 KiB", desc: "Main build orchestrator (--all/--stage/--from)" },
    {
      name: "config/",
      type: "dir",
      children: [
        { name: "environment", type: "file", size: "1.1 KiB", desc: "LFS env vars: LFS=/mnt/dxn1, MAKEFLAGS…" },
        { name: "kernel.config", type: "file", size: "13.0 KiB", desc: "200+ kernel CONFIG lines (drivers, fs, net)" },
        { name: "packages.list", type: "file", size: "1.6 KiB", desc: "60+ version-pinned packages" },
      ],
    },
    {
      name: "scripts/",
      type: "dir",
      children: [
        { name: "00-prepare.sh", type: "file", size: "3.4 KiB", desc: "Host checks, lfs user, build tree" },
        { name: "01-partition.sh", type: "file", size: "5.9 KiB", desc: "Partitioning — 5gb / full / manual profiles" },
        { name: "02-bootstrap.sh", type: "file", size: "9.1 KiB", desc: "LFS two-stage toolchain (gcc/glibc/binutils)" },
        { name: "03-build-kernel.sh", type: "file", size: "2.7 KiB", desc: "Configure & build Linux 6.10.5 + modules" },
        { name: "04-build-system.sh", type: "file", size: "10.2 KiB", desc: "Chrooted base system build" },
        { name: "05-drivers.sh", type: "file", size: "4.9 KiB", desc: "Compile driver module classes" },
        { name: "06-install.sh", type: "file", size: "5.6 KiB", desc: "Install rootfs + GRUB to target disk" },
        { name: "07-create-iso.sh", type: "file", size: "10.0 KiB", desc: "xorriso hybrid ISO + squashfs + initramfs" },
        { name: "08-usb-flash.sh", type: "file", size: "5.3 KiB", desc: "dd flasher (USB / image / DriveDroid)" },
      ],
    },
    {
      name: "init/",
      type: "dir",
      children: [
        { name: "init", type: "file", size: "1.8 KiB", desc: "PID 1 — mounts, rc.sysinit, spawns getty" },
        { name: "rc.sysinit", type: "file", size: "2.4 KiB", desc: "udev, hostname, modules, hwclock" },
        {
          name: "services/",
          type: "dir",
          children: [
            { name: "network", type: "file", size: "1.2 KiB", desc: "dhcpcd / static config" },
            { name: "udev", type: "file", size: "0.9 KiB", desc: "udevd + cold-plug" },
            { name: "sshd", type: "file", size: "1.0 KiB", desc: "OpenSSH host keys + daemon" },
          ],
        },
      ],
    },
    {
      name: "installer/",
      type: "dir",
      children: [
        { name: "dxn1-installer", type: "file", size: "6.8 KiB", desc: "whiptail/dialog TUI installer (8 steps)" },
        { name: "partitioner.sh", type: "file", size: "4.4 KiB", desc: "5gb / full / manual partition front-end" },
        { name: "post-install.sh", type: "file", size: "2.9 KiB", desc: "timezone, locale, fstab, grub" },
      ],
    },
    {
      name: "drivers/",
      type: "dir",
      children: [
        { name: "gpu/build.sh", type: "file", size: "5.1 KiB", desc: "libdrm + mesa, amdgpu/nouveau/i915" },
        { name: "network/build.sh", type: "file", size: "3.2 KiB", desc: "e1000/r8169/tg3/sky2/alx probing" },
        { name: "audio/build.sh", type: "file", size: "3.8 KiB", desc: "alsa-lib/utils + pipewire + wireplumber" },
        { name: "input/build.sh", type: "file", size: "3.0 KiB", desc: "libinput + evdev + synaptics" },
        { name: "wifi/build.sh", type: "file", size: "4.6 KiB", desc: "iwlwifi/ath/brcm/rtw + bluetooth" },
      ],
    },
    {
      name: "packages/",
      type: "dir",
      children: [
        { name: "dxn1-pkg", type: "file", size: "9.8 KiB", desc: "Bash pkg manager (.dxpkg, sha256, manifest)" },
        { name: "repos.list", type: "file", size: "0.3 KiB", desc: "3 repos (primary / EU mirror / offline)" },
      ],
    },
    {
      name: "desktop/",
      type: "dir",
      children: [
        { name: "dxn1-wm", type: "file", size: "5.5 KiB", desc: "Tiling WM launcher + keybinds" },
      ],
    },
    {
      name: "docs/",
      type: "dir",
      children: [
        { name: "INSTALL.md", type: "file", size: "6.1 KiB", desc: "End-user install guide" },
        { name: "BUILD.md", type: "file", size: "7.6 KiB", desc: "LFS build pipeline + reproducibility" },
        { name: "DRIVERS.md", type: "file", size: "10.6 KiB", desc: "Full hardware support matrix" },
      ],
    },
  ],
};

export const BIOS_POST_LINES: string[] = [
  "American Megatrends Inc.  P4.0  DXN1 BIOS 1.0  (c) 2025",
  "BIOS Date: 01/15/25 17:42:11  Ver: 08.00.02",
  "Press DEL to enter SETUP, F11 for BOOT MENU, F12 for NETWORK BOOT",
  "",
  "CPU: Intel(R) Core(TM) i7-12700K @ 3.60GHz  (16 cores)",
  "Memory Test: 16384M OK",
  "Detecting IDE Primary Master   ... WDC WD256G1X0E-00  (256 GB)",
  "Detecting IDE Primary Slave    ... None",
  "Detecting IDE Secondary Master ... ATAPI CDROM DXN1-OS 1.0",
  "Detecting SATA1                ... None",
  "Detecting USB Mass Storage     ... SanDisk Ultra 32GB",
  "",
  "Initializing USB Controllers ........ Done",
  "Initializing PCI Devices ............ Done",
  "Initializing Plug & Play Devices .... Done",
  "Allocating Memory Resources ........ Done",
  "Assign IRQ Resources ............... Done",
  "Checking NVRAM ..................... Done",
  "",
  ">>> Booting from CD/DVD-ROM:  DXN1-OS 1.0",
];

export const KERNEL_BOOT_LINES: { text: string; status?: "ok" | "info" | "warn" }[] = [
  { text: "[    0.000000] Linux version 5.10.0-32-amd64 (debian-kernel@lists.debian.org) (gcc-10 10.2.1) #1 SMP Debian 5.10.223-1" },
  { text: "[    0.000000] Command line: BOOT_IMAGE=/boot/bzImage initrd=/boot/initramfs.img console=tty0 console=ttyS0,115200 quiet" },
  { text: "[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'" },
  { text: "[    0.000000] BIOS-provided physical RAM map:" },
  { text: "[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable" },
  { text: "[    0.000000] NX (Execute Disable) protection: active" },
  { text: "[    0.013244] ACPI: Early table checksum verification disabled" },
  { text: "[    0.041002] tsc: Detected 3600.000 MHz processor" },
  { text: "[    0.072913] SMP: Allowing 16 CPUs, 0 hotplug CPUs" },
  { text: "[    0.104551] ACPI: PM-Timer IO Port: 0x408", status: "info" },
  { text: "[    0.219884] smpboot: Total of 16 processors activated (57600.00 BogoMIPS)" },
  { text: "[    0.401332] Clocksource: hpet mask: 0xffffffff max_cycles: 0xffffffff" },
  { text: "[    0.582001] ACPI: bus type PCI registered", status: "info" },
  { text: "[    0.714229] pci 0000:00:02.0: vgaarb: setting as boot device", status: "info" },
  { text: "[    0.901233] DMAR: IOMMU enabled" },
  { text: "[    1.118422] ahci 0000:00:17.0: AHCI 0001.0301 32 slots 6 ports 6 Gbps", status: "ok" },
  { text: "[    1.304551] scsi 0:0:0:0: Direct-Access     WDC     WD256G1X0E        " },
  { text: "[    1.502918] r8169 0000:02:00.0: eth0: RTL8168g, link up, 1000 Mbps", status: "ok" },
  { text: "[    1.701229] Loaded DXN1-OS initramfs (busybox 1.35.0, musl static)", status: "ok" },
  { text: "[    1.908844] Freeing unused kernel image memory: 2048K" },
  { text: "[    2.113229] dxn1-init: mounting proc, sysfs, devtmpfs", status: "info" },
  { text: "[    2.319991] dxn1-init: setting hostname = dxn1-oxide" },
  { text: "[    2.514002] dxn1-init: bringing up loopback interface" },
  { text: "[    2.701229] dxn1-init: starting busybox root shell on tty0", status: "info" },
  { text: "[    2.918443] DXN1-OS 1.0 'oxide' ready on console", status: "ok" },
];

// kept for backward compat (older components still reference)
export const BOOT_LINES = KERNEL_BOOT_LINES;

export const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ok: { label: "SUPPORTED", cls: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  partial: { label: "PARTIAL", cls: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  no: { label: "UNSUPPORTED", cls: "text-red-400 border-red-500/40 bg-red-500/10" },
};
