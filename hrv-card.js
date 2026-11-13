/**
 * hrv-card — Home Assistant card for a heat-recovery ventilation unit with a heat pump.
 *
 * Install
 *  1. Copy this file to /config/www/hrv-card.js
 *  2. Settings → Dashboards → ⋮ → Resources → Add "/local/hrv-card.js" as a JavaScript module
 *  3. Add card → "HRV Card". Everything can be set in the visual editor.
 *
 * YAML reference (all optional except what you want to see)
 *
 *  type: custom:hrv-card
 *  name: Ventilation
 *  entity: climate.hrv         # main entity: opens when tapping the title (shows a chevron)
 *  language: auto              # auto | en | nl | fr | de (captions & status)
 *  efficiency: 0.85            # used to estimate air temp between exchanger and coils
 *  decimals: 1
 *  entities:
 *    outdoor_temp: sensor.hrv_outdoor_temperature
 *    extract_temp:                       # any source can read an attribute instead of the state
 *      entity: climate.hrv
 *      attribute: current_temperature
 *    supply_temp: sensor.hrv_supply_temperature
 *    exhaust_temp: sensor.hrv_exhaust_temperature
 *    supply_fan:
 *      entity: climate.hrv
 *      attribute: fan_mode
 *    exhaust_fan: sensor.hrv_exhaust_fan_step
 *    compressor: sensor.hrv_compressor_frequency
 *    heat_pump_mode: climate.hrv                       # heat/cool/auto/dry/fan_only/off (+defrost)
 *    target_temp: { entity: climate.hrv, attribute: temperature }   # used by auto
 *    heat_pump_action: { entity: climate.hrv, attribute: hvac_action }  # optional, wins over auto logic
 *    defrost: binary_sensor.hrv_defrost
 *    bypass: binary_sensor.hrv_bypass
 *    filter: binary_sensor.hrv_filter_alarm
 *    efficiency: sensor.hrv_efficiency
 *  fan_speeds:                 # slowest → fastest; label = what the card shows
 *    - { state: low,    label: Laag }
 *    - { state: slow,   label: Traag }
 *    - { state: medium, label: Gemiddeld }
 *  # supply_fan_speeds / exhaust_fan_speeds override fan_speeds per fan
 *  fan_levels: 4               # only if a fan reports numeric levels instead of %
 *  heat_pump_states:           # only if your values differ from HA's (comma-separated)
 *    heat: verwarmen
 *    fan_only: ventilatie, vent
 *  auto_deadband: 0.5          # auto: heat if target > extract + 0.5, cool if target < extract − 0.5
 *  extra:
 *    - entity: sensor.hrv_power
 *      name: Power
 *      icon: mdi:flash
 *    - entity: climate.hrv
 *      attribute: current_humidity
 *      name: Humidity
 *      unit: "%"
 */

const TEMP_SCALE = [
  [-10, [99, 102, 241]],
  [0, [59, 130, 246]],
  [8, [14, 165, 233]],
  [14, [20, 184, 166]],
  [18, [34, 197, 94]],
  [21, [163, 201, 47]],
  [24, [245, 176, 40]],
  [28, [249, 115, 22]],
  [34, [239, 68, 68]],
  [40, [220, 38, 38]],
];

