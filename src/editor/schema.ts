/* ha-form schemas and labels of the visual editor (the editor is English only). */
import { MODE_KEYS } from "../const";

export interface SchemaItem {
  name: string;
  type?: "grid";
  label?: string;
  label_key?: string;
  selector?: Record<string, unknown>;
  context?: Record<string, string>;
  schema?: SchemaItem[];
}

const LABELS: Record<string, string> = {
  entity: "Entity",
  attribute: "Attribute (optional)",
  name: "Title",
  efficiency: "Exchanger efficiency (0–1, used when no sensor)",
  decimals: "Temperature decimals",
  show_header: "Show title and status",
  language: "Card language",
  fan_levels: "Numeric fan levels (e.g. 4 if 1–4 instead of %)",
  main_entity: "Main entity (opens when you tap the title or status)",
  heat: "Heat", cool: "Cool", auto: "Auto", dry: "Dry", fan_only: "Fan only", off: "Off", defrost: "Defrost",
  auto_deadband: "Auto dead band (°C)",
  icon: "Icon",
  unit: "Unit",
  decimals_x: "Decimals",
};

export const computeLabel = (s: SchemaItem) => LABELS[s.label_key || s.name] || s.label || s.name;

const number = (min: number, max: number, step: number) => ({ number: { min, max, step, mode: "box" } });

export const SOURCE_SCHEMA: SchemaItem[] = [
  {
    name: "", type: "grid", schema: [
      { name: "entity", selector: { entity: {} } },
      { name: "attribute", selector: { attribute: {} }, context: { filter_entity: "entity" } },
    ],
  },
];

export const GENERAL_SCHEMA: SchemaItem[] = [
  { name: "name", selector: { text: {} } },
  { name: "entity", label_key: "main_entity", selector: { entity: {} } },
  {
    name: "", type: "grid", schema: [
      {
        name: "language", selector: {
          select: {
            mode: "dropdown", options: [
              { value: "auto", label: "Same as Home Assistant" }, { value: "en", label: "English" },
              { value: "nl", label: "Nederlands" }, { value: "fr", label: "Français" }, { value: "de", label: "Deutsch" },
            ],
          },
        },
      },
      { name: "decimals", selector: number(0, 2, 1) },
      { name: "efficiency", selector: number(0, 1, 0.01) },
      { name: "show_header", selector: { boolean: {} } },
    ],
  },
];

export const FAN_LEVELS_SCHEMA: SchemaItem[] = [{ name: "fan_levels", selector: number(0, 20, 1) }];

export const STATES_SCHEMA: SchemaItem[] = [
  { name: "", type: "grid", schema: MODE_KEYS.map((k) => ({ name: k, selector: { text: {} } })) },
  { name: "auto_deadband", selector: number(0, 5, 0.1) },
];

export const TILE_SCHEMA: SchemaItem[] = [
  ...SOURCE_SCHEMA,
  {
    name: "", type: "grid", schema: [
      { name: "name", label: "Name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
      { name: "unit", selector: { text: {} } },
      { name: "decimals", label_key: "decimals_x", selector: number(0, 4, 1) },
    ],
  },
];
