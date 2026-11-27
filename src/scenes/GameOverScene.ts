import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  Button,
  GlassPanel,
  DataTable,
  ScrollFrame,
  createStarfield,
  getLayout,
  AdviserPanel,
  attachReflowHandler,
} from "../ui/index.ts";
import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeT } from "../data/types.ts";
import {
  calculateScore,
  saveHighScore,
  getHighScores,
  getGameOutcome,
  rankCompanies,
} from "../game/scoring/ScoreCalculator.ts";
import type { GameOutcome } from "../game/scoring/ScoreCalculator.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { buildRevealMessages } from "../game/adviser/AdviserEngine.ts";
import { CARGO_DIVERSITY_BONUS } from "../data/constants.ts";
import {
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../game/tech/TechEffects.ts";
import { getCapacityCostForScope } from "../game/fleet/CapacityManager.ts";
import { getRouteScope } from "../game/routes/RouteManager.ts";

function formatCash(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amount));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

const SCORE_PANEL_WIDTH = 520;
const SCORE_PANEL_HEIGHT = 240;
const HS_PANEL_WIDTH = 520;
const HS_PANEL_HEIGHT = 240;
const HS_PANEL_X_OFFSET = 540;
const RANK_PANEL_HEIGHT = 240;
const RANK_PANEL_Y_OFFSET = 340;
const RANK_HEADER_HEIGHT = 22;
const BTN_WIDTH = 180;
const BTN_HEIGHT = 48;
const BTN_BOTTOM_GAP = 56;
const REVEAL_PANEL_WIDTH = 220;
const REVEAL_TAB_WIDTH = 36; // mirrors AdviserPanel TAB_WIDTH

export class GameOverScene extends Phaser.Scene {
  private heading!: Label;
  private subtitle!: Label;
  private scorePanel!: GlassPanel;
  private scoreRowLabels: Phaser.GameObjects.Text[] = [];
  private scoreRowValues: Phaser.GameObjects.Text[] = [];
  private scoreSeparator!: Phaser.GameObjects.Rectangle;
  private totalLabel!: Phaser.GameObjects.Text;
  private totalValue!: Phaser.GameObjects.Text;
  private hsPanel!: GlassPanel;
  private hsTableFrame!: ScrollFrame;
  private hsTable!: DataTable;
  private rankPanel!: GlassPanel;
  private rankHeaderLabels: Phaser.GameObjects.Text[] = [];
  private rankRowViews: Array<{
    highlight: Phaser.GameObjects.Rectangle;
    texts: Phaser.GameObjects.Text[];
  }> = [];
  private outcome!: GameOutcome;
  private playerRankText: Phaser.GameObjects.Text | null = null;
  private playAgainButton!: Button;
  private mainMenuButton!: Button;
  private revealPanel: AdviserPanel | null = null;

  constructor() {
    super({ key: "GameOverScene" });
  }

  /** QA hook: the rendered outcome, verified against the pure function. */
  getDisplayedOutcome(): {
    outcome: GameOutcome;
    heading: string;
    subtitle: string;
    playerRow: string | null;
  } {
    return {
      outcome: this.outcome,
      heading: this.heading.text,
      subtitle: this.subtitle.text,
      playerRow: this.playerRankText?.text ?? null,
    };
  }

