import Phaser from "phaser";
import { getTheme } from "./Theme.ts";
import { SIDEBAR_WIDTH, CONTENT_HEIGHT } from "./Layout.ts";
import { Label } from "./Label.ts";
import { drawPortrait } from "./PortraitGenerator.ts";
import type { PortraitType } from "./PortraitGenerator.ts";

export interface PortraitStat {
  label: string;
  value: string;
  color?: number;
}

export interface PortraitPanelConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  portraitType: PortraitType;
  seed: number;
  name: string;
  stats?: PortraitStat[];
  data?: Record<string, unknown>;
}

export class PortraitPanel extends Phaser.GameObjects.Container {
  private panelWidth: number;
  private panelHeight: number;
  private portraitGraphics: Phaser.GameObjects.Graphics;
  private portraitHeight: number;
  private nameLabel: Label;
  private statLabels: Label[] = [];
  private valueLabels: Label[] = [];

  constructor(scene: Phaser.Scene, config: PortraitPanelConfig) {
    super(scene, config.x, config.y);

    const theme = getTheme();
    this.panelWidth = config.width ?? SIDEBAR_WIDTH;
    this.panelHeight = config.height ?? CONTENT_HEIGHT;
    this.portraitHeight = Math.floor(this.panelHeight * 0.55);

    // Glass panel background (NineSlice)
    const bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        this.panelWidth,
        this.panelHeight,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0);
    this.add(bg);

    // Portrait graphics object — created once, reused on update
    this.portraitGraphics = scene.add.graphics();
    this.add(this.portraitGraphics);

    // Geometry mask to clip portrait to panel bounds
    const maskShape = scene.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(config.x, config.y, this.panelWidth, this.portraitHeight);
    const mask = new Phaser.Display.Masks.GeometryMask(scene, maskShape);
    this.portraitGraphics.setMask(mask);

    // Name label — below portrait, centered
    const nameLabelY = this.portraitHeight + theme.spacing.sm;
    this.nameLabel = new Label(scene, {
      x: this.panelWidth / 2,
      y: nameLabelY,
      text: config.name,
      style: "heading",
      color: theme.colors.accent,
      maxWidth: this.panelWidth - theme.spacing.md * 2,
    });
    this.nameLabel.setOrigin(0.5, 0);
    this.add(this.nameLabel);

    // Draw initial portrait
    this.drawCurrentPortrait(config.portraitType, config.seed, config.data);

    // Draw initial stats
    if (config.stats) {
      this.createStatRows(config.stats);
    }

    scene.add.existing(this);
  }

  updatePortrait(
    type: PortraitType,
    seed: number,
    name: string,
    stats?: PortraitStat[],
    data?: Record<string, unknown>,
  ): void {
    const theme = getTheme();

    // Clear and redraw portrait
    this.drawCurrentPortrait(type, seed, data);

    // Update name
    this.nameLabel.setText(name);
    this.nameLabel.setLabelColor(theme.colors.accent);

    // Clear old stat rows
    this.clearStatRows();

    // Create new stat rows
    if (stats) {
      this.createStatRows(stats);
    }
  }

  private drawCurrentPortrait(
    type: PortraitType,
    seed: number,
    data?: Record<string, unknown>,
  ): void {
    this.portraitGraphics.clear();
    drawPortrait(
      this.portraitGraphics,
      type,
      this.panelWidth,
      this.portraitHeight,
      seed,
      data,
    );
  }

  private createStatRows(stats: PortraitStat[]): void {
    const theme = getTheme();
    const startY =
      this.portraitHeight +
      theme.spacing.sm +
      theme.fonts.heading.size +
      theme.spacing.md;
    const rowSpacing = 24;
    const leftX = theme.spacing.md;
    const rightX = this.panelWidth - theme.spacing.md;

    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      const rowY = startY + i * rowSpacing;

      // Label (left-aligned, caption style, textDim)
      const labelObj = new Label(this.scene, {
        x: leftX,
        y: rowY,
        text: stat.label,
        style: "caption",
        color: theme.colors.textDim,
      });
      this.add(labelObj);
      this.statLabels.push(labelObj);

      // Value (right-aligned, value style)
      const valueColor = stat.color ?? theme.colors.text;
      const valueObj = new Label(this.scene, {
        x: rightX,
        y: rowY,
        text: stat.value,
        style: "value",
        color: valueColor,
      });
      valueObj.setOrigin(1, 0);
      this.add(valueObj);
      this.valueLabels.push(valueObj);
    }
  }

  private clearStatRows(): void {
    for (const label of this.statLabels) {
      label.destroy();
    }
    for (const label of this.valueLabels) {
      label.destroy();
    }
    this.statLabels = [];
    this.valueLabels = [];
  }
}
