#!/usr/bin/env node
// Measures how evenly the three brand accents are used across the website and app:
// McKinsey (navy backgrounds, electric blue, cyan) · BCG (greens) · Bain (reds).
// Counts accent uses in source: Tailwind color classes, shared component classes (weighted by how
// often each is used), hex values, and the app's theme tokens / row tones. Plain navy body text
// (text-navy, C.navy as text) is ink, not an accent, so it isn't counted.
// Usage: node scripts/brand-balance.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === "node_modules" || f.startsWith(".")) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(f)) files.push(p);
  }
};
walk(join(ROOT, "src"));
walk(join(ROOT, "mobile/src"));

const firm = { mckinsey: 0, bcg: 0, bain: 0 };
const add = (k, n) => (firm[k] += n);
const count = (s, re) => (s.match(re) ?? []).length;

// Shared CSS component classes → the firm whose color they use (read from globals.css).
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
const componentFirm = {};
for (const m of css.matchAll(/\.([a-z-]+)\s*\{\s*@apply([^;]+);/g)) {
  const body = m[2];
  const f = /\b(bg|text|border)-(bain|alert)\b/.test(body) ? "bain" : /\b(bg|text|border)-(bcg|good)/.test(body) ? "bcg" : /\b(bg|text|border)-(blue|cyan)\b|\bbg-navy\b|\bborder-navy\b/.test(body) ? "mckinsey" : null;
  if (f) componentFirm[m[1]] = f;
}

for (const file of files) {
  if (file.endsWith("globals.css") || file.endsWith("brand-balance.mjs")) continue;
  const s = readFileSync(file, "utf8");
  // Tailwind utility classes (website)
  add("mckinsey", count(s, /\b(?:bg|text|border|ring|fill|stroke|accent|decoration|from|to)-(?:blue|blue-dark|blue-tint|cyan|cyan-tint)\b/g) + count(s, /\b(?:bg|border)-navy(?:-soft)?\b/g));
  add("bcg", count(s, /\b(?:bg|text|border|ring|fill|stroke|accent|decoration)-(?:bcg|bcg-deep|bcg-tint|bcg-fresh|bcg-midnight|good|good-tint)\b/g));
  add("bain", count(s, /\b(?:bg|text|border|ring|fill|stroke|accent|decoration)-(?:bain|bain-dark|bain-tint|alert|alert-tint)\b/g));
  // Shared component classes, weighted by use
  for (const [cls, f] of Object.entries(componentFirm)) add(f, count(s, new RegExp(`["'\` ]${cls}["'\` ]`, "g")));
  // Hex values in components and charts
  add("mckinsey", count(s, /#(?:2251ff|0284c7|00a9f4|1a3fd6|5b83ff)\b/gi));
  add("bcg", count(s, /#(?:21bf61|197a56|96f878|e3fddb)\b/gi));
  add("bain", count(s, /#(?:cc0000|a80000|fdecec)\b/gi));
  // App theme tokens and row tones
  add("mckinsey", count(s, /\bC\.(?:blue|blueTint|cyan|cyanTint)\b/g) + count(s, /backgroundColor:\s*C\.navy\b/g) + count(s, /tone(?:=|:\s*)"(?:blue|cyan|navy)"/g));
  add("bcg", count(s, /\bC\.(?:green|greenDeep|greenTint|greenFresh|good|goodTint)\b/g) + count(s, /tone(?:=|:\s*)"green"/g));
  add("bain", count(s, /\bC\.(?:red|redTint|alert|alertTint)\b/g) + count(s, /tone(?:=|:\s*)"red"/g));
}

// App shared components, weighted by how often each is used. Their color is read from the component source.
const tokenFirm = (tok) => (/^(red|redTint|alert|alertTint)$/.test(tok) ? "bain" : /^(green|greenDeep|greenTint|greenFresh|good|goodTint)$/.test(tok) ? "bcg" : /^(blue|blueTint|cyan|cyanTint|navy)$/.test(tok) ? "mckinsey" : null);
const read = (rel) => readFileSync(join(ROOT, "mobile/src", rel), "utf8");
const ui = read("components/UI.tsx");
const rows = read("components/Rows.tsx");
const voice = read("components/Voice.tsx");
const pick = (src, re) => tokenFirm(src.match(re)?.[1] ?? "");
const appComponents = [
  [/<Eyebrow\b/g, pick(ui, /eyebrow:\s*\{\s*color:\s*C\.(\w+)/)],
  [/<Button\b(?![^>]*kind=)/g, pick(ui, /kind === "primary" \? C\.(\w+)/)],
  [/<Button\b[^>]*kind="dark"/g, pick(ui, /kind === "dark" \? C\.(\w+)/)],
  [/<Button\b[^>]*kind="ghost"/g, pick(ui, /kind === "ghost" && \{ color: C\.(\w+)/)],
  [/<HighlightCard\b/g, pick(rows, /hero:\s*\{[^}]*backgroundColor:\s*C\.(\w+)/)],
  [/<Badge\b(?![^>]*tone=)/g, "bain"],
  [/<ListenButton\b/g, pick(voice, /listenText:\s*\{\s*color:\s*C\.(\w+)/)],
  [/<DictateField\b/g, pick(voice, /name=\{listening \? "stop" : "mic"\} size=\{16\} color=\{listening \? C\.white : C\.(\w+)\}/)],
];
for (const file of files.filter((f) => f.includes("/mobile/src/"))) {
  const s = readFileSync(file, "utf8");
  for (const [re, f] of appComponents) if (f) add(f, count(s, re));
}

const total = firm.mckinsey + firm.bcg + firm.bain;
const pct = (n) => ((n / total) * 100).toFixed(1).padStart(5);
console.log(`Brand accent uses across ${files.length} files (website + app):`);
console.log(`  McKinsey (navy / blue / cyan)  ${String(firm.mckinsey).padStart(4)}  ${pct(firm.mckinsey)}%`);
console.log(`  BCG (greens)                   ${String(firm.bcg).padStart(4)}  ${pct(firm.bcg)}%`);
console.log(`  Bain (reds)                    ${String(firm.bain).padStart(4)}  ${pct(firm.bain)}%`);
