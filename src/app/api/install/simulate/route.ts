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
        // partition method — real dxn1-installer running from the live boot
        await emit("\x1b[1;34m==>\x1b[0m Probing disks (busybox fdisk -l)...", 200);
        await emit(`    ${disk}  ${disk.includes("nvme") ? "NVMe SSD" : "SATA SSD"}  256 GB`, 120);
        await emit("\x1b[1;34m==>\x1b[0m Partitioning (mode: " + profile + ") with busybox fdisk...", 250);

        if (profile === "5gb") {
          await emit(`    fdisk ${disk}  << g ; n 1  +5G ; w`, 140);
          await emit(`    created GPT, 5GB partition ${disk}1`, 140);
          await emit(`    mkfs.ext2 -L dxn1root ${disk}1  ->  \x1b[32mOK\x1b[0m`, 140);
        } else if (profile === "full") {
          await emit(`    fdisk ${disk}  << g ; n 1 +512M (EFI) ; n 2 +1G (swap) ; n 3 (root)`, 140);
          await emit(`    mkfs.vfat -F32 ${disk}1  ->  \x1b[32mOK\x1b[0m`, 140);
          await emit(`    mkswap    ${disk}2  ->  \x1b[32mOK\x1b[0m`, 140);
          await emit(`    mkfs.ext2  ${disk}3  ->  \x1b[32mOK\x1b[0m`, 140);
        } else {
          await emit(`    using pre-existing partition ${disk}1 (manual mode)`, 140);
          await emit(`    mkfs.ext2 -L dxn1root ${disk}1  ->  \x1b[32mOK\x1b[0m`, 140);
        }

        await emit("\x1b[1;34m==>\x1b[0m Mounting root partition at /mnt/dxn1...", 200);
        await emit(`    mount ${disk}${profile === "full" ? "3" : "1"} /mnt/dxn1`, 120);
        await emit("\x1b[1;34m==>\x1b[0m Copying busybox userspace to disk...", 200);
        const cp = [8, 17, 26, 38, 49, 60, 71, 82, 91, 100];
        for (const p of cp) {
          await emit(`    cp -a /bin/busybox  ${String(p).padStart(3)}%  ${"#".repeat(Math.floor(p / 5)).padEnd(20)}`, 180);
        }
        await emit("    recreating 70 applet symlinks (sh, ls, mount, ip, vi...)", 120);
        await emit("\x1b[1;34m==>\x1b[0m Installing real kernel to /boot...", 200);
        await emit("    /boot/bzImage (5.10.0-32-amd64, 7.0 MiB)  ->  copied", 120);
        await emit("    /boot/initramfs.img (busybox 1.35 live rescue)  ->  copied", 120);
        await emit("\x1b[1;34m==>\x1b[0m Writing /etc/fstab with live UUIDs...", 180);
        await emit("\x1b[1;34m==>\x1b[0m Installing /sbin/init (real root mounter)...", 180);
        await emit("\x1b[1;34m==>\x1b[0m Installing dxn1-installer + dxn1-update...", 180);
        if (profile === "full") {
          await emit("\x1b[1;34m==>\x1b[0m Setting up UEFI boot (kernel as EFI app)...", 250);
          await emit("    mount ESP at /mnt/dxn1/boot/efi", 120);
          await emit("    cp /boot/bzImage  /boot/efi/EFI/BOOT/BOOTX64.EFI", 140);
          await emit("    (kernel has EFI_STUB — UEFI firmware boots it directly)", 120);
          await emit("    write startup.nsh (root=UUID=... init=/sbin/init)", 140);
        }
        await emit("\x1b[1;34m==>\x1b[0m Writing /etc/dxn1-install-info marker...", 180);
        await emit("\x1b[1;34m==>\x1b[0m sync...", 250);
      }

      await emit("", 100);
      await emit("\x1b[1;32m========================================================\x1b[0m", 80);
      await emit("\x1b[1;32m  DXN1-OS 1.0 installed successfully.                     \x1b[0m", 80);
      await emit("\x1b[1;32m  Reboot (remove the USB) to boot from disk.             \x1b[0m", 80);
      await emit("\x1b[1;32m  Run 'dxn1-update' after boot to stay current.          \x1b[0m", 80);
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
