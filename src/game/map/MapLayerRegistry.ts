export type LayerGroup =
  | "politics"
  | "geography"
  | "movement"
  | "economy"
  | "events";

export type LayerId =
  | "empire-names"
  | "empire-borders"
  | "company-names"
  | "systems"
  | "system-names"
  | "hyperlanes"
  | "ships"
  | "navies"
  | "import-goods"
  | "export-goods"
  | "space-events";

export interface MapLayer {
  id: LayerId;
  group: LayerGroup;
  label: string;
  iconIndex: number;
  defaultOn: boolean;
  implemented: boolean;
}

export const LAYER_GROUPS: LayerGroup[] = [
  "politics",
  "geography",
  "movement",
  "economy",
  "events",
];

export const GROUP_LABELS: Record<LayerGroup, string> = {
  politics: "Politics",
  geography: "Geography",
  movement: "Movement",
  economy: "Economy",
  events: "Events",
};

export const GROUP_ICON_INDICES: Record<LayerGroup, number> = {
  politics: 0,
  geography: 1,
  movement: 2,
  economy: 3,
  events: 4,
};

// Spritesheet indices 0-4 = group icons, 5-15 = layer icons (4×4 grid).
export const MAP_LAYERS: MapLayer[] = [
  // Politics (indices 5-7)
  {
    id: "empire-names",
    group: "politics",
    label: "Empire Names",
    iconIndex: 5,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "empire-borders",
    group: "politics",
    label: "Empire Borders",
    iconIndex: 6,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "company-names",
    group: "politics",
    label: "Companies",
    iconIndex: 7,
    defaultOn: false,
    implemented: false,
  },
  // Geography (indices 8-10)
  {
    id: "systems",
    group: "geography",
    label: "Systems",
    iconIndex: 8,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "system-names",
    group: "geography",
    label: "System Names",
    iconIndex: 9,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "hyperlanes",
    group: "geography",
    label: "Hyperlanes",
    iconIndex: 10,
    defaultOn: true,
    implemented: true,
  },
  // Movement (indices 11-12)
  {
    id: "ships",
    group: "movement",
    label: "Ships",
    iconIndex: 11,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "navies",
    group: "movement",
    label: "Navies",
    iconIndex: 12,
    defaultOn: false,
    implemented: false,
  },
  // Economy (indices 13-14)
  {
    id: "import-goods",
    group: "economy",
    label: "Import Goods",
    iconIndex: 13,
    defaultOn: false,
    implemented: false,
  },
  {
    id: "export-goods",
    group: "economy",
    label: "Export Goods",
    iconIndex: 14,
    defaultOn: false,
    implemented: false,
  },
  // Events (index 15)
  {
    id: "space-events",
    group: "events",
    label: "Space Events",
    iconIndex: 15,
    defaultOn: false,
    implemented: false,
  },
];
