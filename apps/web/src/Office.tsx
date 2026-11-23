import { useEffect, useRef } from "react";
import Phaser from "phaser";

export default function Office({
  onDevice,
}: {
  onDevice: (device: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onDevice);
  callback.current = onDevice;
  useEffect(() => {
    class Room extends Phaser.Scene {
      create() {
        const g = this.add.graphics();
        const poly = (points: number[][], color: number, alpha = 1) => {
          g.fillStyle(color, alpha);
          g.fillPoints(
            points.map(([x, y]) => new Phaser.Math.Vector2(x, y)),
            true,
          );
        };
        const line = (
          x: number,
          y: number,
          x2: number,
          y2: number,
          color = 0x315565,
          width = 1,
        ) => {
          g.lineStyle(width, color, 1);
          g.lineBetween(x, y, x2, y2);
        };
        const iso = (x: number, y: number, z = 0) => [
          440 + (x - y) * 48,
          185 + (x + y) * 24 - z,
        ];
        const box = (
          x: number,
          y: number,
          w: number,
          d: number,
          h: number,
          top: number,
          left: number,
          right: number,
          z = 0,
        ) => {
          const a = iso(x, y, z),
            b = iso(x + w, y, z),
            c = iso(x + w, y + d, z),
            e = iso(x, y + d, z);
          const lift = (p: number[]) => [p[0], p[1] - h];
          poly([a, b, lift(b), lift(a)], left);
          poly([b, c, lift(c), lift(b)], right);
          poly([e, c, lift(c), lift(e)], right);
          poly([a, e, lift(e), lift(a)], left);
          poly([lift(a), lift(b), lift(c), lift(e)], top);
        };
        // Architecture: a quiet office after hours, built from editable vectors.
        poly(
          [
            [55, 425],
            [440, 225],
            [830, 425],
            [440, 625],
          ],
          0x071723,
          0.5,
        );
        poly([iso(0, 0), iso(7, 0), iso(7, 0, 200), iso(0, 0, 200)], 0x254251);
        poly([iso(0, 0), iso(0, 7), iso(0, 7, 200), iso(0, 0, 200)], 0x1d3544);
        poly([iso(0, 0), iso(7, 0), iso(7, 7), iso(0, 7)], 0x33515b);
        for (let i = 0; i <= 7; i++) {
          const a = iso(i, 0),
            b = iso(i, 7),
            c = iso(0, i),
            d = iso(7, i);
          line(a[0], a[1], b[0], b[1], 0x45616a, 0.8);
          line(c[0], c[1], d[0], d[1], 0x45616a, 0.8);
        }
        // Window and blinds on the left wall.
        poly(
          [iso(0, 1, 165), iso(0, 3.6, 165), iso(0, 3.6, 65), iso(0, 1, 65)],
          0x0e2436,
        );
        for (let i = 0; i < 5; i++) {
          const a = iso(0, 1, 78 + i * 18),
            b = iso(0, 3.6, 78 + i * 18);
          line(a[0], a[1], b[0], b[1], 0x45677c, 4);
        }
        const wa = iso(0, 2.3, 165),
          wb = iso(0, 2.3, 65);
        line(wa[0], wa[1], wb[0], wb[1], 0x567786, 3);
        // Wall board and pinned documents.
        poly(
          [
            iso(3.6, 0, 162),
            iso(5.8, 0, 162),
            iso(5.8, 0, 75),
            iso(3.6, 0, 75),
          ],
          0x7d7864,
        );
        for (let i = 0; i < 3; i++) {
          const p = iso(3.85 + i * 0.58, 0, 142);
          poly(
            [
              [p[0], p[1]],
              [p[0] + 20, p[1] + 10],
              [p[0] + 20, p[1] + 43],
              [p[0], p[1] + 33],
            ],
            i === 1 ? 0xd5b069 : 0xc5d0cb,
          );
        }
        // Rug, desk and legs.
        poly(
          [iso(2.4, 2.2), iso(6.3, 2.2), iso(6.3, 5.6), iso(2.4, 5.6)],
          0x203945,
        );
        box(2.6, 2.5, 0.16, 0.16, 61, 0x213542, 0x152b37, 0x102330);
        box(5.8, 2.5, 0.16, 0.16, 61, 0x213542, 0x152b37, 0x102330);
        box(2.6, 3.9, 0.16, 0.16, 61, 0x213542, 0x152b37, 0x102330);
        box(5.8, 3.9, 0.16, 0.16, 61, 0x213542, 0x152b37, 0x102330);
        box(2.4, 2.35, 3.8, 1.9, 10, 0xb08c66, 0x806147, 0x6b513e, 61);
        box(3.4, 2.7, 1.5, 0.4, 4, 0x1a2e3a, 0x152735, 0x10222c, 72);
        const monitor = iso(3.5, 2.8, 145);
        poly(
          [
            [monitor[0], monitor[1]],
            [monitor[0] + 80, monitor[1] + 40],
            [monitor[0] + 80, monitor[1] + 98],
            [monitor[0], monitor[1] + 58],
          ],
          0x102330,
        );
        poly(
          [
            [monitor[0] + 6, monitor[1] + 10],
            [monitor[0] + 74, monitor[1] + 44],
            [monitor[0] + 74, monitor[1] + 85],
            [monitor[0] + 6, monitor[1] + 51],
          ],
          0x317f8d,
        );
        for (let i = 0; i < 4; i++)
          line(
            monitor[0] + 15,
            monitor[1] + 24 + i * 7,
            monitor[0] + 40 + (i % 2) * 18,
            monitor[1] + 36 + i * 7 + (i % 2) * 9,
            0x9dd3c7,
            2,
          );
        box(3.6, 3.4, 1.2, 0.4, 3, 0x334957, 0x1b2e3b, 0x1b2e3b, 72);
        // Phone, paper and desk light.
        box(5.3, 3.2, 0.3, 0.6, 4, 0x162a38, 0x132430, 0x142532, 72);
        box(5.32, 3.24, 0.25, 0.43, 1, 0xd4b36f, 0x162a38, 0x162a38, 77);
        box(2.7, 3.3, 0.55, 0.65, 1, 0xd0d9cf, 0xadbcae, 0xadbcae, 72);
        // Chair.
        box(4.1, 4.6, 0.8, 0.75, 7, 0x57727c, 0x2b4654, 0x294350, 35);
        box(4.1, 5.2, 0.8, 0.18, 42, 0x496675, 0x2b4555, 0x1c3543, 34);
        box(4.4, 4.9, 0.12, 0.12, 30, 0x182e3c, 0x182e3c, 0x182e3c);
        // Equipment cabinet with router.
        box(5.9, 0.45, 1, 1, 70, 0x6a7d83, 0x415c69, 0x314c5c);
        box(6, 0.55, 0.7, 0.6, 8, 0x253e4c, 0x142b3b, 0x182d3a, 71);
        const r = iso(6.2, 0.8, 87);
        line(r[0], r[1], r[0], r[1] - 22, 0x92b9bd, 3);
        line(r[0] + 15, r[1] + 8, r[0] + 15, r[1] - 16, 0x92b9bd, 3);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(0xb9d68a);
          g.fillCircle(r[0] - 8 + i * 5, r[1] + 12, 1.4);
        }
        // Plant.
        box(0.7, 5.6, 0.6, 0.6, 28, 0xac805e, 0x7c5b47, 0x664d40);
        const plant = iso(1, 5.9, 30);
        g.lineStyle(4, 0x6b9d8b);
        g.lineBetween(plant[0], plant[1], plant[0], plant[1] - 64);
        for (let i = 0; i < 5; i++) {
          g.fillStyle(i % 2 ? 0x5b8e7b : 0x78a994);
          g.fillEllipse(
            plant[0] + (i % 2 ? 12 : -12),
            plant[1] - 15 - i * 10,
            32,
            15,
          );
        }
        const hotspot = (name: string, x: number, y: number) => {
          const dot = this.add
            .circle(x, y, 8, 0xe5ba73)
            .setStrokeStyle(5, 0xe5ba73, 0.14)
            .setInteractive({ useHandCursor: true });
          dot.on("pointerdown", () => callback.current(name));
        };
        this.add
          .zone(monitor[0] + 40, monitor[1] + 49, 90, 106)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => callback.current("computer"));
        hotspot("computer", monitor[0] + 40, monitor[1] + 55);
        const phone = iso(5.5, 3.45, 88);
        hotspot("phone", phone[0], phone[1]);
        hotspot("router", r[0] + 8, r[1]);
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: 880,
      height: 650,
      backgroundColor: "#152e3d",
      transparent: true,
      scene: Room,
      render: { antialias: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      audio: { noAudio: true },
      banner: false,
    });
    return () => game.destroy(true);
  }, []);
  return (
    <div
      ref={host}
      className="office-canvas"
      role="img"
      aria-label="Laboratorio isométrico con computador, teléfono y router. Usa los botones de dispositivos para explorar con el teclado."
    />
  );
}
