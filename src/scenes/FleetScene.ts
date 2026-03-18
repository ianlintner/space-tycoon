import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { ShipClass } from "../data/types.ts";
import type { Ship, ShipClass as ShipClassType } from "../data/types.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { DataTable } from "../ui/DataTable.ts";
import { Modal } from "../ui/Modal.ts";
import { ScrollableList } from "../ui/ScrollableList.ts";
import { Panel } from "../ui/Panel.ts";
import {
  buyShip,
  sellShip,
  overhaulShip,
  calculateShipValue,
} from "../game/fleet/FleetManager.ts";

const HUD_TOP = 60;

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

function conditionColor(value: unknown): number {
  const cond = value as number;
  const theme = getTheme();
  if (cond > 70) return theme.colors.profit;
  if (cond >= 40) return theme.colors.warning;
  return theme.colors.loss;
}

export class FleetScene extends Phaser.Scene {
  private selectedShipId: string | null = null;
  private fleetTable!: DataTable;

  constructor() {
    super({ key: "FleetScene" });
  }

  create(): void {
    const theme = getTheme();
    this.selectedShipId = null;

    // Title
    new Label(this, {
      x: 20,
      y: HUD_TOP + 10,
      text: "Fleet Management",
      style: "heading",
      color: theme.colors.accent,
    });

    // Cash display
    const state = gameStore.getState();
    const cashLabel = new Label(this, {
      x: 1260,
      y: HUD_TOP + 10,
      text: `Cash: ${formatCash(state.cash)}`,
      style: "value",
      color: theme.colors.accent,
    });
    cashLabel.setOrigin(1, 0);

    // Fleet table
    this.fleetTable = new DataTable(this, {
      x: 20,
      y: HUD_TOP + 55,
      width: 1240,
      height: 420,
      columns: [
        { key: "name", label: "Name", width: 160, sortable: true },
        { key: "class", label: "Class", width: 140, sortable: true },
        {
          key: "cargo",
          label: "Cargo",
          width: 90,
          align: "right",
          sortable: true,
        },
        {
          key: "pax",
          label: "Pax",
          width: 80,
          align: "right",
          sortable: true,
        },
        {
          key: "speed",
          label: "Speed",
          width: 80,
          align: "right",
          sortable: true,
        },
        {
          key: "condition",
          label: "Condition",
          width: 110,
          align: "right",
          sortable: true,
          format: (v) => `${Math.round(v as number)}%`,
          colorFn: conditionColor,
        },
        { key: "route", label: "Route", width: 200, sortable: true },
        {
          key: "maintenance",
          label: "Maint.",
          width: 120,
          align: "right",
          sortable: true,
          format: (v) => formatCash(v as number),
        },
        {
          key: "value",
          label: "Value",
          width: 120,
          align: "right",
          format: (v) => formatCash(v as number),
        },
      ],
      onRowSelect: (_rowIndex, rowData) => {
        this.selectedShipId = rowData["id"] as string;
      },
    });

    this.refreshTable();

    // Buttons
    const buttonY = HUD_TOP + 490;

    new Button(this, {
      x: 20,
      y: buttonY,
      width: 130,
      label: "Buy Ship",
      onClick: () => this.showBuyShipPanel(),
    });

    new Button(this, {
      x: 170,
      y: buttonY,
      width: 130,
      label: "Sell Ship",
      onClick: () => this.confirmSellShip(),
    });

    new Button(this, {
      x: 320,
      y: buttonY,
      width: 130,
      label: "Overhaul",
      onClick: () => this.confirmOverhaul(),
    });
  }

  private refreshTable(): void {
    const state = gameStore.getState();
    const routeMap = new Map<string, string>();
    for (const route of state.activeRoutes) {
      const origin = state.galaxy.planets.find(
        (p) => p.id === route.originPlanetId,
      );
      const dest = state.galaxy.planets.find(
        (p) => p.id === route.destinationPlanetId,
      );
      const routeName =
        origin && dest ? `${origin.name} -> ${dest.name}` : route.id;
      routeMap.set(route.id, routeName);
    }

    const rows = state.fleet.map((ship: Ship) => ({
      id: ship.id,
      name: ship.name,
      class: ship.class,
      cargo: ship.cargoCapacity,
      pax: ship.passengerCapacity,
      speed: ship.speed,
      condition: ship.condition,
      route: ship.assignedRouteId
        ? (routeMap.get(ship.assignedRouteId) ?? "Assigned")
        : "Idle",
      maintenance: ship.maintenanceCost,
      value: calculateShipValue(ship),
    }));

    this.fleetTable.setRows(rows);
  }

