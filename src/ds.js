// Parses a DESIGN.md (and optional CSS / docs / assets) into one lookup model.
// Files are only ever read. Call configure() once, then load() on every query.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve, basename } from "node:path";
import YAML from "yaml";

let CFG = null;

// design: path to DESIGN.md (required). css: token stylesheets (optional).
// docs: extra markdown with rules (optional). assets: icon folder (optional).
// scope: CSS selector that holds the tokens (optional; auto-detected).
// examples: HTML pages that already use the component classes (optional, for snippets).
export function configure({ design, css = [], docs = [], assets = null, scope = null, examples = [] }) {
  if (!design || !existsSync(design)) throw new Error(`DESIGN.md not found: ${design}`);
  CFG = {
    design: resolve(design),
    css: css.map((f) => resolve(f)),
    docs: docs.map((f) => resolve(f)),
    assets: assets ? resolve(assets) : null,
    examples: examples.map((f) => resolve(f)),
    scope,
  };
  CFG.root = dirname(CFG.design);
  cache = null;
  return CFG;
}
export const config = () => CFG;

// ---------- value helpers ----------
const norm = (v) => String(v).toLowerCase().replace(/\s+/g, "").replace(/(^|[^\d])\.(\d)/g, "$10.$2");

export function parseColor(v) {
  const s = String(v).trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}
const colorDist = (x, y) =>
  Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2 + ((x.a - y.a) * 255) ** 2);

// ---------- markdown ----------
function sections(md, file) {
  const out = [];
  let cur = null;
  let inFront = md.startsWith("---");
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inFront) { if (i > 0 && line.trim() === "---") inFront = false; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      cur = { file, level: h[1].length, title: h[2].trim(), body: [] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ ...s, body: s.body.join("\n").trim() }));
}

function tables(text) {
  const rows = [];
  let header = null;
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) { header = null; continue; }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (!header) { header = cells; continue; }
    rows.push({ header, cells });
  }
  return rows;
}

// ---------- css ----------
function cssRules(css) {
  let clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Lift `@media (prefers-color-scheme: dark) { … }` bodies out, tagging their selectors as dark.
  const rules = [];
  for (;;) {
    const at = clean.search(/@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/);
    if (at < 0) break;
    let i = clean.indexOf("{", at) + 1, depth = 1;
    const start = i;
    while (depth && i < clean.length) depth += clean[i] === "{" ? 1 : clean[i] === "}" ? -1 : 0, i++;
    for (const m of clean.slice(start, i - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      rules.push({ selector: m[1].split(";").pop().trim().replace(/\s+/g, " "), body: m[2].trim().replace(/\s+/g, " "), media: "dark" });
    }
    clean = clean.slice(0, at) + clean.slice(i);
  }
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules.push({ selector: m[1].split(";").pop().trim().replace(/\s+/g, " "), body: m[2].trim().replace(/\s+/g, " ") });
  }
  return rules;
}
function cssVars(body) {
  const vars = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) vars[m[1]] = m[2].trim();
  return vars;
}

// ---------- assets ----------
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [relative(CFG.root, p)];
  });
}

