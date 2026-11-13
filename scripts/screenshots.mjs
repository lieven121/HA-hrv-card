/*
 * Regenerates the README screenshots in docs/ from the dev page (mocked hass),
 * using a headless Chromium browser. Set BROWSER to its path if it isn't found.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const CANDIDATES = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/chromium", "/usr/bin/google-chrome",
];
const browser = CANDIDATES.find((p) => p && existsSync(p));
if (!browser) throw new Error("No Chromium browser found; set BROWSER=/path/to/chrome");

const SHOTS = [
  { file: "card-light.png", query: "card=0&theme=light", height: 440 },
  { file: "card-dark.png", query: "card=0&theme=dark", height: 440 },
  { file: "card-summer.png", query: "card=1&theme=light", height: 470 },
];

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: "error" });
await server.listen();
const out = resolve("docs");
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "hrv-shot-"));

try {
  for (const s of SHOTS) {
    // async: the Vite server runs in this process and must keep serving meanwhile
    await promisify(execFile)(browser, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${profile}`,
      `--window-size=472,${s.height}`, "--virtual-time-budget=6000",
      `--screenshot=${join(out, s.file)}`, `http://localhost:5199/?${s.query}`,
    ]);
    console.log(`docs/${s.file}`);
  }
} finally {
  await server.close();
}
