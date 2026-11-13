import { describe, expect, it } from "vitest";
import { strings } from "../src/i18n";
import { heatPumpState, modeText, resolveMode, type HeatPumpInput } from "../src/logic/heatpump";

const base: HeatPumpInput = { defrost: false, target: null, hz: null, supply: null, extract: null };

describe("resolveMode", () => {
  it("is null without a usable value", () => {
    expect(resolveMode(undefined)).toBeNull();
    expect(resolveMode("unavailable")).toBeNull();
  });

  it("matches HA's values, then substrings, else off", () => {
    expect(resolveMode("heat_cool")).toBe("auto");
    expect(resolveMode("fan_only")).toBe("fan_only");
    expect(resolveMode("Heating mode")).toBe("heat");
    expect(resolveMode("something")).toBe("off");
  });

  it("uses the user's comma-separated values, including the old heating/cooling keys", () => {
    const states = { heat: "verwarmen, warm", cooling: "koelen" };
    expect(resolveMode("warm", states)).toBe("heat");
    expect(resolveMode("koelen", states)).toBe("cool");
    // a custom list replaces the defaults for that mode
    expect(resolveMode("heat", states)).toBe("off");
  });
});

describe("heatPumpState", () => {
  it("lets the defrost sensor and the action entity win over the mode", () => {
    expect(heatPumpState({ ...base, modeValue: "heat", defrost: true }).action).toBe("defrost");
    expect(heatPumpState({ ...base, modeValue: "heat", actionValue: "idle" }).action).toBe("idle");
    expect(heatPumpState({ ...base, modeValue: "cool", actionValue: "heating" })).toEqual({ mode: "cool", action: "heating" });
  });

  it("is idle in heat mode while the compressor stands still", () => {
    expect(heatPumpState({ ...base, modeValue: "heat", hz: 0 }).action).toBe("idle");
    expect(heatPumpState({ ...base, modeValue: "heat", hz: 40 }).action).toBe("heating");
  });

  it("decides auto from the target vs extract air, with a dead band", () => {
    const auto = { ...base, modeValue: "auto", extract: 21 };
    expect(heatPumpState({ ...auto, target: 22 }).action).toBe("heating");
    expect(heatPumpState({ ...auto, target: 20 }).action).toBe("cooling");
    expect(heatPumpState({ ...auto, target: 21.3 }).action).toBe("idle");
    expect(heatPumpState({ ...auto, target: 21.3, deadband: 0.2 }).action).toBe("heating");
    // without a target the supply air tells
    expect(heatPumpState({ ...auto, supply: 18 }).action).toBe("cooling");
  });

  it("uses compressor and temperatures without a mode entity", () => {
    expect(heatPumpState({ ...base, hz: 0 })).toEqual({ mode: null, action: "idle" });
    expect(heatPumpState({ ...base, hz: 30, supply: 17, extract: 22 }).action).toBe("cooling");
    expect(heatPumpState({ ...base, hz: 30 }).action).toBe("heating");
  });
});

describe("modeText", () => {
  const t = strings("en", undefined);
  it("combines mode and action only when they differ", () => {
    expect(modeText(t, "heat", "heating")).toBe("Heating");
    expect(modeText(t, "auto", "cooling")).toBe("Auto · Cooling");
    expect(modeText(t, "fan_only", "idle")).toBe("Fan only");
    expect(modeText(t, null, "idle")).toBe("Heat pump off");
  });
});
