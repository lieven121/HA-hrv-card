import { describe, expect, it } from "vitest";
import { applyStatesForm, importSpeeds, setSource, statesForm, tidyConfig, toEditorConfig } from "../src/editor/config";
import { tileValue } from "../src/logic/format";
import type { HomeAssistant } from "../src/types";

describe("tidyConfig", () => {
  it("drops empty sources, steps and lists and simplifies sources", () => {
    const cfg = toEditorConfig({ type: "custom:hrv-card", name: "", entity: "" });
    cfg.entities = {
      outdoor_temp: { entity: "sensor.out", attribute: undefined },
      extract_temp: { entity: "climate.hrv", attribute: "current_temperature" },
      supply_temp: "",
    };
    cfg.fan_speeds = [{ state: "", label: "" }, { state: "low", label: "Laag" }];
    expect(tidyConfig(cfg)).toEqual({
      type: "custom:hrv-card",
      entities: { outdoor_temp: "sensor.out", extract_temp: { entity: "climate.hrv", attribute: "current_temperature" } },
      fan_speeds: [{ state: "low", label: "Laag" }],
    });
  });
});

describe("setSource", () => {
  it("clears the attribute when another entity is picked", () => {
    const entities = { supply_fan: { entity: "climate.a", attribute: "fan_mode" } };
    setSource(entities, "supply_fan", { entity: "climate.b", attribute: "fan_mode" });
    expect(entities.supply_fan).toEqual({ entity: "climate.b", attribute: undefined });
    setSource(entities, "supply_fan", { entity: "climate.b", attribute: "preset_mode" });
    expect(entities.supply_fan).toEqual({ entity: "climate.b", attribute: "preset_mode" });
  });
});

describe("heat pump states form", () => {
  it("reads the old heating key and stores only filled-in modes", () => {
    const cfg = toEditorConfig({ heat_pump_states: { heating: "verwarmen" } });
    expect(statesForm(cfg)).toMatchObject({ heat: "verwarmen", cool: "", auto_deadband: 0.5 });
    applyStatesForm(cfg, { heat: "verwarmen", cool: "", auto_deadband: 0.5 });
    expect(cfg.heat_pump_states).toEqual({ heat: "verwarmen" });
    expect(cfg.auto_deadband).toBeUndefined();
    applyStatesForm(cfg, { auto_deadband: "1" });
    expect(cfg.heat_pump_states).toBeUndefined();
    expect(cfg.auto_deadband).toBe(1);
  });
});

describe("importSpeeds", () => {
  const hass = {
    states: { "climate.hrv": { entity_id: "climate.hrv", state: "heat", attributes: { fan_mode: "low", fan_modes: ["low", "high"] } } },
  } as HomeAssistant;

  it("fills the steps from <attribute>s and keeps existing labels", () => {
    const cfg = toEditorConfig({ entities: { supply_fan: { entity: "climate.hrv", attribute: "fan_mode" } }, fan_speeds: [{ state: "HIGH", label: "Hoog" }] });
    expect(importSpeeds(hass, cfg)).toMatch(/Imported 2 values from fan_modes/);
    expect(cfg.fan_speeds).toEqual([{ state: "low", label: "" }, { state: "high", label: "Hoog" }]);
  });

  it("explains what is missing", () => {
    expect(importSpeeds(hass, toEditorConfig({}))).toBe("Pick a supply fan entity first.");
    expect(importSpeeds(hass, toEditorConfig({ entities: { supply_fan: "fan.x" } }))).toBe("fan.x was not found.");
  });
});

describe("tileValue", () => {
  const r = (value: unknown, unit?: string) => ({
    value, source: { entity: "sensor.x" },
    entity: { entity_id: "sensor.x", state: String(value), attributes: { unit_of_measurement: unit } },
  });
  it("rounds numbers and adds the unit", () => {
    expect(tileValue({ entity: "sensor.x" }, r("412.4", "W"))).toBe("412 W");
    expect(tileValue({ entity: "sensor.x" }, r("3.456", "kWh"))).toBe("3.5 kWh");
    expect(tileValue({ entity: "sensor.x", decimals: 2, unit: "kW" }, r("1.2", "W"))).toBe("1.20 kW");
    // an attribute does not inherit the entity's unit
    expect(tileValue({ entity: "sensor.x", attribute: "humidity" }, r(46, "W"))).toBe("46");
    expect(tileValue({ entity: "sensor.x" }, null)).toBe("—");
  });
});
