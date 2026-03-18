import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./Layout.ts";

export interface StarfieldConfig {
  count?: number;
  drift?: boolean;
  depth?: number;
}

export function createStarfield(
  scene: Phaser.Scene,
  config?: StarfieldConfig,
): Phaser.GameObjects.Container {
  const count = config?.count ?? 120;
  const drift = config?.drift ?? true;
  const depth = config?.depth ?? -1;

  const container = new Phaser.GameObjects.Container(scene, 0, 0);
  container.setDepth(depth);

  const stars: Phaser.GameObjects.Arc[] = [];

  for (let i = 0; i < count; i++) {
    const x = Math.random() * GAME_WIDTH;
    const y = Math.random() * GAME_HEIGHT;
    const radius = 0.5 + Math.random() * 1.0;
    const alpha = 0.2 + Math.random() * 0.6;

    const star = new Phaser.GameObjects.Arc(scene, x, y, radius);
    star.setFillStyle(0xffffff, alpha);
    container.add(star);
    stars.push(star);
  }

  if (drift) {
    for (const star of stars) {
      if (Math.random() < 0.3) {
        const offset = 5 + Math.random() * 10;
        const duration = 30000 + Math.random() * 30000;
        scene.tweens.add({
          targets: star,
          x: star.x + (Math.random() < 0.5 ? offset : -offset),
          duration,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }
  }

  scene.add.existing(container);
  return container;
}
