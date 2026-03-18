import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeValue } from "../data/types.ts";
import { BASE_CARGO_PRICES } from "../data/constants.ts";
import { getTheme } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { DataTable } from "../ui/DataTable.ts";

const HUD_TOP = 60;

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

const CARGO_TYPE_VALUES = Object.values(CargoType) as CargoTypeValue[];

export class MarketScene extends Phaser.Scene {
  constructor() {
    super({ key: "MarketScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();

    // Title
    new Label(this, {
      x: 20,
      y: HUD_TOP + 10,
      text: "Galaxy Market Overview",
      style: "heading",
      color: theme.colors.accent,
    });

    // Fuel price display
    const fuelTrendStr = trendArrow(state.market.fuelTrend);
    new Label(this, {
      x: 800,
      y: HUD_TOP + 10,
      text: `Fuel Price: ${formatCash(state.market.fuelPrice)} ${fuelTrendStr}`,
      style: "value",
      color: theme.colors.accent,
    });

    // Build columns: Planet, Type, then one per cargo type
    const columns = [
      { key: "planet", label: "Planet", width: 140, sortable: true },
      { key: "type", label: "Type", width: 110, sortable: true },
    ];

    for (const ct of CARGO_TYPE_VALUES) {
      columns.push({
        key: ct,
        label: ct.charAt(0).toUpperCase() + ct.slice(1),
        width: Math.floor(990 / CARGO_TYPE_VALUES.length),
        sortable: true,
      });
    }

    // Build column definitions with formatting
    const columnDefs = columns.map((col) => {
      if (col.key === "planet" || col.key === "type") {
        return col;
      }

      const cargoKey = col.key as CargoTypeValue;
      const basePrice = BASE_CARGO_PRICES[cargoKey];

      return {
        ...col,
        align: "right" as const,
        format: (v: unknown) => {
          if (v == null) return "\u2014";
          return formatCash(v as number);
        },
        colorFn: (v: unknown) => {
          if (v == null) return theme.colors.textDim;
          const price = v as number;
          if (price > basePrice * 1.2) return theme.colors.profit;
          return theme.colors.text;
        },
      };
    });

    const table = new DataTable(this, {
      x: 20,
      y: HUD_TOP + 55,
      width: 1240,
      height: 520,
      columns: columnDefs,
    });

    // Build rows
    const rows: Record<string, unknown>[] = [];
    for (const planet of state.galaxy.planets) {
      const planetMarket = state.market.planetMarkets[planet.id];
      const row: Record<string, unknown> = {
        planet: planet.name,
        type: planet.type,
      };

      for (const ct of CARGO_TYPE_VALUES) {
        if (planetMarket) {
          const entry = planetMarket[ct];
          row[ct] = entry.currentPrice;
        } else {
          row[ct] = null;
        }
      }

      rows.push(row);
    }

    table.setRows(rows);
  }
}
