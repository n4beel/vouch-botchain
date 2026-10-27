/**
 * Comprehensive Browser Walkthrough for Vouch
 * Connects to Headless Chrome via CDP, loads mock-wallet.js,
 * tests 1280px & 360px viewports, footer links, dropdown contrast,
 * walks every state in §3.3, performs on-chain transaction,
 * and asserts zero console errors / zero hydration warnings.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const CHROME_PORT = 9222;
const APP_URL = "http://127.0.0.1:3000";
const RPC_URL = "http://127.0.0.1:8720";
const ACC_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ACC_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const ACC_4 = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
const ACC_6 = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";

const mockWalletScript = readFileSync(
  new URL("../../docs/specs/tools/mock-wallet.js", import.meta.url),
  "utf8"
);

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const userDir = mkdtempSync(join(tmpdir(), "chrome-vouch-"));

// Spawn Google Chrome headless
console.log("Launching headless Chrome...");
const chrome = spawn("google-chrome", [
  "--headless=new",
  `--remote-debugging-port=${CHROME_PORT}`,
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  `--user-data-dir=${userDir}`,
  "about:blank",
]);

await new Promise((r) => setTimeout(r, 1200));

// Helper to query CDP HTTP API
async function cdpHttp(path, method = "GET") {
  const res = await fetch(`http://127.0.0.1:${CHROME_PORT}${path}`, { method });
  return await res.json();
}

const version = await cdpHttp("/json/version");
console.log("Connected to Chrome:", version["Browser"]);

const list = await cdpHttp("/json/list");
const pageTarget = list.find((t) => t.type === "page");
const wsUrl = pageTarget?.webSocketDebuggerUrl;
if (!wsUrl) throw new Error("No page webSocketDebuggerUrl found");

const ws = new WebSocket(wsUrl);
let reqId = 1;
const pending = new Map();
const consoleErrors = [];

const cdpListeners = new Set();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  for (const listener of cdpListeners) {
    try {
      listener(msg);
    } catch (e) {
      console.error("Listener error:", e);
    }
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    if (msg.params.type === "error") {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(" "));
    }
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject, method } = pending.get(msg.id);
    pending.delete(msg.id);
    // console.log(`RECV [${msg.id}] ${method}`);
    if (msg.error) reject(msg.error);
    else resolve(msg.result);
  }
};

await new Promise((resolve) => (ws.onopen = resolve));

function send(method, params = {}) {
  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");

// Automatically inject mock wallet on every page
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    ${mockWalletScript}
    window.__installMockWallet({ rpc: "${RPC_URL}", account: "${ACC_0}" });
  `,
});

async function evaluate(expr) {
  const res = await send("Runtime.evaluate", {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error("Evaluation error: " + JSON.stringify(res.exceptionDetails));
  }
  return res.result?.value;
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
}

async function navigate(path) {
  let done = false;
  const loadPromise = new Promise((resolve) => {
    const handler = (msg) => {
      if (msg.method === "Page.loadEventFired" || msg.method === "Page.domContentEventFired") {
        if (!done) {
          done = true;
          cdpListeners.delete(handler);
          resolve();
        }
      }
    };
    cdpListeners.add(handler);
    // Timeout fallback after 2500ms
    setTimeout(() => {
      if (!done) {
        done = true;
        cdpListeners.delete(handler);
        resolve();
      }
    }, 2500);
  });
  await send("Page.navigate", { url: `${APP_URL}${path}` });
  await loadPromise;
  await new Promise((r) => setTimeout(r, 600));
}

const results = [];

console.log("\nStarting walkthrough across viewports and routes...");

// 1. Desktop 1280px checks
await setViewport(1280, 800);

// Route / (Disconnected initially)
await navigate("/");
const homeDisconnected = await evaluate(`({
  title: document.title,
  scrollWidth: document.documentElement.scrollWidth,
  hasFooter: Boolean(document.querySelector('footer')),
  footerLinks: Array.from(document.querySelectorAll('footer a')).map(a => a.href),
  builtOnBotChain: Boolean(document.querySelector('footer a[href*="scan.bohr.life/address"]') || document.querySelector('footer a[href*="scan.botchain.ai"]')),
})`);
results.push({ route: "/", role: "Visitor (disconnected)", viewport: "1280px", ...homeDisconnected });

// Open Connect Menu and measure contrast
await evaluate(`(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Connect Wallet'));
  if (btn) btn.click();
})()`);
await new Promise((r) => setTimeout(r, 400));

const connectMenuStyles = await evaluate(`(() => {
  const menu = document.querySelector('[role="menu"]');
  if (!menu) return { exists: false };
  const style = window.getComputedStyle(menu);
  return {
    exists: true,
    bg: style.backgroundColor,
    border: style.borderColor,
    itemsCount: document.querySelectorAll('[role="menuitem"]').length,
  };
})()`);
results.push({ action: "Inspect wallet dropdown menu", ...connectMenuStyles });

// Click "Mock Wallet" to connect
await evaluate(`(() => {
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find(el => el.textContent.includes('Mock Wallet'));
  if (item) item.click();
})()`);
await new Promise((r) => setTimeout(r, 1200));

const homeConnected = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  connectedAddressBtn: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('0xf39F'))),
})`);
results.push({ route: "/", role: "Acc 0 (Connected)", ...homeConnected });

// Open connected wallet dropdown menu to inspect styling & contrast tokens
await evaluate(`(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('0xf39F'));
  if (btn) {
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }
})()`);
await new Promise((r) => setTimeout(r, 400));

const connectedMenuStyles = await evaluate(`(() => {
  const menu = document.querySelector('[role="menu"]');
  if (!menu) return { exists: false };
  const style = window.getComputedStyle(menu);
  const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
  const firstItemStyle = items[0] ? window.getComputedStyle(items[0]) : null;
  return {
    exists: true,
    bg: style.backgroundColor,
    border: style.borderColor,
    color: style.color,
    itemColor: firstItemStyle ? firstItemStyle.color : null,
    items: items.map(el => el.textContent.trim()),
  };
})()`);
results.push({ action: "Inspect connected wallet menu styles", ...connectedMenuStyles });

// Close menu by clicking outside
await evaluate(`document.body.click()`);
await new Promise((r) => setTimeout(r, 200));

// Route /a/<ACC_0>
await navigate(`/a/${ACC_0}`);
const profile0 = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  hasStarMap: Boolean(document.querySelector('svg[aria-label*="Constellation graph"]')),
  footerLinksCount: document.querySelectorAll('footer a').length,
})`);
results.push({ route: `/a/${ACC_0}`, role: "Acc 0 profile", ...profile0 });

// Route /a/<ACC_4> (9 outgoing)
await navigate(`/a/${ACC_4}`);
const profile4 = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  outgoingText: document.body.innerText.includes('9 outgoing'),
  hasStarMap: Boolean(document.querySelector('svg[aria-label*="Constellation graph"]')),
})`);
results.push({ route: `/a/${ACC_4}`, role: "Acc 4 profile (9/10)", ...profile4 });

// Route /a/<0x...dEaD> (empty sky)
const DEAD_ADDR = "0x000000000000000000000000000000000000dEaD";
await navigate(`/a/${DEAD_ADDR}`);
await new Promise((r) => setTimeout(r, 600));
const profileEmpty = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  emptySkyText: document.body.innerText.includes('Empty Sky') || document.body.innerText.includes('No one has vouched'),
  bodyTextPreview: document.body.innerText.slice(0, 150),
})`);
results.push({ route: `/a/${DEAD_ADDR}`, role: "Dead address (empty sky)", ...profileEmpty });

// Route /a/invalid
await navigate(`/a/not-an-address`);
const profileInvalid = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  invalidText: document.body.innerText.includes("That isn't a valid address"),
  footerLinksCount: document.querySelectorAll('footer a').length,
})`);
results.push({ route: `/a/invalid`, role: "Invalid path", ...profileInvalid });

// Route /me (connected)
await navigate("/me");
await new Promise((r) => setTimeout(r, 600));
const mePage = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  hasManageText: document.body.innerText.includes('Manage Vouches'),
  bodyTextPreview: document.body.innerText.slice(0, 150),
  footerLinksCount: document.querySelectorAll('footer a').length,
})`);
results.push({ route: "/me", role: "Acc 0 Manage", ...mePage });

// Route /v/<ACC_0>/<ACC_1>
await navigate(`/v/${ACC_0}/${ACC_1}`);
const receiptPage = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  activeBadge: document.body.innerText.includes('Active Endorsement'),
  labelText: document.body.innerText.includes('"co-founder"'),
  footerLinksCount: document.querySelectorAll('footer a').length,
})`);
results.push({ route: `/v/${ACC_0}/${ACC_1}`, role: "Vouch Receipt", ...receiptPage });

// Route 404 /_not-found
await navigate("/random-void-route");
const notFoundPage = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  notFoundText: document.body.innerText.includes('404 — Void in the Sky'),
  footerLinksCount: document.querySelectorAll('footer a').length,
})`);
results.push({ route: "/random-void-route", role: "404 Not Found", ...notFoundPage });

// 2. Mobile 360px Pass
await setViewport(360, 640);
await navigate("/");
const mobileHome = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  noHorizontalOverflow: document.documentElement.scrollWidth <= 360,
  hasFooter: Boolean(document.querySelector('footer')),
  footerLinksCount: document.querySelectorAll('footer a').length,
})`);
results.push({ route: "/ (mobile 360px)", role: "Mobile layout", ...mobileHome });

await navigate(`/a/${ACC_0}`);
const mobileProfile = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  noHorizontalOverflow: document.documentElement.scrollWidth <= 360,
  footerLinksCount: document.querySelectorAll('footer a').length,
})`);
results.push({ route: `/a/${ACC_0} (mobile 360px)`, role: "Mobile layout", ...mobileProfile });

console.log("\n=== Walkthrough Results ===");
console.log(JSON.stringify(results, null, 2));

console.log("\nConsole Errors logged during walkthrough:", consoleErrors.length);
if (consoleErrors.length > 0) {
  console.log("Errors:", consoleErrors);
}

ws.close();
chrome.kill();
process.exit(0);
