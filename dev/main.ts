import "../src/main";
import type { HrvCardElement } from "../src/elements";
import type { CardConfig, HomeAssistant } from "../src/types";
import { startMockHass } from "./mock-hass";

const unit = (p: string): CardConfig["entities"] => ({
  outdoor_temp: `sensor.${p}_outdoor_temperature`,
  extract_temp: { entity: `climate.${p}`, attribute: "current_temperature" },
  supply_temp: `sensor.${p}_supply_temperature`,
  exhaust_temp: `sensor.${p}_exhaust_temperature`,
  supply_fan: { entity: `climate.${p}`, attribute: "fan_mode" },
  exhaust_fan: `sensor.${p}_exhaust_fan`,
  compressor: `sensor.${p}_compressor_frequency`,
  heat_pump_mode: `climate.${p}`,
  target_temp: { entity: `climate.${p}`, attribute: "temperature" },
  bypass: `binary_sensor.${p}_bypass`,
  filter: `binary_sensor.${p}_filter_alarm`,
});

const configs: CardConfig[] = [
  {
    entity: "climate.hrv",
    language: "auto",
    entities: unit("hrv"),
    supply_fan_speeds: [
      { state: "low", label: "Laag" }, { state: "medium", label: "Gemiddeld" },
      { state: "high", label: "Hoog" }, { state: "boost", label: "Boost" },
    ],
    fan_levels: 4,
    extra: [
      { entity: "sensor.hrv_power", name: "Vermogen", icon: "mdi:flash" },
      { entity: "climate.hrv", attribute: "current_humidity", name: "Vochtigheid", unit: "%", icon: "mdi:water-percent" },
      { entity: "sensor.hrv_energy_today", name: "Energie vandaag", icon: "mdi:lightning-bolt" },
    ],
  },
  {
    name: "Ventilation",
    entity: "climate.hrv_summer",
    language: "en",
    entities: { ...unit("hrv_summer"), supply_fan: "sensor.hrv_summer_supply_fan" },
    extra: [
      { entity: "sensor.hrv_summer_power", icon: "mdi:flash" },
      { entity: "climate.hrv_summer", attribute: "current_humidity", unit: "%", icon: "mdi:water-percent" },
    ],
  },
];

// ?theme=dark and ?card=<index> (used by `npm run screenshots`)
const params = new URLSearchParams(location.search);
if (params.has("theme")) {
  document.documentElement.dataset.theme = params.get("theme")!;
  document.querySelector("button")!.hidden = true;
}
const only = params.get("card");

const cards = configs.filter((_, i) => only == null || String(i) === only).map((config) => {
  const card = document.createElement("hrv-card") as HrvCardElement;
  card.setConfig(config);
  document.getElementById("cards")!.appendChild(card);
  return card;
});

startMockHass((hass: HomeAssistant) => cards.forEach((c) => { c.hass = hass; }));

document.addEventListener("hass-more-info", (ev) => {
  console.log("more-info", (ev as CustomEvent<{ entityId: string }>).detail.entityId);
});