  private showBuyShipPanel(): void {
    const theme = getTheme();
    const state = gameStore.getState();

    const overlay = this.add
      .rectangle(0, 0, 1280, 720, theme.colors.modalOverlay, 0.6)
      .setOrigin(0, 0)
      .setInteractive();

    const panelW = 600;
    const panelH = 500;
    const panelX = (1280 - panelW) / 2;
    const panelY = (720 - panelH) / 2;

    const buyPanel = new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "Buy Ship",
    });

    const content = buyPanel.getContentArea();

    const list = new ScrollableList(this, {
      x: panelX + content.x,
      y: panelY + content.y,
      width: content.width,
      height: content.height - 50,
      itemHeight: 48,
      onSelect: (index: number) => {
        const shipClasses = Object.values(ShipClass) as ShipClassType[];
        const selectedClass = shipClasses[index];
        if (!selectedClass) return;

        const template = SHIP_TEMPLATES[selectedClass];
        const freshState = gameStore.getState();

        if (freshState.cash < template.purchaseCost) {
          const errorModal = new Modal(this, {
            title: "Insufficient Funds",
            body: `You need ${formatCash(template.purchaseCost)} but only have ${formatCash(freshState.cash)}.`,
            onOk: () => {
              errorModal.destroy();
            },
          });
          errorModal.show();
          return;
        }

        const { ship, cost } = buyShip(selectedClass, freshState.fleet);
        gameStore.update({
          fleet: [...freshState.fleet, ship],
          cash: freshState.cash - cost,
        });

        // Clean up and refresh
        overlay.destroy();
        buyPanel.destroy();
        list.destroy();
        this.refreshTable();
      },
    });

    const shipClasses = Object.values(ShipClass) as ShipClassType[];
    for (const sc of shipClasses) {
      const template = SHIP_TEMPLATES[sc];
      const canAfford = state.cash >= template.purchaseCost;
      const itemContainer = this.add.container(0, 0);

      const nameText = this.add.text(10, 6, template.name, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(
          canAfford ? theme.colors.text : theme.colors.textDim,
        ),
      });

      const statsText = this.add.text(
        10,
        26,
        `Cargo: ${template.cargoCapacity}  Pax: ${template.passengerCapacity}  Spd: ${template.speed}  Cost: ${formatCash(template.purchaseCost)}`,
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        },
      );

      itemContainer.add([nameText, statsText]);
      list.addItem(itemContainer);
    }

    // Close button for buy panel
    new Button(this, {
      x: panelX + panelW - content.x - 100,
      y: panelY + panelH - 50,
      width: 100,
      label: "Close",
      onClick: () => {
        overlay.destroy();
        buyPanel.destroy();
        list.destroy();
      },
    });
  }

  private confirmSellShip(): void {
    if (!this.selectedShipId) {
      const noSelectModal = new Modal(this, {
        title: "No Ship Selected",
        body: "Please select a ship from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const state = gameStore.getState();
    const ship = state.fleet.find((s) => s.id === this.selectedShipId);
    if (!ship) return;

    const salePrice = calculateShipValue(ship);

    const modal = new Modal(this, {
      title: "Sell Ship",
      body: `Sell ${ship.name} for ${formatCash(salePrice)}?`,
      onOk: () => {
        const freshState = gameStore.getState();
        const { updatedFleet, salePrice: price } = sellShip(
          this.selectedShipId!,
          freshState.fleet,
        );
        gameStore.update({
          fleet: updatedFleet,
          cash: freshState.cash + price,
        });
        this.selectedShipId = null;
        modal.destroy();
        this.refreshTable();
      },
      onCancel: () => {
        modal.destroy();
      },
    });
    modal.show();
  }

  private confirmOverhaul(): void {
    if (!this.selectedShipId) {
      const noSelectModal = new Modal(this, {
        title: "No Ship Selected",
        body: "Please select a ship from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const state = gameStore.getState();
    const ship = state.fleet.find((s) => s.id === this.selectedShipId);
    if (!ship) return;

    const cost = ship.purchaseCost * 0.3;

    if (state.cash < cost) {
      const errorModal = new Modal(this, {
        title: "Insufficient Funds",
        body: `Overhaul costs ${formatCash(cost)} but you only have ${formatCash(state.cash)}.`,
        onOk: () => {
          errorModal.destroy();
        },
      });
      errorModal.show();
      return;
    }

    const modal = new Modal(this, {
      title: "Overhaul Ship",
      body: `Overhaul ${ship.name} for ${formatCash(cost)}? This will restore condition to 90%.`,
      onOk: () => {
        const freshState = gameStore.getState();
        const { updatedFleet, cost: overhaulCost } = overhaulShip(
          this.selectedShipId!,
          freshState.fleet,
        );
        gameStore.update({
          fleet: updatedFleet,
          cash: freshState.cash - overhaulCost,
        });
        modal.destroy();
        this.refreshTable();
      },
      onCancel: () => {
        modal.destroy();
      },
    });
    modal.show();
  }
}
