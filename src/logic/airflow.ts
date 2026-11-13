import type { Action } from "../types";
import { isActive } from "./heatpump";

export type CoilState = "hot" | "cold" | "";

export interface AirflowInput {
  outdoor: number | null;
  supply: number | null;
  extract: number | null;
  exhaust: number | null;
  hz: number | null;
  bypass: boolean;
  action: Action;
  unitOff: boolean;
  /** efficiency sensor, as 0–1 or % */
  effSensor: number | null;
  /** configured efficiency, used when there is no sensor */
  efficiency: number;
}

export interface Airflow {
  hpActive: boolean;
  /** fresh air between the exchanger and the supply coil (null when unknown) */
  freshMid: number | null;
  /** extract air between the exchanger and the exhaust coil */
  extractMid: number | null;
  /** efficiency to show (0–1), measured or estimated; null to show nothing */
  effShown: number | null;
  supplyCoil: CoilState;
  exhaustCoil: CoilState;
  /** colour of the refrigerant line on the supply / exhaust side */
  refSupply: CoilState;
  refExhaust: CoilState;
  /** refrigerant flows the other way (cooling, drying, defrost) */
  reverse: boolean;
  /** seconds per dash of the refrigerant animation */
  refDuration: number;
  compressorRunning: boolean;
}

export function airflow(i: AirflowInput): Airflow {
  const hpActive = isActive(i.action);
  let effSensor = i.effSensor;
  if (effSensor != null && effSensor > 1) effSensor /= 100;
  const eff = effSensor ?? (Number(i.efficiency) || 0.8);

  // While the heat pump runs, the supply/exhaust sensors sit after the coils, so the
  // air between exchanger and coils is estimated from the exchanger efficiency.
  let freshMid = i.supply;
  let extractMid = i.exhaust;
  if (hpActive && i.outdoor != null && i.extract != null) {
    freshMid = i.outdoor + (i.bypass ? 0 : eff) * (i.extract - i.outdoor);
    extractMid = i.extract - (freshMid - i.outdoor);
  }

  // Without a sensor the efficiency can only be measured when nothing but the exchanger acts on the air.
  let effShown = effSensor;
  if (effShown == null && !hpActive && !i.bypass && !i.unitOff
    && i.outdoor != null && i.extract != null && i.supply != null && Math.abs(i.extract - i.outdoor) > 2) {
    effShown = (i.supply - i.outdoor) / (i.extract - i.outdoor);
  }

  // heating → supply coil is the condenser (hot), exhaust coil the evaporator (cold)
  // cooling / drying → reversed; defrost → hot gas to the exhaust coil
  const a = i.action;
  const supplyCoil: CoilState = a === "heating" ? "hot" : a === "cooling" || a === "drying" ? "cold" : "";
  const exhaustCoil: CoilState = a === "heating" ? "cold" : a === "cooling" || a === "drying" || a === "defrost" ? "hot" : "";

  return {
    hpActive,
    freshMid,
    extractMid,
    effShown,
    supplyCoil,
    exhaustCoil,
    refSupply: supplyCoil || (a === "defrost" ? "cold" : ""),
    refExhaust: exhaustCoil,
    reverse: a === "cooling" || a === "drying" || a === "defrost",
    refDuration: i.hz ? Math.max(0.25, 1.4 - i.hz / 90) : 1,
    compressorRunning: hpActive && (i.hz == null || i.hz > 0),
  };
}
