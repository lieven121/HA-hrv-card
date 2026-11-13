import { describe, expect, it } from "vitest";
import { airflow, type AirflowInput } from "../src/logic/airflow";
import { tempColor } from "../src/logic/color";
import { fanState } from "../src/logic/fan";

const opts = { speeds: [], offLabel: "Off" };
const v = (value: unknown) => ({ value });

describe("fanState", () => {
  it("shows nothing without an entity and a dash without a value", () => {
    expect(fanState(null, opts)).toEqual({ dur: 0, label: "" });
    expect(fanState(v("unavailable"), opts)).toEqual({ dur: 0, label: "—" });
  });

  it("spins faster for later configured steps and uses their labels", () => {
    const speeds = [{ state: "off", label: "Uit" }, { state: "low", label: "Laag" }, { state: "high" }];
    expect(fanState(v("off"), { ...opts, speeds })).toEqual({ dur: 0, label: "Uit" });
    const low = fanState(v("LOW"), { ...opts, speeds });
    const high = fanState(v("high"), { ...opts, speeds });
    expect(low.label).toBe("Laag");
    expect(high).toEqual({ dur: expect.closeTo(0.35), label: "High" });
    expect(low.dur).toBeGreaterThan(high.dur);
  });

  it("reads percentages and numeric levels", () => {
    expect(fanState(v("50"), opts)).toEqual({ dur: expect.closeTo(1.375), label: "50%" });
    expect(fanState(v(2), { ...opts, levels: 4 })).toEqual({ dur: expect.closeTo(1.275), label: "2/4" });
    expect(fanState(v("0"), opts)).toEqual({ dur: 0, label: "Off" });
  });

  it("knows common words", () => {
    expect(fanState(v("boost"), opts).dur).toBe(0.38);
    expect(fanState(v("Uit"), opts)).toEqual({ dur: 0, label: "Off" });
    expect(fanState(v("whatever"), opts)).toEqual({ dur: 1, label: "Whatever" });
  });
});

describe("airflow", () => {
  const base: AirflowInput = {
    outdoor: 0, supply: 30, extract: 20, exhaust: -4, hz: 45, bypass: false,
    action: "heating", unitOff: false, effSensor: null, efficiency: 0.8,
  };

  it("estimates the air between exchanger and coils while heating", () => {
    const a = airflow(base);
    expect(a.freshMid).toBeCloseTo(16);
    expect(a.extractMid).toBeCloseTo(4);
    expect(a.supplyCoil).toBe("hot");
    expect(a.exhaustCoil).toBe("cold");
    expect(a.compressorRunning).toBe(true);
    expect(a.effShown).toBeNull();
  });

  it("accepts the efficiency sensor as a percentage", () => {
    expect(airflow({ ...base, effSensor: 50 }).freshMid).toBeCloseTo(10);
  });

  it("measures the efficiency when only the exchanger acts on the air", () => {
    const a = airflow({ ...base, action: "idle", supply: 16 });
    expect(a.effShown).toBeCloseTo(0.8);
    expect(a.freshMid).toBe(16);
    expect(airflow({ ...base, action: "idle", bypass: true }).effShown).toBeNull();
  });

  it("reverses the refrigerant and heats the exhaust coil when defrosting", () => {
    const a = airflow({ ...base, action: "defrost" });
    expect(a).toMatchObject({ exhaustCoil: "hot", supplyCoil: "", refSupply: "cold", reverse: true });
  });
});

describe("tempColor", () => {
  it("clamps to the ends and interpolates in between", () => {
    expect(tempColor(-30)).toBe("rgb(99,102,241)");
    expect(tempColor(50)).toBe("rgb(220,38,38)");
    expect(tempColor(4)).toBe("rgb(37,148,240)");
    expect(tempColor(null)).toBe("rgb(160,166,174)");
  });
});
