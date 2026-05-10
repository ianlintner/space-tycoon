import { GameEventEmitter } from "../../utils/EventEmitter.ts";
import type { LayerGroup, LayerId, MapLayer } from "./MapLayerRegistry.ts";
import { MAP_LAYERS } from "./MapLayerRegistry.ts";

const STORAGE_KEY = "spacebiz.mapLayers.v1";
const DEBOUNCE_MS = 200;

export class MapLayerController extends GameEventEmitter {
  private readonly visibility: Record<LayerId, boolean>;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.visibility = this.loadFromStorage();
  }

  isVisible(id: LayerId): boolean {
    return this.visibility[id];
  }

  toggle(id: LayerId): void {
    this.setVisible(id, !this.visibility[id]);
  }

  setVisible(id: LayerId, on: boolean): void {
    if (this.visibility[id] === on) return;
    this.visibility[id] = on;
    this.emit("change", id);
    this.scheduleSave();
  }

  getLayer(id: LayerId): MapLayer {
    return MAP_LAYERS.find((l) => l.id === id)!;
  }

  getLayersByGroup(group: LayerGroup): MapLayer[] {
    return MAP_LAYERS.filter((l) => l.group === group);
  }

  private loadFromStorage(): Record<LayerId, boolean> {
    const defaults = Object.fromEntries(
      MAP_LAYERS.map((l) => [l.id, l.defaultOn]),
    ) as Record<LayerId, boolean>;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw) as Partial<Record<LayerId, boolean>>;
      for (const [k, v] of Object.entries(saved)) {
        if (k in defaults && typeof v === "boolean") {
          defaults[k as LayerId] = v;
        }
      }
    } catch {
      // ignore parse errors or missing localStorage
    }
    return defaults;
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.visibility));
      } catch {
        // ignore quota errors
      }
    }, DEBOUNCE_MS);
  }
}

export const mapLayerController = new MapLayerController();