function tempColor(t) {
  if (t == null || Number.isNaN(t)) return "rgb(160,166,174)";
  if (t <= TEMP_SCALE[0][0]) return `rgb(${TEMP_SCALE[0][1].join(",")})`;
  for (let i = 1; i < TEMP_SCALE.length; i++) {
    const [t1, c1] = TEMP_SCALE[i];
    if (t <= t1) {
      const [t0, c0] = TEMP_SCALE[i - 1];
      const f = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * f)).join(",")})`;
    }
  }
  return `rgb(${TEMP_SCALE[TEMP_SCALE.length - 1][1].join(",")})`;
}

const FAN_GLYPH = `
  <circle r="24" fill="transparent"></circle>
  <path d="M0 0 C-4 -8 -7 -18 1 -22 C9 -25 14 -14 8 -6 C5 -2 2 0 0 0Z"></path>
  <path d="M0 0 C-4 -8 -7 -18 1 -22 C9 -25 14 -14 8 -6 C5 -2 2 0 0 0Z" transform="rotate(120)"></path>
  <path d="M0 0 C-4 -8 -7 -18 1 -22 C9 -25 14 -14 8 -6 C5 -2 2 0 0 0Z" transform="rotate(240)"></path>
  <circle r="5.5" class="hub"></circle>`;

const fins = (x0) =>
  Array.from({ length: 7 }, (_, i) => {
    const x = x0 + 6 + i * 7;
    return `<line x1="${x}" y1="238" x2="${x}" y2="282"></line>`;
  }).join("");

const STYLE = `
:host {
  --hrv-fg: var(--primary-text-color, #1d2125);
  --hrv-muted: var(--secondary-text-color, #6a7178);
  --hrv-casing: var(--hrv-casing-color, #a5acb4);
  --hrv-line: var(--hrv-line-color, #c3c8ce);
  --hrv-machine: var(--hrv-machine-color, #9ca3ab);
  --hrv-hot: #ef4444;
  --hrv-cold: #38bdf8;
  --hrv-defrost: #a78bfa;
  --hrv-warn: var(--warning-color, #f59e0b);
  --hrv-flow-off: var(--hrv-flow-off-color, var(--hrv-casing));
  display: block;
}
ha-card { padding: 16px; overflow: hidden; }
ha-card:not(:defined) {
  display: block;
  background: var(--ha-card-background, var(--card-background-color, #fff));
  border-radius: var(--ha-card-border-radius, 12px);
  border: 1px solid var(--divider-color, #e3e6ea);
  color: var(--hrv-fg);
}
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.title { font-size: 1.15rem; font-weight: 500; color: var(--hrv-fg); }
.title-btn {
  all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 2px;
  border-radius: 6px; padding: 2px 4px 2px 0; min-width: 0;
}
.title-btn .chev { width: 22px; height: 22px; fill: var(--hrv-muted); flex: none; transition: transform .15s; }
.title-btn:hover .chev { transform: translateX(2px); fill: var(--hrv-fg); }
.title-btn:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); }
.chips.click { cursor: pointer; }

.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em;
  padding: 3px 10px; border-radius: 999px;
  color: var(--chip, var(--hrv-muted));
  background: color-mix(in srgb, var(--chip, var(--hrv-muted)) 14%, transparent);
  display: inline-flex; align-items: center; gap: 5px;
}
.chip::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.chip.heating { --chip: var(--hrv-hot); }
.chip.cooling { --chip: var(--hrv-cold); }
.chip.defrost { --chip: var(--hrv-defrost); }
.chip.drying { --chip: #14b8a6; }
.chip.target::before { border-radius: 50%; background: none; border: 2px solid currentColor; width: 5px; height: 5px; }
.chip.warn { --chip: var(--hrv-warn); }
.chip.info { --chip: var(--hrv-cold); }
.chip[hidden] { display: none; }

svg { width: 100%; height: auto; display: block; overflow: visible; }
text { fill: var(--hrv-fg); font-family: inherit; }
.cap { fill: var(--hrv-muted); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.val { font-size: 21px; font-variant-numeric: tabular-nums; }
.small { font-size: 15px; fill: var(--hrv-fg); }
.eff { font-size: 12px; fill: var(--hrv-muted); font-variant-numeric: tabular-nums; }
.click { cursor: pointer; }
.click:hover .val { text-decoration: underline; text-decoration-thickness: 1px; }

.casing { fill: none; stroke: var(--hrv-casing); stroke-width: 2.5; }
.hx { fill: none; stroke: var(--hrv-casing); stroke-width: 2.5; transition: stroke-dasharray .3s; }
.hx.bypass { stroke-dasharray: 6 6; opacity: .6; }

.stream { fill: none; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; }
.flow {
  fill: none; stroke: rgba(255,255,255,.85); stroke-width: 5; stroke-linecap: round;
  stroke-dasharray: 0.1 24;
  animation: flow var(--d, 1s) linear infinite;
}
.flow.off { animation-play-state: paused; opacity: 0; }
@keyframes flow { to { stroke-dashoffset: -24.1; } }
stop { transition: stop-color 1.2s ease; }
.arrow { transition: fill 1.2s ease; }

.fan .rotor {
  fill: var(--hrv-machine);
  transform-box: fill-box; transform-origin: 50% 50%;
  animation: spin var(--d, 1s) linear infinite;
}
.fan .rotor.off { animation-play-state: paused; }
.fan .ring { fill: none; stroke: var(--hrv-line); stroke-width: 1.5; }
.fan .hub { fill: var(--hrv-machine); stroke: var(--card-background-color, #fff); stroke-width: 2; }
@keyframes spin { to { transform: rotate(360deg); } }

.coil { color: var(--hrv-casing); }
.coil rect.box { fill: none; stroke: currentColor; stroke-width: 2; transition: stroke .6s; }
.coil rect.glow { fill: currentColor; opacity: 0; transition: opacity .6s; }
.coil line { stroke: currentColor; stroke-width: 1.6; opacity: .9; }
.coil.hot { color: var(--hrv-hot); }
.coil.cold { color: var(--hrv-cold); }
.coil.hot rect.glow, .coil.cold rect.glow { animation: pulse 2.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: .10; } 50% { opacity: .28; } }

.pipe { fill: none; stroke: var(--hrv-line); stroke-width: 3; stroke-linejoin: round; }
.ref { fill: none; stroke: currentColor; stroke-width: 3; stroke-dasharray: 6 8; stroke-linejoin: round; opacity: 0; transition: opacity .6s; animation: ref var(--rd, 1s) linear infinite; }
.ref.hot { color: var(--hrv-hot); opacity: 1; }
.ref.cold { color: var(--hrv-cold); opacity: 1; }
.ref.rev { animation-direction: reverse; }
@keyframes ref { to { stroke-dashoffset: -14; } }

.comp { fill: var(--hrv-machine); }
.comp-g.run { animation: hum .09s linear infinite alternate; }
@keyframes hum { from { transform: translateX(-0.4px); } to { transform: translateX(0.4px); } }

.extras { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; margin-top: 12px; }
.extras:empty { display: none; }
.tile {
  all: unset; box-sizing: border-box; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 10px;
  background: color-mix(in srgb, var(--hrv-fg) 5%, transparent);
  min-width: 0;
}
.tile:hover { background: color-mix(in srgb, var(--hrv-fg) 9%, transparent); }
.tile:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); }
.tile ha-icon, .tile .ico { --mdc-icon-size: 20px; color: var(--hrv-muted); flex: none; width: 20px; height: 20px; display: inline-flex; }
.tile .ico::before { content: ""; width: 8px; height: 8px; margin: auto; border-radius: 50%; background: currentColor; }
.tile .txt { display: flex; flex-direction: column; min-width: 0; }
.tile .v { font-size: 1rem; font-weight: 500; color: var(--hrv-fg); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile .n { font-size: 0.75rem; color: var(--hrv-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (prefers-reduced-motion: reduce) {
  .flow, .fan .rotor, .ref, .comp-g.run, .coil rect.glow { animation: none !important; }
}
`;

const SVG = `
<svg viewBox="0 0 640 400" role="img" aria-label="Heat recovery ventilation diagram">
  <defs>
    <linearGradient id="g-fresh" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="620" y2="0">
      <stop offset="0"></stop><stop offset="0.40"></stop><stop offset="0.61"></stop>
      <stop offset="0.73"></stop><stop offset="0.84"></stop><stop offset="1"></stop>
    </linearGradient>
    <linearGradient id="g-extract" gradientUnits="userSpaceOnUse" x1="620" y1="0" x2="20" y2="0">
      <stop offset="0"></stop><stop offset="0.39"></stop><stop offset="0.60"></stop>
      <stop offset="0.73"></stop><stop offset="0.84"></stop><stop offset="1"></stop>
    </linearGradient>
  </defs>

  <rect class="casing" x="90" y="30" width="460" height="360" rx="14"></rect>

  <!-- refrigerant loop -->
  <path class="pipe" d="M145 286 V346 H298"></path>
  <path class="pipe" d="M342 346 H495 V286"></path>
  <path class="ref" data-r="refL" d="M298 346 H145 V286"></path>
  <path class="ref" data-r="refR" d="M342 346 H495 V286"></path>
  <g class="comp-g click" data-r="comp" data-key="compressor">
    <rect class="comp" x="298" y="320" width="44" height="56" rx="9"></rect>
    <rect class="comp" x="345" y="352" width="28" height="22" rx="10"></rect>
  </g>
  <g class="click" data-key="compressor">
    <text class="small" data-r="hz" x="320" y="308" text-anchor="middle"></text>
  </g>

  <!-- heat exchanger -->
  <rect class="hx" data-r="hx" x="267" y="152" width="106" height="106" rx="12" transform="rotate(45 320 205)"></rect>
  <text class="eff" data-r="eff" x="320" y="174" text-anchor="middle"></text>

  <!-- air streams (arrows sit under the moving dots) -->
  <path class="stream" stroke="url(#g-extract)" data-r="sExt" d="M620 150 H385 Q375 150 368 157 L272 253 Q265 260 255 260 H20"></path>
  <path class="stream" stroke="url(#g-fresh)" data-r="sFresh" d="M20 150 H255 Q265 150 272 157 L368 253 Q375 260 385 260 H620"></path>
  <polygon class="arrow" data-r="aOut" points="98,138 120,150 98,162"></polygon>
  <polygon class="arrow" data-r="aExt" points="542,138 520,150 542,162"></polygon>
  <polygon class="arrow" data-r="aExh" points="114,248 92,260 114,272"></polygon>
  <polygon class="arrow" data-r="aSup" points="526,248 548,260 526,272"></polygon>
  <path class="flow" data-r="fExt" d="M620 150 H385 Q375 150 368 157 L272 253 Q265 260 255 260 H20"></path>
  <path class="flow" data-r="fFresh" d="M20 150 H255 Q265 150 272 157 L368 253 Q375 260 385 260 H620"></path>

  <!-- coils -->
  <g class="coil" data-r="coilL">
    <rect class="glow" x="118" y="234" width="54" height="52" rx="6"></rect>
    ${fins(118)}
    <rect class="box" x="118" y="234" width="54" height="52" rx="6"></rect>
  </g>
  <g class="coil" data-r="coilR">
    <rect class="glow" x="468" y="234" width="54" height="52" rx="6"></rect>
    ${fins(468)}
    <rect class="box" x="468" y="234" width="54" height="52" rx="6"></rect>
  </g>

  <!-- fans -->
  <g class="fan click" data-key="supply_fan" transform="translate(150 78)">
    <circle class="ring" r="30"></circle>
    <g class="rotor" data-r="fanS">${FAN_GLYPH}</g>
  </g>
  <text class="small click" data-key="supply_fan" data-r="fanSl" x="150" y="128" text-anchor="middle"></text>
  <g class="fan click" data-key="exhaust_fan" transform="translate(490 78)">
    <circle class="ring" r="30"></circle>
    <g class="rotor" data-r="fanE">${FAN_GLYPH}</g>
  </g>
  <text class="small click" data-key="exhaust_fan" data-r="fanEl" x="490" y="128" text-anchor="middle"></text>

  <!-- temperatures -->
  <g class="click" data-key="outdoor_temp">
    <text class="cap" x="12" y="106" data-r="cOut">Outdoor</text>
    <text class="val" data-r="tOut" x="12" y="132"></text>
  </g>
  <g class="click" data-key="exhaust_temp">
    <text class="val" data-r="tExh" x="12" y="294"></text>
    <text class="cap" x="12" y="312" data-r="cExh">Exhaust</text>
  </g>
  <g class="click" data-key="extract_temp">
    <text class="cap" x="628" y="106" text-anchor="end" data-r="cExt">Extract</text>
    <text class="val" data-r="tExt" x="628" y="132" text-anchor="end"></text>
  </g>
  <g class="click" data-key="supply_temp">
    <text class="val" data-r="tSup" x="628" y="294" text-anchor="end"></text>
    <text class="cap" x="628" y="312" text-anchor="end" data-r="cSup">Supply</text>
  </g>
</svg>`;

// ---------------------------------------------------------------------------
// Shared definitions
// ---------------------------------------------------------------------------

const SOURCES = [
  { key: "outdoor_temp", label: "Outdoor air (fresh air in)", group: "temps" },
  { key: "extract_temp", label: "Extract air (from the house)", group: "temps" },
  { key: "supply_temp", label: "Supply air (into the house)", group: "temps" },
  { key: "exhaust_temp", label: "Exhaust air (to outside)", group: "temps" },
  { key: "supply_fan", label: "Supply fan speed", group: "fans" },
  { key: "exhaust_fan", label: "Exhaust fan speed", group: "fans" },
  { key: "compressor", label: "Compressor frequency (Hz)", group: "hp" },
  { key: "heat_pump_mode", label: "Mode (heat / cool / auto / dry / fan only / off)", group: "hp" },
  { key: "target_temp", label: "Set temperature (auto mode compares it with the extract air)", group: "hp" },
  { key: "heat_pump_action", label: "Current action (optional, e.g. hvac_action)", group: "hp" },
  { key: "defrost", label: "Defrost active (optional)", group: "hp" },
  { key: "efficiency", label: "Exchanger efficiency (% or 0–1)", group: "status" },
  { key: "bypass", label: "Bypass open", group: "status" },
  { key: "filter", label: "Filter alarm", group: "status" },
];

const I18N = {
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

/** Default values recognised per mode, checked in this order (exact match first, then "contains"). */
const MODE_DEFAULTS = {
  defrost: ["defrost", "defrosting"],
  fan_only: ["fan_only", "fan only", "fan", "ventilation"],
  dry: ["dry", "drying"],
  auto: ["auto", "heat_cool"],
  heat: ["heat", "heating"],
  cool: ["cool", "cooling"],
  off: ["off", "standby"],
};
const MODE_KEYS = Object.keys(MODE_DEFAULTS);
const ACTIVE_ACTIONS = new Set(["heating", "cooling", "drying", "defrost"]);

const OFF_STATES = new Set(["off", "0", "stop", "stopped", "uit", "arrêt", "aus"]);

/** A source is either "sensor.x" or { entity: "climate.x", attribute: "fan_mode" }. */
function normSource(v) {
  if (!v) return null;
  if (typeof v === "string") return { entity: v };
  return v.entity ? v : null;
}

const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

class HrvCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("hrv-card-editor");
  }

  static getStubConfig() {
    return { name: "Ventilation", efficiency: 0.8, entities: {}, fan_speeds: [], extra: [] };
  }

  setConfig(config) {
    if (!config) throw new Error("hrv-card: invalid configuration");
    this._config = { efficiency: 0.8, decimals: 1, show_header: true, ...config, entities: { ...(config.entities || {}) } };
    this._built = false;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 6 + Math.ceil(((this._config && this._config.extra) || []).length / 3);
  }

  // ---------- reading values ----------
  _t() {
    const lang = this._config.language && this._config.language !== "auto"
      ? this._config.language
      : ((this._hass.locale && this._hass.locale.language) || this._hass.language || "en");
    return I18N[String(lang).slice(0, 2)] || I18N.en;
  }
  /** Resolve a source to { value, st, src } using the attribute when configured. */
  _raw(srcOrKey) {
    const src = normSource(typeof srcOrKey === "string" && !srcOrKey.includes(".") ? this._config.entities[srcOrKey] : srcOrKey);
    if (!src || !this._hass) return null;
    const st = this._hass.states[src.entity];
    if (!st) return null;
    const value = src.attribute ? (st.attributes || {})[src.attribute] : st.state;
    return { value, st, src };
  }
  _num(key) {
    const r = this._raw(key);
    if (!r || r.value == null) return null;
    const v = parseFloat(String(r.value));
    return Number.isNaN(v) ? null : v;
  }
  _on(key) {
    const r = this._raw(key);
    if (!r || r.value == null) return false;
    if (r.value === true) return true;
    const s = String(r.value).toLowerCase();
    if (["on", "open", "true", "active", "problem", "yes"].includes(s)) return true;
    const n = parseFloat(s);
    return !Number.isNaN(n) && n > 0;
  }
  _fmtTemp(v, key) {
    if (v == null) return "—";
    const r = this._raw(key);
    const unit = r && !r.src.attribute && r.st.attributes.unit_of_measurement
      ? r.st.attributes.unit_of_measurement
      : this._config.temperature_unit || "°C";
    return `${v.toFixed(this._config.decimals)} ${unit}`;
  }
  _fan(key) {
    const t = this._t();
    const r = this._raw(key);
    if (!r) return { dur: 0, label: "" };
    if (r.value == null) return { dur: 0, label: "—" };
    const raw = String(r.value);
    const low = raw.toLowerCase();
    if (["unavailable", "unknown"].includes(low)) return { dur: 0, label: "—" };

    // 1. user-defined steps (ordered slowest → fastest, with optional translation)
    const list = (this._config[`${key}_speeds`] || this._config.fan_speeds || [])
      .filter((s) => s && s.state != null && String(s.state) !== "");
    const hit = list.find((s) => String(s.state).toLowerCase() === low);
    if (hit) {
      const label = hit.label || cap(raw);
      if (OFF_STATES.has(low)) return { dur: 0, label };
      const active = list.filter((s) => !OFF_STATES.has(String(s.state).toLowerCase()));
      const f = (active.indexOf(hit) + 1) / active.length;
      return { dur: 2.2 - 1.85 * f, label };
    }

    // 2. numeric: percentage or level
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && /^-?[\d.]+$/.test(raw.trim())) {
      if (n <= 0) return { dur: 0, label: t.fanOff };
      const levels = this._config.fan_levels;
      if (levels) return { dur: 2.2 - 1.85 * Math.min(n / levels, 1), label: `${n}/${levels}` };
      return { dur: 2.4 - 2.05 * Math.min(n / 100, 1), label: `${Math.round(n)}%` };
    }

    // 3. common words
    if (OFF_STATES.has(low)) return { dur: 0, label: t.fanOff };
    const map = [
      ["boost", 0.38], ["max", 0.38], ["turbo", 0.38], ["high", 0.55],
      ["medium", 0.95], ["mid", 0.95], ["normal", 0.95], ["auto", 0.95], ["home", 0.95],
      ["low", 1.6], ["eco", 1.6], ["away", 2.2], ["min", 2.2],
    ];
    const m = map.find(([k]) => low.includes(k));
    return { dur: m ? m[1] : 1, label: cap(raw) };
  }
  /** Returns { mode, action, target }. mode is null when no mode entity is configured. */
  _state(hz, tSup, tExt) {
    const hs = this._config.heat_pump_states || {};
    const legacy = { heat: "heating", cool: "cooling" };
    const toks = (k) => {
      const v = hs[k] != null && hs[k] !== "" ? hs[k] : hs[legacy[k]];
      return (v ? String(v).split(",") : MODE_DEFAULTS[k]).map((x) => x.trim().toLowerCase()).filter(Boolean);
    };
    let mode = null;
    const r = this._raw("heat_pump_mode");
    if (r && r.value != null && !["unavailable", "unknown"].includes(String(r.value).toLowerCase())) {
      const s = String(r.value).toLowerCase();
      mode = MODE_KEYS.find((k) => toks(k).includes(s))
        || MODE_KEYS.find((k) => toks(k).some((x) => s.includes(x)))
        || "off";
    }
    const target = this._num("target_temp");
    const running = hz == null || hz > 0;

    let action = null;
    if (this._on("defrost")) action = "defrost";
    else {
      const a = this._raw("heat_pump_action");
      if (a && a.value != null) {
        const s = String(a.value).toLowerCase();
        action = s.includes("defrost") ? "defrost" : s.includes("heat") ? "heating" : s.includes("cool") ? "cooling"
          : s.includes("dry") ? "drying" : s === "off" ? "off" : "idle";
      }
    }
    if (!action) {
      switch (mode) {
        case "heat": action = running ? "heating" : "idle"; break;
        case "cool": action = running ? "cooling" : "idle"; break;
        case "dry": action = running ? "drying" : "idle"; break;
        case "defrost": action = "defrost"; break;
        case "fan_only": action = "idle"; break;
        case "off": action = "off"; break;
        case "auto": {
          // auto: the set temperature decides; extract air = room temperature
          const db = Number(this._config.auto_deadband ?? 0.5);
          if (!running) action = "idle";
          else if (target != null && tExt != null) action = target > tExt + db ? "heating" : target < tExt - db ? "cooling" : "idle";
          else if (tSup != null && tExt != null) action = tSup >= tExt ? "heating" : "cooling";
          else action = "idle";
          break;
        }
        default: // no mode entity: compressor and temperatures decide
          action = hz == null || hz <= 0 ? "idle" : tSup != null && tExt != null && tSup < tExt ? "cooling" : "heating";
      }
    }
    return { mode, action, target };
  }
  _modeText(t, mode, action) {
    if (mode == null) return action === "idle" || action === "off" ? t.hpOff : t.act[action];
    if (mode === "off" || mode === "fan_only") return t.mode[mode];
    const natural = { heat: "heating", cool: "cooling", dry: "drying", defrost: "defrost" }[mode];
    if (natural === action) return t.act[action];
    return `${t.mode[mode]} · ${t.act[action]}`;
  }
  _mainEntity() {
    const e = this._config.entity;
    return typeof e === "string" ? e : e && e.entity ? e.entity : "";
  }
  _moreInfo(srcOrKey) {
    const src = normSource(this._config.entities[srcOrKey] || srcOrKey);
    if (!src) return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId: src.entity };
    this.dispatchEvent(ev);
  }

  // ---------- build once per config ----------
  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const extras = (this._config.extra || [])
      .map((x, i) => `<button class="tile" data-i="${i}" title="${esc(x.entity)}">
          ${customElements.get("ha-icon") ? `<ha-icon></ha-icon>` : `<span class="ico"></span>`}
          <span class="txt"><span class="v"></span><span class="n"></span></span>
        </button>`)
      .join("");
    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="head" ${this._config.show_header === false ? "hidden" : ""}>
          ${this._mainEntity()
            ? `<button class="title-btn" data-main><span class="title" data-r="title">${esc(this._config.name || "")}</span>
                 <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.59 16.58 13.17 12 8.59 7.41 10 6l6 6-6 6z"></path></svg></button>`
            : `<span class="title" data-r="title">${esc(this._config.name || "")}</span>`}
          <div class="chips ${this._mainEntity() || this._config.entities.heat_pump_mode ? "click" : ""}" data-main>
            <span class="chip" data-r="mode"></span>
            <span class="chip target" data-r="target" hidden></span>
            <span class="chip info" data-r="bypass" hidden></span>
            <span class="chip warn" data-r="filter" hidden></span>
          </div>
        </div>
        <div data-r="dim">${SVG}</div>
        <div class="extras">${extras}</div>
      </ha-card>`;
    this._r = {};
    this.shadowRoot.querySelectorAll("[data-r]").forEach((el) => (this._r[el.dataset.r] = el));
    this._stops = {
      fresh: [...this.shadowRoot.querySelectorAll("#g-fresh stop")],
      extract: [...this.shadowRoot.querySelectorAll("#g-extract stop")],
    };
    this.shadowRoot.querySelectorAll("[data-key]").forEach((el) =>
      el.addEventListener("click", () => this._moreInfo(el.dataset.key)));
    this.shadowRoot.querySelectorAll(".tile").forEach((el) =>
      el.addEventListener("click", () => this._moreInfo(this._config.extra[el.dataset.i])));
    this.shadowRoot.querySelectorAll("[data-main]").forEach((el) =>
      el.addEventListener("click", () => this._moreInfo(this._mainEntity() || "heat_pump_mode")));
    this._built = true;
  }

  // ---------- update on every state change ----------
  _render() {
    if (!this._config || !this._hass) return;
    if (!this._built) this._build();
    const r = this._r;
    const t = this._t();

    r.cOut.textContent = t.outdoor;
    r.cExt.textContent = t.extract;
    r.cSup.textContent = t.supply;
    r.cExh.textContent = t.exhaust;

    const tOut = this._num("outdoor_temp");
    const tSup = this._num("supply_temp");
    const tExt = this._num("extract_temp");
    const tExh = this._num("exhaust_temp");
    const hz = this._num("compressor");
    const bypass = this._on("bypass");
    const { mode, action, target } = this._state(hz, tSup, tExt);
    const hpActive = ACTIVE_ACTIONS.has(action);

    let effSensor = this._num("efficiency");
    if (effSensor != null && effSensor > 1) effSensor /= 100;
    const eff = effSensor != null ? effSensor : Number(this._config.efficiency) || 0.8;

    // air temperature between the exchanger and the heat-pump coils
    let freshMid = tSup;
    let extractMid = tExh;
    if (hpActive && tOut != null && tExt != null) {
      freshMid = tOut + (bypass ? 0 : eff) * (tExt - tOut);
      extractMid = tExt - (freshMid - tOut);
    }
    // unit off → air streams turn grey; everything else keeps its colour
    const unitOff = mode === "off";
    const col = (v) => (unitOff ? "var(--hrv-flow-off)" : tempColor(v));
    const cOut = col(tOut), cSup = col(tSup), cExt = col(tExt), cExh = col(tExh);
    const cFM = col(freshMid), cEM = col(extractMid);
    [cOut, cOut, cFM, cFM, cSup, cSup].forEach((c, i) => (this._stops.fresh[i].style.stopColor = c));
    [cExt, cExt, cEM, cEM, cExh, cExh].forEach((c, i) => (this._stops.extract[i].style.stopColor = c));
    r.aOut.style.fill = cOut;
    r.aExt.style.fill = cExt;
    r.aExh.style.fill = cExh;
    r.aSup.style.fill = cSup;

    r.tOut.textContent = this._fmtTemp(tOut, "outdoor_temp");
    r.tSup.textContent = this._fmtTemp(tSup, "supply_temp");
    r.tExt.textContent = this._fmtTemp(tExt, "extract_temp");
    r.tExh.textContent = this._fmtTemp(tExh, "exhaust_temp");

    let effShown = effSensor;
    if (effShown == null && !hpActive && !bypass && !unitOff && tOut != null && tExt != null && tSup != null && Math.abs(tExt - tOut) > 2) {
      effShown = (tSup - tOut) / (tExt - tOut);
    }
    r.eff.textContent = unitOff ? "" : bypass ? t.bypass.toLowerCase() : effShown != null ? `${Math.round(Math.max(0, Math.min(1, effShown)) * 100)}%` : "";
    r.hx.classList.toggle("bypass", bypass);

    const setFan = (rotor, label, flow, f) => {
      rotor.classList.toggle("off", !f.dur);
      if (f.dur) rotor.style.setProperty("--d", `${f.dur.toFixed(2)}s`);
      label.textContent = f.label;
      flow.classList.toggle("off", !f.dur);
      if (f.dur) flow.style.setProperty("--d", `${(f.dur * 0.55).toFixed(2)}s`);
    };
    // unit off → fans stand still and show "Off", whatever the fan entities report
    const fanOff = { dur: 0, label: t.fanOff };
    setFan(r.fanS, r.fanSl, r.fFresh, mode === "off" ? fanOff : this._fan("supply_fan"));
    setFan(r.fanE, r.fanEl, r.fExt, mode === "off" ? fanOff : this._fan("exhaust_fan"));

    // heating → supply coil is the condenser (hot), exhaust coil the evaporator (cold)
    // cooling / drying → reversed; defrost → hot gas to the exhaust coil
    const supCoil = action === "heating" ? "hot" : action === "cooling" || action === "drying" ? "cold" : "";
    const exhCoil = action === "heating" ? "cold" : action === "cooling" || action === "drying" || action === "defrost" ? "hot" : "";
    r.coilR.setAttribute("class", `coil ${supCoil}`);
    r.coilL.setAttribute("class", `coil ${exhCoil}`);
    const rev = action === "cooling" || action === "drying" || action === "defrost" ? " rev" : "";
    r.refR.setAttribute("class", `ref ${supCoil || (action === "defrost" ? "cold" : "")}${rev}`);
    r.refL.setAttribute("class", `ref ${exhCoil}${rev}`);
    const rd = hz ? Math.max(0.25, 1.4 - hz / 90) : 1;
    r.refR.style.setProperty("--rd", `${rd.toFixed(2)}s`);
    r.refL.style.setProperty("--rd", `${rd.toFixed(2)}s`);
    r.comp.classList.toggle("run", hpActive && (hz == null || hz > 0));
    r.hz.textContent = hz == null ? "" : hz > 0 ? `${Math.round(hz)} Hz` : t.fanOff;

    r.mode.textContent = this._modeText(t, mode, action);
    r.mode.className = `chip ${action}`;
    const showTarget = target != null && !["off", "fan_only"].includes(mode);
    r.target.hidden = !showTarget;
    if (showTarget) r.target.textContent = `${t.target} ${target.toFixed(this._config.decimals)} ${this._config.temperature_unit || "°C"}`;
    const main = this._mainEntity();
    if (!this._config.name && main) r.title.textContent = (this._hass.states[main] && this._hass.states[main].attributes.friendly_name) || "";
    r.bypass.textContent = t.bypass;
    r.bypass.hidden = !bypass;
    r.filter.textContent = t.filter;
    r.filter.hidden = !this._on("filter");

    this.shadowRoot.querySelectorAll(".tile").forEach((el) => {
      const x = this._config.extra[el.dataset.i] || {};
      const res = this._raw(x);
      const a = (res && res.st.attributes) || {};
      let v = res && res.value != null ? String(res.value) : "—";
      const n = parseFloat(v);
      if (res && !Number.isNaN(n) && /^-?[\d.]+$/.test(v.trim())) {
        const d = x.decimals != null && x.decimals !== "" ? Number(x.decimals) : Math.abs(n) >= 100 || Number.isInteger(n) ? 0 : 1;
        v = n.toFixed(d);
      }
      const unit = x.unit != null && x.unit !== "" ? x.unit : x.attribute ? "" : a.unit_of_measurement || "";
      el.querySelector(".v").textContent = unit ? `${v} ${unit}` : v;
      el.querySelector(".n").textContent = x.name || (x.attribute ? cap(String(x.attribute).replace(/_/g, " ")) : a.friendly_name) || x.entity || "";
      const icon = el.querySelector("ha-icon");
      if (icon) icon.setAttribute("icon", x.icon || a.icon || "mdi:information-outline");
    });
  }
}

// ---------------------------------------------------------------------------
// Visual editor
// ---------------------------------------------------------------------------

const EDITOR_STYLE = `
:host { display: block; }
.sec { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
.sec > summary {
  list-style: none; cursor: pointer; padding: 12px 16px; font-weight: 500;
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  color: var(--primary-text-color);
}
.sec > summary::-webkit-details-marker { display: none; }
.sec > summary::after { content: "▾"; color: var(--secondary-text-color); transition: transform .2s; }
.sec:not([open]) > summary::after { transform: rotate(-90deg); }
.sec .hint-s { font-weight: 400; font-size: 0.8rem; color: var(--secondary-text-color); margin-left: auto; }
.body { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 14px; }
.src-label { font-size: 0.85rem; font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; }
.hint { font-size: 0.8rem; color: var(--secondary-text-color); line-height: 1.45; }
.speeds { display: flex; flex-direction: column; gap: 6px; }
.srow { display: grid; grid-template-columns: 22px minmax(0,1fr) minmax(0,1fr) auto; gap: 6px; align-items: center; }
.srow .idx { color: var(--secondary-text-color); font-variant-numeric: tabular-nums; text-align: right; font-size: 0.85rem; }
.srow input {
  box-sizing: border-box; font: inherit; min-width: 0; padding: 8px 10px; border-radius: 6px;
  border: 1px solid var(--divider-color, #ccc);
  background: var(--secondary-background-color, var(--card-background-color, #fff));
  color: var(--primary-text-color);
}
.srow input:focus { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: -1px; }
.btns { display: flex; gap: 2px; }
button.ic, button.act {
  font: inherit; cursor: pointer; border-radius: 6px; color: var(--primary-text-color);
  background: transparent; border: 1px solid transparent;
}
button.ic { width: 30px; height: 30px; padding: 0; color: var(--secondary-text-color); }
button.ic:hover:not(:disabled) { background: var(--secondary-background-color, rgba(127,127,127,.12)); color: var(--primary-text-color); }
button.ic:disabled { opacity: .3; cursor: default; }
button.act { padding: 7px 12px; border-color: var(--divider-color, #ccc); color: var(--primary-color, #03a9f4); font-weight: 500; }
button.act:hover { background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent); }
button:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.xrow { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.xhead { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--secondary-text-color); }
.empty { font-size: 0.85rem; color: var(--secondary-text-color); font-style: italic; }
`;

const EDITOR_LABELS = {
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

const SOURCE_SCHEMA = [
  {
    name: "", type: "grid", schema: [
      { name: "entity", selector: { entity: {} } },
      { name: "attribute", selector: { attribute: {} }, context: { filter_entity: "entity" } },
    ],
  },
];

class HrvCardEditor extends HTMLElement {
  setConfig(config) {
    const json = JSON.stringify(config);
    if (this._built && json === this._lastEmitted) return; // our own change coming back
    this._config = JSON.parse(json || "{}");
    this._config.entities = this._config.entities || {};
    this._config.fan_speeds = this._config.fan_speeds || [];
    this._config.extra = this._config.extra || [];
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) this.shadowRoot.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
  }

  connectedCallback() {
    this._ensureComponents().then(() => this._build());
  }

  /** ha-form and the entity picker are lazy-loaded in HA; force-load them. */
  async _ensureComponents() {
    if (customElements.get("ha-form") && customElements.get("ha-entity-picker")) return;
    try {
      if (window.loadCardHelpers) {
        const helpers = await window.loadCardHelpers();
        const c = await helpers.createCardElement({ type: "entities", entities: [] });
        if (c && c.constructor.getConfigElement) await c.constructor.getConfigElement();
      }
    } catch (e) { /* ignore */ }
    await customElements.whenDefined("ha-form");
  }

  _emit() {
    const cfg = JSON.parse(JSON.stringify(this._config));
    // tidy: drop empty sources, empty lists
    for (const [k, v] of Object.entries(cfg.entities)) {
      const s = normSource(v);
      if (!s) delete cfg.entities[k];
      else cfg.entities[k] = s.attribute ? { entity: s.entity, attribute: s.attribute } : s.entity;
    }
    if (!cfg.entity) delete cfg.entity;
    cfg.fan_speeds = cfg.fan_speeds.filter((s) => s.state !== "" || s.label !== "");
    if (!cfg.fan_speeds.length) delete cfg.fan_speeds;
    if (!cfg.extra.length) delete cfg.extra;
    this._lastEmitted = JSON.stringify(cfg);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
  }

  _form(schema, data, onChange) {
    const f = document.createElement("ha-form");
    f.hass = this._hass;
    f.computeLabel = (s) => EDITOR_LABELS[s.label_key || s.name] || s.label || s.name;
    f.schema = schema;
    f.data = data;
    f.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      onChange(ev.detail.value);
      this._emit();
    });
    return f;
  }

  _sourceBlock(key, label) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="src-label">${esc(label)}</div>`;
    const s = normSource(this._config.entities[key]) || {};
    wrap.appendChild(this._form(SOURCE_SCHEMA, { entity: s.entity || "", attribute: s.attribute || "" }, (v) => {
      const prev = normSource(this._config.entities[key]) || {};
      // clear the attribute when the entity changes
      const attribute = v.entity !== prev.entity && prev.entity ? "" : v.attribute;
      this._config.entities[key] = v.entity ? { entity: v.entity, attribute: attribute || undefined } : "";
      if (attribute !== v.attribute) {
        const f = wrap.querySelector("ha-form");
        f.data = { entity: v.entity, attribute: "" };
      }
    }));
    return wrap;
  }

  _section(title, hint, open = false) {
    const d = document.createElement("details");
    d.className = "sec";
    d.open = open;
    d.innerHTML = `<summary>${esc(title)}${hint ? `<span class="hint-s">${esc(hint)}</span>` : ""}</summary><div class="body"></div>`;
    this._root.appendChild(d);
    return d.querySelector(".body");
  }

  _build() {
    if (!this._config || !customElements.get("ha-form")) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const openState = {};
    this.shadowRoot.querySelectorAll("details.sec").forEach((d, i) => (openState[i] = d.open));
    this.shadowRoot.innerHTML = `<style>${EDITOR_STYLE}</style><div id="root"></div>`;
    this._root = this.shadowRoot.getElementById("root");
    const c = this._config;

    // General
    let body = this._section("General", "", true);
    body.appendChild(this._form([
      { name: "name", selector: { text: {} } },
      { name: "entity", label_key: "main_entity", selector: { entity: {} } },
      {
        name: "", type: "grid", schema: [
          { name: "language", selector: { select: { mode: "dropdown", options: [
            { value: "auto", label: "Same as Home Assistant" }, { value: "en", label: "English" },
            { value: "nl", label: "Nederlands" }, { value: "fr", label: "Français" }, { value: "de", label: "Deutsch" },
          ] } } },
          { name: "decimals", selector: { number: { min: 0, max: 2, step: 1, mode: "box" } } },
          { name: "efficiency", selector: { number: { min: 0, max: 1, step: 0.01, mode: "box" } } },
          { name: "show_header", selector: { boolean: {} } },
        ],
      },
    ], {
      name: c.name || "", entity: c.entity || "", language: c.language || "auto", decimals: c.decimals ?? 1,
      efficiency: c.efficiency ?? 0.8, show_header: c.show_header !== false,
    }, (v) => Object.assign(this._config, v)));

    // Temperatures
    body = this._section("Air temperatures", "4 sensors");
    SOURCES.filter((s) => s.group === "temps").forEach((s) => body.appendChild(this._sourceBlock(s.key, s.label)));

    // Fans
    body = this._section("Fans", "speed & labels");
    SOURCES.filter((s) => s.group === "fans").forEach((s) => body.appendChild(this._sourceBlock(s.key, s.label)));
    const sp = document.createElement("div");
    sp.className = "speeds";
    body.appendChild(sp);
    this._speedsEl = sp;
    this._renderSpeeds();
    body.appendChild(this._form([{ name: "fan_levels", selector: { number: { min: 0, max: 20, step: 1, mode: "box" } } }],
      { fan_levels: c.fan_levels || "" }, (v) => {
        if (v.fan_levels) this._config.fan_levels = Number(v.fan_levels); else delete this._config.fan_levels;
      }));

    // Heat pump
    body = this._section("Heat pump", "");
    SOURCES.filter((s) => s.group === "hp").forEach((s) => body.appendChild(this._sourceBlock(s.key, s.label)));
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "In auto the card heats when the set temperature is above the extract air and cools when it is below, within the dead band. If you set a current action entity, it takes priority. Below, list the values your mode entity uses for each mode, separated by commas. Leave a field empty to use the standard Home Assistant values (heat, cool, auto, dry, fan_only, off).";
    body.appendChild(hint);
    const hs = c.heat_pump_states || {};
    body.appendChild(this._form([
      { name: "", type: "grid", schema: MODE_KEYS.map((k) => ({ name: k, selector: { text: {} } })) },
      { name: "auto_deadband", selector: { number: { min: 0, max: 5, step: 0.1, mode: "box" } } },
    ], {
      ...Object.fromEntries(MODE_KEYS.map((k) => [k, hs[k] || (k === "heat" ? hs.heating : k === "cool" ? hs.cooling : "") || ""])),
      auto_deadband: c.auto_deadband ?? 0.5,
    }, (v) => {
      const out = {};
      for (const k of MODE_KEYS) if (v[k]) out[k] = v[k];
      if (Object.keys(out).length) this._config.heat_pump_states = out; else delete this._config.heat_pump_states;
      if (v.auto_deadband !== "" && v.auto_deadband != null && Number(v.auto_deadband) !== 0.5) this._config.auto_deadband = Number(v.auto_deadband);
      else delete this._config.auto_deadband;
    }));

    // Status
    body = this._section("Bypass, filter & efficiency", "optional");
    SOURCES.filter((s) => s.group === "status").forEach((s) => body.appendChild(this._sourceBlock(s.key, s.label)));

    // Extra tiles
    body = this._section("Extra tiles", "power, energy, …");
    this._extraEl = document.createElement("div");
    this._extraEl.style.cssText = "display:flex;flex-direction:column;gap:10px";
    body.appendChild(this._extraEl);
    this._renderExtras();

    this.shadowRoot.querySelectorAll("details.sec").forEach((d, i) => { if (i in openState) d.open = openState[i]; });
    this._built = true;
  }

  // ----- fan speed steps -----
  _renderSpeeds() {
    const list = this._config.fan_speeds;
    const el = this._speedsEl;
    el.innerHTML = `
      <div class="src-label">Fan speed steps</div>
      <div class="hint">List the values your fan entity reports, from slowest to fastest. The position sets how fast the fan spins. The label is what the card shows, so use it to translate. Steps named "off" or "0" stop the fan.</div>
      ${list.length ? "" : `<div class="empty">No steps yet: percentages and common words (low, medium, high) work without them.</div>`}
      ${list.map((s, i) => `
        <div class="srow" data-i="${i}">
          <span class="idx">${i + 1}</span>
          <input class="st" value="${esc(s.state)}" placeholder="Value, e.g. low" aria-label="Value ${i + 1}">
          <input class="lb" value="${esc(s.label || "")}" placeholder="Label shown" aria-label="Label ${i + 1}">
          <span class="btns">
            <button class="ic" data-a="up" title="Move up" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="ic" data-a="down" title="Move down" aria-label="Move down" ${i === list.length - 1 ? "disabled" : ""}>↓</button>
            <button class="ic" data-a="del" title="Remove" aria-label="Remove">✕</button>
          </span>
        </div>`).join("")}
      <div class="actions">
        <button class="act" data-a="add">Add step</button>
        <button class="act" data-a="import">Import values from supply fan</button>
      </div>
      <div class="hint" data-r="importMsg"></div>`;

    el.querySelectorAll(".srow input").forEach((inp) => inp.addEventListener("change", () => {
      const i = Number(inp.closest(".srow").dataset.i);
      list[i][inp.classList.contains("st") ? "state" : "label"] = inp.value.trim();
      this._emit();
    }));
    el.querySelectorAll("button[data-a]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.a;
      const row = b.closest(".srow");
      const i = row ? Number(row.dataset.i) : -1;
      if (a === "add") list.push({ state: "", label: "" });
      if (a === "del") list.splice(i, 1);
      if (a === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (a === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      if (a === "import") {
        const msg = this._importSpeeds();
        this._renderSpeeds();
        el.querySelector('[data-r="importMsg"]').textContent = msg;
        this._emit();
        return;
      }
      this._renderSpeeds();
      if (a === "add") el.querySelector(".srow:last-of-type .st")?.focus();
      this._emit();
    }));
  }

  /** Fill the steps from the entity's list of options (fan_modes, preset_modes, options…). */
  _importSpeeds() {
    const src = normSource(this._config.entities.supply_fan) || normSource(this._config.entities.exhaust_fan);
    if (!src || !this._hass) return "Pick a supply fan entity first.";
    const st = this._hass.states[src.entity];
    if (!st) return `${src.entity} was not found.`;
    const a = st.attributes || {};
    const candidates = [src.attribute && `${src.attribute}s`, "fan_modes", "preset_modes", "options", "speed_list"].filter(Boolean);
    const key = candidates.find((k) => Array.isArray(a[k]) && a[k].length);
    if (!key) return `No list of values found on ${src.entity}. Add the steps by hand.`;
    const old = Object.fromEntries(this._config.fan_speeds.map((s) => [String(s.state).toLowerCase(), s.label]));
    this._config.fan_speeds.splice(0, this._config.fan_speeds.length,
      ...a[key].map((v) => ({ state: String(v), label: old[String(v).toLowerCase()] || "" })));
    return `Imported ${a[key].length} values from ${key}. Check the order (slowest first) and fill in the labels.`;
  }

  // ----- extra tiles -----
  _renderExtras() {
    const list = this._config.extra;
    const el = this._extraEl;
    el.innerHTML = "";
    if (!list.length) el.innerHTML = `<div class="empty">No extra tiles yet.</div>`;
    list.forEach((x, i) => {
      const row = document.createElement("div");
      row.className = "xrow";
      row.innerHTML = `<div class="xhead"><span>Tile ${i + 1}</span><span class="btns">
          <button class="ic" data-a="up" aria-label="Move up" title="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="ic" data-a="down" aria-label="Move down" title="Move down" ${i === list.length - 1 ? "disabled" : ""}>↓</button>
          <button class="ic" data-a="del" aria-label="Remove" title="Remove">✕</button></span></div>`;
      row.appendChild(this._form([
        ...SOURCE_SCHEMA,
        {
          name: "", type: "grid", schema: [
            { name: "name", label: "Name", selector: { text: {} } },
            { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
            { name: "unit", selector: { text: {} } },
            { name: "decimals", label_key: "decimals_x", selector: { number: { min: 0, max: 4, step: 1, mode: "box" } } },
          ],
        },
      ], { ...x }, (v) => {
        const clean = {};
        for (const [k, val] of Object.entries(v)) if (val !== "" && val != null) clean[k] = val;
        list[i] = clean;
      }));
      row.querySelectorAll(".xhead button").forEach((b) => b.addEventListener("click", () => {
        const a = b.dataset.a;
        if (a === "del") list.splice(i, 1);
        if (a === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
        if (a === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
        this._renderExtras();
        this._emit();
      }));
      el.appendChild(row);
    });
    const add = document.createElement("div");
    add.className = "actions";
    add.innerHTML = `<button class="act">Add tile</button>`;
    add.querySelector("button").addEventListener("click", () => {
      list.push({ entity: "" });
      this._renderExtras();
      this._emit();
    });
    el.appendChild(add);
  }
}

if (!customElements.get("hrv-card")) customElements.define("hrv-card", HrvCard);
if (!customElements.get("hrv-card-editor")) customElements.define("hrv-card-editor", HrvCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === "hrv-card")) {
  window.customCards.push({
    type: "hrv-card",
    name: "HRV Card",
    description: "Heat recovery ventilation with heat pump: animated air flow, fans and heat-pump coils.",
    preview: true,
  });
}
