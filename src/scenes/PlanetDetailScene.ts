import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type { Planet, CargoMarketEntry } from "../data/types.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Panel } from "../ui/Panel.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { DataTable } from "../ui/DataTable.ts";
import { ScrollableList } from "../ui/ScrollableList.ts";
import { Modal } from "../ui/Modal.ts";
import { calculateDistance, createRoute } from "../game/routes/RouteManager.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

function trendArrow(trend: string): string {
  if (trend === "rising") return "\u25B2";
  if (trend === "falling") return "\u25BC";
  return "\u2500";
}

function trendColor(trend: string): number {
  const theme = getTheme();
  if (trend === "rising") return theme.colors.profit;
  if (trend === "falling") return theme.colors.loss;
  return theme.colors.text;
}

const CARGO_TYPE_VALUES = Object.values(CargoType) as CargoType[];

export class PlanetDetailScene extends Phaser.Scene {
  private planetId = "";

  constructor() {
    super({ key: "PlanetDetailScene" });
  }

  init(data: { planetId: string }): void {
    this.planetId = data.planetId;
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const planet = state.galaxy.planets.find((p) => p.id === this.planetId);
    if (!planet) return;

    const planetMarket = state.market.planetMarkets[this.planetId];

    // Overlay background
    this.add
      .rectangle(0, 0, 1280, 720, theme.colors.modalOverlay, 0.6)
      .setOrigin(0, 0)
      .setInteractive();

    // Main panel
    const panelW = 800;
    const panelH = 580;
    const panelX = (1280 - panelW) / 2;
    const panelY = (720 - panelH) / 2;

    const panel = new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: planet.name,
    });

    const contentArea = panel.getContentArea();

    // Planet info
    new Label(this, {
      x: panelX + contentArea.x,
      y: panelY + contentArea.y,
      text: `Type: ${planet.type}  |  Population: ${planet.population.toLocaleString("en-US")}`,
      style: "body",
    });

    // Market data table
    const tableY = panelY + contentArea.y + 35;
    const table = new DataTable(this, {
      x: panelX + contentArea.x,
      y: tableY,
      width: contentArea.width,
      height: 320,
      columns: [
        { key: "cargoType", label: "Cargo Type", width: 130, sortable: true },
        {
          key: "supply",
          label: "Supply",
          width: 90,
          align: "right",
          sortable: true,
          format: (v) => String(Math.round(v as number)),
        },
        {
          key: "demand",
          label: "Demand",
          width: 90,
          align: "right",
          sortable: true,
          format: (v) => String(Math.round(v as number)),
        },
        {
          key: "price",
          label: "Price",
          width: 110,
          align: "right",
          sortable: true,
          format: (v) => formatCash(v as number),
        },
        {
          key: "trend",
          label: "Trend",
          width: 80,
          align: "center",
          format: (v) => trendArrow(v as string),
          colorFn: (v) => trendColor(v as string),
        },
        {
          key: "saturation",
          label: "Saturation",
          width: 100,
          align: "right",
          format: (v) => `${Math.round((v as number) * 100)}%`,
        },
      ],
    });

    // Build rows from market data
    if (planetMarket) {
      const rows = CARGO_TYPE_VALUES.map((ct) => {
        const entry: CargoMarketEntry = planetMarket[ct];
        return {
          cargoType: ct,
          supply: entry.baseSupply,
          demand: entry.baseDemand,
          price: entry.currentPrice,
          trend: entry.trend,
          saturation: entry.saturation,
        };
      });
      table.setRows(rows);
    }

    // Buttons row
    const buttonY = panelY + panelH - 60;

    // Create Route button
    new Button(this, {
      x: panelX + contentArea.x,
      y: buttonY,
      width: 150,
      label: "Create Route",
      onClick: () => {
        this.showDestinationPicker(planet);
      },
    });

    // Close button
    new Button(this, {
      x: panelX + panelW - contentArea.x - 120,
      y: buttonY,
      width: 120,
      label: "Close",
      onClick: () => {
        this.closeOverlay();
      },
    });
  }

  private showDestinationPicker(originPlanet: Planet): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const otherPlanets = state.galaxy.planets.filter(
      (p) => p.id !== originPlanet.id,
    );

    // Overlay for destination picker
    const overlay = this.add
      .rectangle(0, 0, 1280, 720, theme.colors.modalOverlay, 0.5)
      .setOrigin(0, 0)
      .setInteractive();

    const listW = 400;
    const listH = 450;
    const listX = (1280 - listW) / 2;
    const listY = (720 - listH) / 2;

    const pickerPanel = new Panel(this, {
      x: listX,
      y: listY,
      width: listW,
      height: listH,
      title: "Select Destination",
    });

    const pickerContent = pickerPanel.getContentArea();

    const list = new ScrollableList(this, {
      x: listX + pickerContent.x,
      y: listY + pickerContent.y,
      width: pickerContent.width,
      height: pickerContent.height - 50,
      itemHeight: 36,
      onSelect: (index: number) => {
        const destPlanet = otherPlanets[index];
        if (!destPlanet) return;

        // Calculate distance
        const freshState = gameStore.getState();
        const distance = calculateDistance(
          originPlanet,
          destPlanet,
          freshState.galaxy.systems,
        );

        // Create the route
        const route = createRoute(
          originPlanet.id,
          destPlanet.id,
          distance,
          null,
        );

        // Update state
        gameStore.update({
          activeRoutes: [...freshState.activeRoutes, route],
        });

        // Clean up picker
        overlay.destroy();
        pickerPanel.destroy();
        list.destroy();

        // Show confirmation
        const modal = new Modal(this, {
          title: "Route Created",
          body: `Route from ${originPlanet.name} to ${destPlanet.name} created.\nDistance: ${distance.toFixed(1)} units.\nAssign ships and cargo in the Routes scene.`,
          onOk: () => {
            modal.destroy();
          },
        });
        modal.show();
      },
    });

    // Populate the list
    for (const p of otherPlanets) {
      const itemContainer = this.add.container(0, 0);
      const itemText = this.add.text(10, 8, `${p.name} (${p.type})`, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      itemContainer.add(itemText);
      list.addItem(itemContainer);
    }
  }

  private closeOverlay(): void {
    // Resume the previous scene and stop this one
    const scenes = this.scene.manager.getScenes(false);
    for (const s of scenes) {
      if (s.scene.key !== "PlanetDetailScene" && s.scene.isPaused()) {
        s.scene.resume();
      }
    }
    this.scene.stop();
  }
}