  create(): void {
    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    getAudioDirector().setMusicState("gameover");
    // Scene instances are reused across restarts; avoid stale row objects.
    this.scoreRowLabels = [];
    this.scoreRowValues = [];

    // Stop the HUD scene since the game is over
    this.scene.stop("GameHUDScene");

    // Starfield background
    createStarfield(this);

    // -----------------------------------------------------------------------
    // Win / Lose heading with glow
    // -----------------------------------------------------------------------
    const outcome = getGameOutcome(state);
    this.outcome = outcome;
    const headingText = outcome.label;
    const headingColor =
      outcome.kind === "victory"
        ? theme.colors.profit
        : outcome.kind === "bankruptcy"
          ? theme.colors.loss
          : theme.colors.accent;

    this.heading = new Label(this, {
      x: L.gameWidth / 2,
      y: L.contentTop + 10,
      text: headingText,
      style: "heading",
      color: headingColor,
      glow: true,
    });
    this.heading.setOrigin(0.5, 0.5);
    this.heading.setFontSize(48);
    this.heading.setStroke("#000000", 3);

    // Subtitle
    const subtitleText =
      outcome.kind === "victory"
        ? `Congratulations, ${state.companyName}! You finished #1 of ${outcome.of} companies.`
        : outcome.kind === "placed"
          ? `${state.companyName}, you finished #${outcome.rank} of ${outcome.of} companies — the top spot is still within reach.`
          : `${state.companyName} has gone bankrupt after ${state.turn - 1} turns.`;
    this.subtitle = new Label(this, {
      x: L.gameWidth / 2,
      y: L.contentTop + 60,
      text: subtitleText,
      style: "body",
      color: theme.colors.text,
      maxWidth: L.gameWidth - 80,
    });
    this.subtitle.setOrigin(0.5, 0);

    // -----------------------------------------------------------------------
    // Score calculation and breakdown
    // -----------------------------------------------------------------------
    const finalScore = calculateScore(state);

    // Compute breakdown components. Fleet ships have been replaced by a
    // capacity-pool model — use researched freight + passenger capacity above
    // the base (4 each) as the "infrastructure value" proxy in net worth.
    const capacityValue =
      (getTotalFreightCapacity(state.tech) - 4) * 5000 +
      (getTotalPassengerCapacity(state.tech) - 4) * 5000;
    const loanBalance = state.loans.reduce(
      (sum, loan) => sum + loan.remainingBalance,
      0,
    );
    const netWorth = state.cash + capacityValue - loanBalance;
    const reputationBonus = state.reputation * 100;

    const allCargoTypes: CargoTypeT[] = Object.values(CargoType);
    let totalCargoDelivered = 0;
    const cargoTypeTotals = new Set<CargoTypeT>();
    for (const turnResult of state.history) {
      for (const ct of allCargoTypes) {
        const amount = turnResult.cargoDelivered[ct] ?? 0;
        totalCargoDelivered += amount;
        if (amount > 0) cargoTypeTotals.add(ct);
      }
    }
    const cargoBonus = totalCargoDelivered * 0.5;
    const diversityBonus = cargoTypeTotals.size * CARGO_DIVERSITY_BONUS;
    const routeBonus = state.activeRoutes.length * 500;

    // Empire bonus: count distinct empires the player trades with
    const empireIds = new Set<string>();
    for (const route of state.activeRoutes) {
      for (const sys of state.galaxy.systems) {
        if (
          route.originPlanetId.startsWith(
            `planet-${sys.id.replace("system-", "")}-`,
          ) ||
          route.destinationPlanetId.startsWith(
            `planet-${sys.id.replace("system-", "")}-`,
          )
        ) {
          empireIds.add(sys.empireId);
        }
      }
    }
    const empireBonus = empireIds.size * 1000;

    // -----------------------------------------------------------------------
    // Score breakdown panel (left side, glass panel)
    // -----------------------------------------------------------------------
    this.scorePanel = new GlassPanel(this, {
      x: L.fullContentLeft,
      y: L.contentTop + 90,
      width: SCORE_PANEL_WIDTH,
      height: SCORE_PANEL_HEIGHT,
      title: "Score Breakdown",
    });

    const breakdownRows: Array<{
      label: string;
      value: string;
      color: number;
    }> = [
      {
        label: "Net Worth",
        value: formatCash(netWorth),
        color: netWorth >= 0 ? theme.colors.profit : theme.colors.loss,
      },
      {
        label: "Reputation Bonus",
        value: `+${Math.round(reputationBonus).toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: "Cargo Bonus",
        value: `+${Math.round(cargoBonus).toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: `Diversity Bonus (${cargoTypeTotals.size} types)`,
        value: `+${diversityBonus.toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: "Route Bonus",
        value: `+${routeBonus.toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: "Empire Bonus",
        value: `+${empireBonus.toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
    ];

    for (const row of breakdownRows) {
      const labelText = this.add.text(0, 0, row.label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      this.scorePanel.add(labelText);
      this.scoreRowLabels.push(labelText);

      const valueText = this.add
        .text(0, 0, row.value, {
          fontSize: `${theme.fonts.value.size}px`,
          fontFamily: theme.fonts.value.family,
          color: colorToString(row.color),
        })
        .setOrigin(1, 0);
      this.scorePanel.add(valueText);
      this.scoreRowValues.push(valueText);
    }

    // Separator
    this.scoreSeparator = this.add
      .rectangle(0, 0, 1, 1, theme.colors.panelBorder)
      .setOrigin(0, 0);
    this.scorePanel.add(this.scoreSeparator);

    // Total score
    this.totalLabel = this.add.text(0, 0, "TOTAL SCORE", {
      fontSize: `${theme.fonts.heading.size}px`,
      fontFamily: theme.fonts.heading.family,
      color: colorToString(theme.colors.text),
    });
    this.scorePanel.add(this.totalLabel);

    this.totalValue = this.add
      .text(0, 0, "0", {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
      })
      .setOrigin(1, 0);
    this.scorePanel.add(this.totalValue);

    // Animate score counter rolling up
    const scoreCounter = { value: 0 };
    this.tweens.add({
      targets: scoreCounter,
      value: finalScore,
      duration: 1200,
      delay: 400,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.totalValue.setText(
          Math.round(scoreCounter.value).toLocaleString("en-US"),
        );
      },
      onComplete: () => {
        this.totalValue.setText(finalScore.toLocaleString("en-US"));
        this.tweens.add({
          targets: this.totalValue,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 150,
          yoyo: true,
          ease: "Back.easeOut",
        });
      },
    });

    // -----------------------------------------------------------------------
    // Save high score
    // -----------------------------------------------------------------------
    saveHighScore(state.companyName, finalScore, state.seed);

    // -----------------------------------------------------------------------
    // High score table (right side, glass panel)
    // -----------------------------------------------------------------------
    const hsPanelX = L.fullContentLeft + HS_PANEL_X_OFFSET;
    const hsPanelY = L.contentTop + 90;

    this.hsPanel = new GlassPanel(this, {
      x: hsPanelX,
      y: hsPanelY,
      width: HS_PANEL_WIDTH,
      height: HS_PANEL_HEIGHT,
      title: "High Scores",
    });

    const highScores = getHighScores();

    this.hsTableFrame = new ScrollFrame(this, {
      x: hsPanelX + 10,
      y: hsPanelY + 34,
      width: HS_PANEL_WIDTH - 20,
      height: HS_PANEL_HEIGHT - 44,
    });
    this.hsTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: HS_PANEL_WIDTH - 20,
      height: HS_PANEL_HEIGHT - 50,
      contentSized: true,
      columns: [
        {
          key: "rank",
          label: "#",
          width: 50,
          align: "center",
        },
        {
          key: "name",
          label: "Name",
          width: 200,
        },
        {
          key: "score",
          label: "Score",
          width: 140,
          align: "right",
          format: (v) => (v as number).toLocaleString("en-US"),
          colorFn: () => theme.colors.accent,
        },
        {
          key: "seed",
          label: "Seed",
          width: 110,
          align: "right",
        },
      ],
    });

    const hsRows = highScores.map((hs, index) => ({
      rank: index + 1,
      name: hs.name,
      score: hs.score,
      seed: hs.seed,
    }));
    this.hsTableFrame.setContent(this.hsTable);
    this.hsTable.setRows(hsRows);

    // -----------------------------------------------------------------------
    // Company Rankings panel — all companies (including the player) in a
    // compact, non-scrolling table so no row is clipped at 1280x720.
    // -----------------------------------------------------------------------
    const rankings = rankCompanies(state);
    const rankPanelY = L.contentTop + RANK_PANEL_Y_OFFSET;
    // Reserve the right-hand strip for the closed adviser drawer so an open
    // Rex reveal never overlaps the rankings table or the action buttons.
    const rankPanelWidth =
      hsPanelX +
      HS_PANEL_WIDTH -
      L.fullContentLeft -
      REVEAL_PANEL_WIDTH -
      REVEAL_TAB_WIDTH -
      24;
    this.rankPanel = new GlassPanel(this, {
      x: L.fullContentLeft,
      y: rankPanelY,
      width: rankPanelWidth,
      height: RANK_PANEL_HEIGHT,
      title: "Company Rankings",
    });
    this.rankHeaderLabels = [];
    this.rankRowViews = [];
    this.playerRankText = null;

    // Build a per-company usedCapacity map by summing scope costs across
    // each company's active routes.
    const usedCapacityByName = new Map<string, number>();
    let playerUsed = 0;
    for (const route of state.activeRoutes) {
      playerUsed += getCapacityCostForScope(getRouteScope(route, state));
    }
    usedCapacityByName.set(state.companyName, playerUsed);
    for (const ai of state.aiCompanies) {
      let used = 0;
      for (const route of ai.activeRoutes) {
        used += getCapacityCostForScope(getRouteScope(route, state));
      }
      usedCapacityByName.set(ai.name, used);
    }

    const innerWidth = rankPanelWidth - 24;
    const colFractions = [0.06, 0.28, 0.18, 0.14, 0.12, 0.22];
    const colWidths = colFractions.map((f) => innerWidth * f);
    const colXs: number[] = [];
    let cursor = L.fullContentLeft + 12;
    for (const w of colWidths) {
      colXs.push(cursor);
      cursor += w;
    }
    const headers = [
      "#",
      "Company",
      "Net Worth",
      "Capacity",
      "Routes",
      "Score",
    ];
    for (let i = 0; i < headers.length; i++) {
      const label = this.add.text(
        i === 1 ? colXs[i] + 8 : colXs[i] + colWidths[i] - 8,
        rankPanelY + 30 + RANK_HEADER_HEIGHT / 2,
        headers[i],
        {
          fontFamily: theme.fonts.body.family,
          fontSize: `${theme.fonts.body.size - 2}px`,
          color: colorToString(theme.colors.accent),
        },
      );
      label.setOrigin(i === 1 ? 0 : 1, 0.5);
      this.rankHeaderLabels.push(label);
    }

    const rowHeight = 24;
    const rowStartY = rankPanelY + 30 + RANK_HEADER_HEIGHT + 12;
    rankings.forEach((r, index) => {
      const rowY = rowStartY + index * rowHeight + rowHeight / 2;
      const highlight = this.add.rectangle(
        L.fullContentLeft + 12 + innerWidth / 2,
        rowY,
        innerWidth,
        rowHeight - 2,
        r.isPlayer ? theme.colors.accent : theme.colors.rowEven,
        r.isPlayer ? 0.26 : index % 2 === 0 ? 0.12 : 0.06,
      );
      if (r.isPlayer) {
        highlight.setStrokeStyle(1, theme.colors.accent, 0.9);
      }
      const values = [
        String(r.rank),
        r.isPlayer ? `${r.name} (You)` : r.name,
        formatCash(r.netWorth),
        String(usedCapacityByName.get(r.name) ?? 0),
        String(r.routeCount),
        r.score.toLocaleString("en-US"),
      ];
      const texts = values.map((value, i) => {
        const text = this.add.text(
          i === 1 ? colXs[i] + 8 : colXs[i] + colWidths[i] - 8,
          rowY,
          value,
          {
            fontFamily: theme.fonts.body.family,
            fontSize: `${theme.fonts.body.size - 1}px`,
            color: colorToString(
              i === 1 && r.isPlayer
                ? theme.colors.accent
                : i === 2
                  ? r.netWorth >= 0
                    ? theme.colors.profit
                    : theme.colors.loss
                  : theme.colors.text,
            ),
          },
        );
        text.setOrigin(i === 1 ? 0 : 1, 0.5);
        if (i === 1 && r.isPlayer) {
          this.playerRankText = text;
        }
        return text;
      });
      this.rankRowViews.push({ highlight, texts });
    });

    // -----------------------------------------------------------------------
    // Action buttons — centered horizontally below panels
    // -----------------------------------------------------------------------
    const btnY = L.contentTop + L.contentHeight - BTN_BOTTOM_GAP;

    // -----------------------------------------------------------------------
    // Rex's Reveal — anchored in the reserved right-hand strip beside the
    // rankings table, so opening the drawer cannot cover any ranked row.
    // -----------------------------------------------------------------------
    if (state.adviser && !state.adviser.secretRevealed) {
      const revealMsgs = buildRevealMessages(state);
      if (revealMsgs.length > 0) {
        const revealX = L.fullContentLeft + rankPanelWidth + 12;
        const revealY = rankPanelY + 8;
        this.revealPanel = new AdviserPanel(this, {
          x: revealX,
          y: revealY,
          width: REVEAL_PANEL_WIDTH,
        });
        this.revealPanel.setDepth(150);
        this.revealPanel.showMessages(revealMsgs);
        gameStore.update({
          adviser: { ...state.adviser, secretRevealed: true },
        });
      }
    }

    this.playAgainButton = new Button(this, {
      x: L.gameWidth / 2 - BTN_WIDTH - 20,
      y: btnY,
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      label: "Play Again",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    this.mainMenuButton = new Button(this, {
      x: L.gameWidth / 2 + 20,
      y: btnY,
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      label: "Main Menu",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();

    // Heading + subtitle
    this.heading.setPosition(L.gameWidth / 2, L.contentTop + 10);
    this.subtitle.setPosition(L.gameWidth / 2, L.contentTop + 60);
    this.subtitle.setWordWrapWidth(L.gameWidth - 80);

    // Score breakdown panel
    this.scorePanel.setPosition(L.fullContentLeft, L.contentTop + 90);
    this.scorePanel.setSize(SCORE_PANEL_WIDTH, SCORE_PANEL_HEIGHT);
    const spContent = this.scorePanel.getContentArea();

    let rowY = spContent.y + 4;
    for (let i = 0; i < this.scoreRowLabels.length; i++) {
      this.scoreRowLabels[i]!.setPosition(spContent.x + 8, rowY);
      this.scoreRowValues[i]!.setPosition(
        spContent.x + spContent.width - 8,
        rowY,
      );
      rowY += 26;
    }

    // Separator
    this.scoreSeparator.setPosition(spContent.x + 8, rowY + 4);
    this.scoreSeparator.setSize(spContent.width - 16, 1);
    rowY += 12;

    // Total
    this.totalLabel.setPosition(spContent.x + 8, rowY);
    this.totalValue.setPosition(spContent.x + spContent.width - 8, rowY);

    // High score panel
    const hsPanelX = L.fullContentLeft + HS_PANEL_X_OFFSET;
    const hsPanelY = L.contentTop + 90;
    this.hsPanel.setPosition(hsPanelX, hsPanelY);
    this.hsPanel.setSize(HS_PANEL_WIDTH, HS_PANEL_HEIGHT);

    this.hsTableFrame.setPosition(hsPanelX + 10, hsPanelY + 34);
    this.hsTableFrame.setSize(HS_PANEL_WIDTH - 20, HS_PANEL_HEIGHT - 44);
    this.hsTable.setSize(HS_PANEL_WIDTH - 20, HS_PANEL_HEIGHT - 44);

    // Rankings panel
    const rankPanelY = L.contentTop + RANK_PANEL_Y_OFFSET;
    const rankPanelWidth =
      hsPanelX +
      HS_PANEL_WIDTH -
      L.fullContentLeft -
      REVEAL_PANEL_WIDTH -
      REVEAL_TAB_WIDTH -
      24;
    this.rankPanel.setPosition(L.fullContentLeft, rankPanelY);
    this.rankPanel.setSize(rankPanelWidth, RANK_PANEL_HEIGHT);

    const innerWidth = rankPanelWidth - 24;
    const colWidths = [0.06, 0.28, 0.18, 0.14, 0.12, 0.22].map(
      (f) => innerWidth * f,
    );
    const colXs: number[] = [];
    let cursor = L.fullContentLeft + 12;
    for (const w of colWidths) {
      colXs.push(cursor);
      cursor += w;
    }
    const headerY = rankPanelY + 30 + RANK_HEADER_HEIGHT / 2;
    this.rankHeaderLabels.forEach((label, i) => {
      label.setPosition(
        i === 1 ? colXs[i] + 8 : colXs[i] + colWidths[i] - 8,
        headerY,
      );
    });
    const rowStartY = rankPanelY + 30 + RANK_HEADER_HEIGHT + 12;
    const rowHeight = 24;
    this.rankRowViews.forEach((view, index) => {
      const rowY = rowStartY + index * rowHeight + rowHeight / 2;
      view.highlight.setPosition(L.fullContentLeft + 12 + innerWidth / 2, rowY);
      view.highlight.setSize(innerWidth, rowHeight - 2);
      view.texts.forEach((text, i) => {
        text.setPosition(
          i === 1 ? colXs[i] + 8 : colXs[i] + colWidths[i] - 8,
          rowY,
        );
      });
    });

    // Action buttons
    const btnY = L.contentTop + L.contentHeight - BTN_BOTTOM_GAP;
    this.playAgainButton.setPosition(L.gameWidth / 2 - BTN_WIDTH - 20, btnY);
    this.mainMenuButton.setPosition(L.gameWidth / 2 + 20, btnY);

    // Adviser reveal panel — reposition + reflow internal width. Pass
    // height=0 to keep AdviserPanel's content-driven internal panelHeight.
    if (this.revealPanel) {
      const revealX = L.fullContentLeft + rankPanelWidth + 12;
      const revealY = rankPanelY + 8;
      this.revealPanel.setPosition(revealX, revealY);
      this.revealPanel.setSize(REVEAL_PANEL_WIDTH, 0);
    }
  }
}