// Light tokens live on `:root` / `html` or one scope selector (auto: the selector
// declaring the most custom properties). Dark = the same selector under a dark marker.
const DARK = /\[data-theme=["']?dark["']?\]|\.dark(?![\w-])|\.theme-dark/;
const DARK_ALL = new RegExp(DARK.source, "g");
function themeVars(rules, scopeArg) {
  const count = {};
  for (const r of rules) if (!r.media) for (const part of r.selector.split(",")) {
    const sel = part.trim();
    if (!DARK.test(sel) && !/\s/.test(sel)) count[sel] = (count[sel] ?? 0) + Object.keys(cssVars(r.body)).length;
  }
  const scope = scopeArg ?? Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ":root";
  const roots = new Set([scope, ":root", "html"]);
  const isRoot = (p) => roots.has(p.replace(DARK_ALL, "").trim() || ":root");
  const light = {}, dark = {};
  for (const r of rules) {
    const parts = r.selector.split(",").map((p) => p.trim());
    const isDark = r.media === "dark" ? parts.some(isRoot) : parts.some((p) => DARK.test(p) && isRoot(p));
    if (isDark) Object.assign(dark, cssVars(r.body));
    else if (!r.media && parts.some((p) => roots.has(p))) Object.assign(light, cssVars(r.body));
  }
  return { scope, light, dark };
}

// ---------- component catalog ----------
// Walk the stylesheet in order: section comments name a group, and each rule's first
// class after the scope is a reusable component class (".app .btn-primary:hover" → btn-primary).
function catalog(cssText, scope) {
  const scopeCls = scope?.startsWith(".") ? scope.slice(1) : null;
  const groups = [];
  let cur = { title: "general", classes: new Set() };
  groups.push(cur);
  for (const m of cssText.matchAll(/\s*(?:\/\*([\s\S]*?)\*\/|([^{}]+?)\{([^{}]*)\})/g)) {
    if (m[1] !== undefined) {
      const dashed = m[1].match(/-{3,}\s*(.+?)\s*-{3,}/);
      const boxed = /={3,}/.test(m[1]) && m[1].split("\n").map((l) => l.trim()).find((l) => l && !/^=+$/.test(l));
      const title = dashed?.[1] ?? (boxed ? boxed.split(/\s+[—(]/)[0] : null);
      if (title) groups.push((cur = { title: title.toLowerCase(), classes: new Set() }));
      continue;
    }
    const sel = m[2].split(";").pop();
    for (const part of sel.split(",")) {
      const classes = [...part.matchAll(/\.([a-z][\w-]*)/g)].map((x) => x[1]).filter((c) => c !== scopeCls);
      if (classes[0]) cur.classes.add(classes[0]);
    }
  }
  return groups.filter((g) => g.classes.size).map((g) => ({ title: g.title, classes: [...g.classes] }));
}

// First element in the example pages whose class list contains `cls`, as compact HTML.
function exampleFor(html, cls, max = 900) {
  const re = new RegExp(`<([a-z0-9]+)\\b[^>]*class="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  let depth = 0, i = m.index;
  const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, "gi");
  tagRe.lastIndex = i;
  for (let t; (t = tagRe.exec(html)); ) {
    if (t[2]) continue; // self-closing
    depth += t[1] ? -1 : 1;
    if (depth === 0) { i = tagRe.lastIndex; break; }
  }
  const out = html.slice(m.index, i).replace(/\s+/g, " ").replace(/> </g, "><");
  return out.length > max ? out.slice(0, max) + " …" : out;
}

// ---------- build model ----------
let cache = null;
let cacheKey = "";

export function load() {
  if (!CFG) throw new Error("configure() first");
  const files = [CFG.design, ...CFG.css, ...CFG.docs];
  const key = files.map((f) => { try { return statSync(f).mtimeMs; } catch { return 0; } }).join("|");
  if (cache && key === cacheKey) return cache;

  const designMd = readFileSync(CFG.design, "utf8");
  const fm = designMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const front = fm ? YAML.parse(fm[1]) ?? {} : {};
  const secs = [
    ...sections(designMd, basename(CFG.design)),
    ...CFG.docs.flatMap((f) => { try { return sections(readFileSync(f, "utf8"), basename(f)); } catch { return []; } }),
  ];
  const cssTexts = CFG.css.map((f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } });
  const rules = cssTexts.flatMap(cssRules);
  const { scope, light, dark } = themeVars(rules, CFG.scope);
  const groups = cssTexts.flatMap((t) => catalog(t, scope));
  const exampleHtml = CFG.examples.map((f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } }).join("\n");

  // Resolve {group.name} references in YAML.
  const resolveRef = (v, depth = 0) => {
    if (typeof v !== "string" || depth > 5) return v;
    const m = v.match(/^\{([\w-]+)\.([\w-]+)\}$/);
    if (!m) return v;
    return resolveRef(front[m[1]]?.[m[2]], depth + 1);
  };

  // Usage notes: any table row whose first cell names a token in backticks.
  const notes = {};
  const uses = {};
  for (const s of secs) {
    for (const { header, cells } of tables(s.body)) {
      const names = [...cells[0].matchAll(/`(--[\w-]+)`/g)].map((m) => m[1]);
      // "`--success` / `-subtle`" → also --success-subtle
      for (const m of cells[0].matchAll(/`(-[\w-]+)`/g)) if (!m[1].startsWith("--") && names[0]) names.push(names[0] + m[1]);
      const row = header.map((h, i) => `${h}: ${cells[i] ?? ""}`).join(" · ");
      const use = /^use$/i.test(header.at(-1)) ? cells.at(-1) : "";
      for (const n of names) {
        notes[n] = notes[n] ? notes[n] + " | " + row : row;
        if (use) uses[n] = use.replace(/\*\*/g, "");
      }
    }
  }
  // Prose lines that mention a CSS var (rules, do/don't).
  const mentions = {};
  for (const s of secs) for (const line of s.body.split("\n")) {
    if (line.trim().startsWith("|")) continue;
    for (const m of line.matchAll(/`(--[\w-]+)`/g)) (mentions[m[1]] ??= []).push(line.trim());
  }

  // Token index: every addressable token, with both names where values match.
  const tokens = {};
  const add = (id, t) => (tokens[id] = { id, ...t });
  for (const [name, v] of Object.entries(light)) {
    add(name, { group: "css", css: `var(${name})`, light: v, dark: dark[name] ?? v, use: uses[name], note: notes[name], rules: mentions[name] });
  }
  for (const [name, v] of Object.entries(dark)) if (!light[name]) add(name, { group: "css", css: `var(${name})`, light: null, dark: v, use: uses[name], note: notes[name] });
  for (const g of ["colors", "typography", "rounded", "spacing"]) {
    for (const [name, raw] of Object.entries(front[g] ?? {})) {
      const value = typeof raw === "object" ? raw : String(raw);
      // Only link within the same family: rounded ↔ --r-*, spacing ↔ --s-*, colours ↔ the rest.
      const family = { rounded: (k) => k.startsWith("--r-"), spacing: (k) => k.startsWith("--s-") }[g] ?? ((k) => !/^--[rs]-/.test(k));
      const cssMatch = typeof value === "string"
        ? Object.keys(light).filter(family).filter((k) => norm(light[k]) === norm(value) || (parseColor(light[k]) && parseColor(value) && colorDist(parseColor(light[k]), parseColor(value)) < 0.5))
        : [];
      add(`${g}.${name}`, {
        group: g, value, use: cssMatch.map((k) => uses[k]).find(Boolean),
        css: cssMatch.map((k) => ({ var: `var(${k})`, dark: dark[k] ?? light[k] })),
      });
    }
  }

  // Components: YAML spec (resolved) + matching CSS classes.
  // Prose: the ### under "## Components" whose title shares the most words with the name.
  const compStart = secs.findIndex((s) => s.level === 2 && /^components$/i.test(s.title));
  const compSecs = [];
  for (let i = compStart + 1; compStart >= 0 && i < secs.length && secs[i].level > 2; i++) compSecs.push(secs[i]);
  // A section goes to the component(s) whose name words it contains most, and all of them.
  // "button" is optional so button-secondary → "Secondary / glass / quiet".
  const nameWords = (name) => { const ws = name.split("-"); const rest = ws.filter((w) => w !== "button"); return rest.length ? rest : ws; };
  const overlap = (name, title) => nameWords(name).filter((w) => title.toLowerCase().includes(w)).length;
  const names = Object.keys(front.components ?? {});
  const proseFor = (name) => compSecs.find((sec) => {
    const n = overlap(name, sec.title);
    return n > 0 && n === nameWords(name).length && n >= Math.max(...names.map((o) => overlap(o, sec.title)));
  }) ?? (name.includes("-") ? proseFor(name.replace(/-[^-]+$/, "")) : null); // card-dark → card
  const components = {};
  for (const [name, spec] of Object.entries(front.components ?? {})) {
    const resolved = Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, { ref: v, value: resolveRef(v) }]));
    const prose = proseFor(name);
    components[name] = { name, spec: resolved, prose: prose ? { title: prose.title, body: prose.body } : null };
  }

  // Brand ramps + chart series (palette hexes that aren't tokens but are legal).
  const palette = [];
  for (const s of secs.filter((x) => /palette/i.test(x.title))) {
    for (const { header, cells } of tables(s.body)) cells.slice(1).forEach((c, i) => {
      const hex = c.match(/#[0-9A-Fa-f]{6}/)?.[0];
      if (hex) palette.push({ id: `${cells[0]} ${header[i + 1]}`, value: hex });
    });
    for (const m of s.body.matchAll(/`(#[0-9A-Fa-f]{6})`\s*(?:\(([\w ]+)\))?/g)) palette.push({ id: `chart ${m[2] ?? m[1]}`, value: m[1] });
  }

  // Token (crypto asset) colours.
  const assetFiles = (() => { try { return CFG.assets ? walk(CFG.assets) : []; } catch { return []; } })();
  const assets = [];
  const tkSec = secs.find((s) => /token colou?r/i.test(s.title));
  if (tkSec) for (const { cells } of tables(tkSec.body)) {
    const hue = cells[1]?.match(/#[0-9A-Fa-f]{6}/)?.[0];
    if (hue) assets.push({ symbol: cells[0], hue, rule: cells[2], fallback: /other|fallback/i.test(cells[0]) });
  }

  cache = { front, secs, rules, groups, exampleHtml, scope, light, dark, tokens, components, palette, assets, assetFiles, tkRules: tkSec?.body ?? "" };
  cacheKey = key;
  return cache;
}

// ---------- queries ----------
const STOP = new Set("a an the for of to on in and or with use used colour color token value what which my is".split(" "));
export const words = (s, stop = STOP) => String(s ?? "").toLowerCase().split(/[^a-z0-9#]+/).filter((w) => w && !stop.has(w));
// Loose match: "fail" ~ "failed", "confirm" ~ "confirmed".
const like = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));
export const hits = (q, text, stop) => { const ws = words(text, stop); return q.filter((w) => ws.some((x) => like(w, x))).length; };

// Stylesheet classes that implement a component name.
// "button-primary" → btn-primary · "bottom-sheet" → sheet · "preview-tint-fallback" → preview-card
const GENERIC = new Set(["text", "dark", "light", "tag", "dot", "fallback", "default", "md", "sm", "lg"]);
export function classesFor(name) {
  const { groups } = load();
  const all = [...new Set(groups.flatMap((g) => g.classes))];
  const n = name.toLowerCase();
  const exact = [n, n.replace(/^button/, "btn"), n.replace(/-dark$/, "")].filter((c) => all.includes(c));
  if (exact.length) return [...new Set(exact)];
  const words = n.split("-").filter((w) => w.length > 2 && !GENERIC.has(w));
  return all.filter((c) => words.includes(c) || (words[0]?.length >= 4 && c.startsWith(words[0] + "-"))).slice(0, 4);
}
export function cssRulesFor(name) {
  const { rules } = load();
  const classes = [...new Set([name, ...classesFor(name)])];
  const matched = rules.filter((r) => classes.some((c) => new RegExp(`\\.${c}(?![\\w-])`).test(r.selector)));
  return matched.slice(0, 6).map((r) => `${r.selector} { ${r.body} }`);
}
export function exampleOf(cls) {
  const { exampleHtml } = load();
  return exampleHtml ? exampleFor(exampleHtml, cls) : null;
}

export function findSection(query) {
  const { secs } = load();
  const stop = new Set(["a", "the", "and", "of"]);
  const q = words(query, stop);
  return secs
    .map((s) => ({ s, score: hits(q, s.title, stop) * 3 + hits(q, s.body, stop) * 0.1 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

export function search(intent, limit = 5) {
  const { tokens, components } = load();
  const q = words(intent);
  const scored = [];
  // Per query word, take its strongest field: name / "Use" column (3) > section title (2) > prose (1).
  const score = (name, use = "", text = "") => q.reduce((n, w) =>
    n + (hits([w], name) || hits([w], use) ? 3 : hits([w], text) ? 1 : 0), 0);
  for (const t of Object.values(tokens)) {
    const s = score(t.id, t.use, [t.note, ...(t.rules ?? [])].join(" "));
    if (s) scored.push({ kind: "token", id: t.id, s });
  }
  for (const c of Object.values(components)) {
    const s = score(c.name, c.prose?.title);
    if (s) scored.push({ kind: "component", id: c.name, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit);
}

export function nearest(value, limit = 3) {
  const m = load();
  const c = parseColor(value);
  if (c) {
    const pool = [
      ...Object.entries(m.light).map(([k, v]) => ({ id: `var(${k})`, mode: "light", v })),
      ...Object.entries(m.dark).map(([k, v]) => ({ id: `var(${k})`, mode: "dark", v })),
      ...Object.entries(m.front.colors ?? {}).map(([k, v]) => ({ id: `colors.${k}`, mode: "yaml", v })),
      ...m.palette.map((p) => ({ id: `palette ${p.id}`, mode: "illustration/charts only", v: p.value })),
    ].map((p) => ({ ...p, c: parseColor(p.v) })).filter((p) => p.c);
    return pool.map((p) => ({ ...p, d: colorDist(c, p.c) })).sort((a, b) => a.d - b.d).slice(0, limit);
  }
  const px = String(value).match(/^([\d.]+)px$/);
  if (px) {
    const n = +px[1];
    const pool = [];
    for (const g of ["spacing", "rounded"]) for (const [k, v] of Object.entries(m.front[g] ?? {})) pool.push({ id: `${g}.${k}`, v, n: parseFloat(v) });
    for (const [k, v] of Object.entries(m.front.typography ?? {})) pool.push({ id: `typography.${k}.fontSize`, v: v.fontSize, n: parseFloat(v.fontSize) });
    return pool.map((p) => ({ ...p, d: Math.abs(p.n - n) })).sort((a, b) => a.d - b.d).slice(0, limit);
  }
  return null;
}
