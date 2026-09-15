import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Simulated DXN1-OS installer log stream.
// Emits realistic terminal output for the chosen profile/method so the
// web-based installer wizard can render a live "installing..." terminal.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const profile: string = body.profile === "full" ? "full" : body.profile === "manual" ? "manual" : "5gb";
  const method: string =
    body.method === "drivedroid"
      ? "drivedroid"
      : body.method === "partition"
      ? "partition"
      : "usb";
  const hostname: string = String(body.hostname || "dxn1").slice(0, 32) || "dxn1";
  const disk: string = String(body.disk || "/dev/sda").slice(0, 16) || "/dev/sda";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (line: string, delay = 90) =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            controller.enqueue(encoder.encode(line + "\r\n"));
            resolve();
          }, delay)
        );

      const banner = [
        "\x1b[1;32m  ____  _  _   _   _  ___  _   _  ___ \x1b[0m",
        "\x1b[1;32m |  _ \\| || | /_\\ | \\| |/ __|| | | |/ __|\x1b[0m",
        "\x1b[1;32m | | | | __ |/ _ \\| .` |\\__ \\| |_| | (_ |\x1b[0m",
        "\x1b[1;32m |_| |_|_||_/_/ \\_\\_|\\_|___(_)___/ \\___|\x1b[0m",
        "",
        "\x1b[1;36m  DXN1-OS 1.0 'oxide'  installer\x1b[0m  (build 2025.01)",
        "\x1b[2m  (c) DXN1 Project - licensed under GPLv2+\x1b[0m",
        "",
      ];

      for (const l of banner) await emit(l, 40);

      await emit(`\x1b[1;33m[i]\x1b[0m profile   : ${profile}`, 120);
      await emit(`\x1b[1;33m[i]\x1b[0m method     : ${method}`, 80);
      await emit(`\x1b[1;33m[i]\x1b[0m target    : ${disk}`, 80);
      await emit(`\x1b[1;33m[i]\x1b[0m hostname  : ${hostname}`, 80);
      await emit("");

      if (method === "usb" || method === "drivedroid") {
        await emit("\x1b[1;34m==>\x1b[0m Verifying ISO image...", 200);
        await emit("    sha256(dxn1-os-1.0.iso) = 67e8aa8a931c5732...12e7d8  \x1b[32mOK\x1b[0m", 120);
        await emit(`\x1b[1;34m==>\x1b[0m Detecting target ${method === "usb" ? "USB device" : "DriveDroid image"}...`, 250);
        await emit(method === "usb" ? "    /dev/sdb  SanDisk Ultra 32GB" : "    /storage/dxn1-os-1.0.img  (DriveDroid raw)", 120);
        await emit("\x1b[1;34m==>\x1b[0m Writing image with dd (bs=4M conv=fsync)...", 200);
        const pct = [4, 9, 15, 22, 28, 36, 44, 53, 61, 70, 78, 86, 93, 100];
        for (const p of pct) {
          await emit(`    ${String(p).padStart(3)}%  ${"#".repeat(Math.floor(p / 4)).padEnd(25)}  ${p === 100 ? "done" : ""}`, 220);
        }
        await emit("    sync...", 300);
        await emit("    verifying written bytes...  \x1b[32mmatch\x1b[0m", 200);
        await emit("");
        await emit("\x1b[1;32m[✓]\x1b[0m Bootable USB image ready.", 150);
        await emit(`    Boot from it and run the TUI installer (option 3) to install`, 100);
        await emit(`    DXN1-OS onto disk using the '${profile}' profile.`, 100);
      } else {
        // partition method — full disk install simulation
        await emit("\x1b[1;34m==>\x1b[0m Probing disks...", 200);
        await emit(`    ${disk}  ${disk.includes("nvme") ? "NVMe SSD" : "SATA SSD"}  256 GB`, 120);
        await emit("\x1b[1;34m==>\x1b[0m Partitioning (profile: " + profile + ")...", 250);

        if (profile === "5gb") {
          await emit(`    parted -s ${disk} mklabel gpt`, 140);
          await emit(`    parted -s ${disk} mkpart primary 1MiB 2MiB       (BIOS boot)`, 140);
          await emit(`    parted -s ${disk} mkpart ESP fat32 2MiB 514MiB   (EFI System)`, 140);
          await emit(`    parted -s ${disk} mkpart swap 514MiB 1.5GiB`, 140);
          await emit(`    parted -s ${disk} mkpart root ext4 1.5GiB 5.0GiB`, 140);
          await emit(`    mkfs.vfat  ${disk}2   ->  \x1b[32mOK\x1b[0m`, 140);
          await emit(`    mkswap     ${disk}3   ->  \x1b[32mOK\x1b[0m`, 140);
          await emit(`    mkfs.ext4  ${disk}4   ->  \x1b[32mOK\x1b[0m`, 140);
        } else if (profile === "full") {
          await emit(`    parted -s ${disk} mklabel gpt`, 140);
          await emit(`    parted -s ${disk} mkpart ESP fat32 1MiB 513MiB`, 140);
          await emit(`    parted -s ${disk} mkpart swap 513MiB 8.5GiB`, 140);
          await emit(`    parted -s ${disk} mkpart root ext4 8.5GiB 100%`, 140);
          await emit(`    mkfs.vfat  ${disk}1  ;  mkswap ${disk}2  ;  mkfs.ext4 ${disk}3`, 140);
        } else {
          await emit(`    using pre-existing partitions (manual mode)`, 140);
          await emit(`    mkfs.ext4 ${disk}3 -> \x1b[32mOK\x1b[0m`, 140);
        }

        await emit("\x1b[1;34m==>\x1b[0m Mounting target rootfs...", 200);
        await emit(`    mount ${disk}${profile === "full" ? "3" : "4"} /mnt/dxn1`, 120);
        await emit("\x1b[1;34m==>\x1b[0m Copying SquashFS rootfs -> /mnt/dxn1...", 200);
        const cp = [8, 17, 26, 38, 49, 60, 71, 82, 91, 100];
        for (const p of cp) {
          await emit(`    unsquashfs copy  ${String(p).padStart(3)}%  ${"#".repeat(Math.floor(p / 5)).padEnd(20)}`, 180);
        }
        await emit("\x1b[1;34m==>\x1b[0m Installing kernel + modules...", 200);
        await emit("    /boot/bzImage-6.10.5  /lib/modules/6.10.5/", 120);
        await emit("\x1b[1;34m==>\x1b[0m Compiling driver modules...", 250);
        for (const d of ["gpu", "network", "audio", "input", "wifi"]) {
          await emit(`    [drivers/${d}] make  ->  \x1b[32mOK\x1b[0m`, 120);
        }
        await emit("    depmod 6.10.5", 120);
        await emit("\x1b[1;34m==>\x1b[0m Generating /etc/fstab (UUIDs)...", 180);
        await emit("\x1b[1;34m==>\x1b[0m Setting hostname = " + hostname, 120);
        await emit("\x1b[1;34m==>\x1b[0m Configuring locale (en_US.UTF-8) & timezone...", 180);
        await emit("\x1b[1;34m==>\x1b[0m Installing GRUB bootloader...", 250);
        await emit(profile === "5gb" ? "    grub-install --target=i386-pc " + disk : "    grub-install --target=x86_64-efi --efi-directory=/boot/efi", 140);
        await emit("    grub-mkconfig -o /boot/grub/grub.cfg", 140);
        await emit("\x1b[1;34m==>\x1b[0m Finalizing...", 250);
      }

      await emit("", 100);
      await emit("\x1b[1;32m========================================================\x1b[0m", 80);
      await emit("\x1b[1;32m  DXN1-OS 1.0 installed successfully.                     \x1b[0m", 80);
      await emit("\x1b[1;32m  Reboot to boot into your new system.                   \x1b[0m", 80);
      await emit("\x1b[1;32m========================================================\x1b[0m", 80);
      await emit("", 200);
      await emit("\x1b[2m[session ended]\x1b[0m", 80);

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
