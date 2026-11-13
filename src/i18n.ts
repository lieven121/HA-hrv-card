import type { Action, ModeKey } from "./types";

export interface Strings {
  outdoor: string;
  extract: string;
  supply: string;
  exhaust: string;
  bypass: string;
  filter: string;
  fanOff: string;
  hpOff: string;
  target: string;
  mode: Record<ModeKey, string>;
  act: Record<Action, string>;
}

const I18N: Record<"en" | "nl" | "fr" | "de", Strings> = {
  en: {
    outdoor: "Outdoor", extract: "Extract", supply: "Supply", exhaust: "Exhaust", bypass: "Bypass", filter: "Replace filter", fanOff: "Off", hpOff: "Heat pump off", target: "Target",
    mode: { heat: "Heat", cool: "Cool", auto: "Auto", dry: "Dry", fan_only: "Fan only", off: "Off", defrost: "Defrost" },
    act: { heating: "Heating", cooling: "Cooling", drying: "Drying", defrost: "Defrosting", idle: "Idle", off: "Off" },
  },
  nl: {
    outdoor: "Buiten", extract: "Afzuiging", supply: "Toevoer", exhaust: "Afvoer", bypass: "Bypass", filter: "Filter vervangen", fanOff: "Uit", hpOff: "Warmtepomp uit", target: "Doel",
    mode: { heat: "Verwarmen", cool: "Koelen", auto: "Auto", dry: "Drogen", fan_only: "Alleen ventilatie", off: "Uit", defrost: "Ontdooien" },
    act: { heating: "Verwarmt", cooling: "Koelt", drying: "Droogt", defrost: "Ontdooit", idle: "Inactief", off: "Uit" },
  },
  fr: {
    outdoor: "Extérieur", extract: "Extraction", supply: "Pulsion", exhaust: "Rejet", bypass: "Bypass", filter: "Remplacer le filtre", fanOff: "Arrêt", hpOff: "PAC arrêtée", target: "Consigne",
    mode: { heat: "Chauffage", cool: "Refroidissement", auto: "Auto", dry: "Déshumidification", fan_only: "Ventilation seule", off: "Arrêt", defrost: "Dégivrage" },
    act: { heating: "Chauffe", cooling: "Refroidit", drying: "Déshumidifie", defrost: "Dégivre", idle: "Inactif", off: "Arrêt" },
  },
  de: {
    outdoor: "Außenluft", extract: "Abluft", supply: "Zuluft", exhaust: "Fortluft", bypass: "Bypass", filter: "Filter wechseln", fanOff: "Aus", hpOff: "Wärmepumpe aus", target: "Soll",
    mode: { heat: "Heizen", cool: "Kühlen", auto: "Auto", dry: "Entfeuchten", fan_only: "Nur Lüften", off: "Aus", defrost: "Abtauen" },
    act: { heating: "Heizt", cooling: "Kühlt", drying: "Entfeuchtet", defrost: "Taut ab", idle: "Leerlauf", off: "Aus" },
  },
};

/** Card language: the configured one, or Home Assistant's when "auto"/unset; English as fallback. */
export function strings(configured: string | undefined, hassLanguage: string | undefined): Strings {
  const lang = configured && configured !== "auto" ? configured : hassLanguage || "en";
  return I18N[lang.slice(0, 2) as keyof typeof I18N] ?? I18N.en;
}
