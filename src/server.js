#!/usr/bin/env node
// design-md-mcp: query a DESIGN.md (google-labs-code/design.md format) over MCP.
// Agents ask for one token / component / rule and get a few lines back,
// instead of loading the whole design system into context.
//
//   design-md-mcp --file ./DESIGN.md [--css tokens.css]... [--docs RULES.md]... [--examples showcase.html]...
//                 [--assets ./icons] [--scope .app]
//   design-md-mcp --example tidepool        try the bundled demo design system
//   design-md-mcp init tidepool [dir]       copy the demo into your project
// tokens.css / showcase.html next to DESIGN.md are used automatically when no --css / --examples is given.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { basename, dirname, join, resolve } from "node:path";
import { existsSync, cpSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXAMPLES = join(dirname(fileURLToPath(import.meta.url)), "..", "examples");

// `design-md-mcp init <example> [dir]`: copy a bundled design system into your project.
if (process.argv[2] === "init") {
  const name = process.argv[3] ?? "tidepool";
  const src = join(EXAMPLES, name);
  if (!existsSync(src)) {
    console.error(`Unknown example "${name}". Available: ${readdirSync(EXAMPLES).join(", ")}`);
    process.exit(1);
  }
  const dest = resolve(process.argv[4] ?? name);
  if (existsSync(dest)) { console.error(`${dest} already exists. Pick another folder: init ${name} <dir>`); process.exit(1); }
  cpSync(src, dest, { recursive: true });
  console.log(`Copied the ${name} design system to ${dest}\n\nConnect it (Claude Code):\n  claude mcp add ${name} -- npx -y github:tingowiggle/design-md-mcp --file ${dest}/DESIGN.md\n\nThen ask your agent: "Build a proposal voting screen in the ${name} style."`);
  process.exit(0);
}
import { configure, config, load, search, nearest, cssRulesFor, classesFor, exampleOf, findSection, parseColor, hits, words } from "./ds.js";

function parseArgs(argv) {
  const opts = { design: process.env.DESIGN_MD ?? "DESIGN.md", css: [], docs: [], examples: [], assets: null, scope: null };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=");
    const val = () => inline ?? argv[++i];
    if (flag === "--file") opts.design = val();
    else if (flag === "--css") opts.css.push(...val().split(","));
    else if (flag === "--docs") opts.docs.push(...val().split(","));
    else if (flag === "--assets") opts.assets = val();
    else if (flag === "--examples") opts.examples.push(...val().split(","));
    else if (flag === "--scope") opts.scope = val();
    else if (flag === "--example") opts.design = join(EXAMPLES, val(), "DESIGN.md");
  }
  // Sensible defaults next to DESIGN.md: tokens.css and showcase.html are picked up if present.
  const dir = dirname(resolve(opts.design));
  if (!opts.css.length && existsSync(join(dir, "tokens.css"))) opts.css.push(join(dir, "tokens.css"));
  if (!opts.examples.length && existsSync(join(dir, "showcase.html"))) opts.examples.push(join(dir, "showcase.html"));
  return opts;
}
try {
  configure(parseArgs(process.argv.slice(2)));
  load();
} catch (e) {
  console.error(`design-md-mcp: ${e.message}`);
  process.exit(1);
}

const text = (s) => ({ content: [{ type: "text", text: s }] });
const clip = (s, n) => (s.length > n ? s.slice(0, n) + " …(truncated, ask get_rules for more)" : s);
const show = (v) => (typeof v === "object" ? Object.entries(v).map(([k, x]) => `${k} ${x}`).join(", ") : v);

function fmtToken(t) {
  const lines = [];
  if (t.group === "css") {
    lines.push(`${t.id} → use \`${t.css}\``);
    lines.push(`  light: ${t.light ?? "(dark only)"}${t.dark !== t.light ? ` | dark: ${t.dark}` : " | dark: same"}`);
  } else {
    lines.push(`${t.id} = ${show(t.value)}`);
    if (t.css?.length) lines.push(`  css: ${t.css.map((c) => `${c.var} (dark ${c.dark})`).join(", ")}`);
    else if (t.group === "colors") lines.push("  css: none (YAML-only, no matching CSS var)");
  }
  if (t.use) lines.push(`  use: ${t.use}`);
  for (const r of (t.rules ?? []).slice(0, 2)) lines.push(`  rule: ${clip(r, 220)}`);
  return lines.join("\n");
}

function lookup(name) {
  const { tokens } = load();
  const n = name.trim().replace(/^var\((.*)\)$/, "$1");
  const candidates = [n, `--${n.replace(/^-+/, "")}`, ...["colors", "typography", "rounded", "spacing"].map((g) => `${g}.${n}`)];
  return candidates.map((c) => tokens[c]).find(Boolean);
}

// How to wire the stylesheet in: path, scope wrapper, dark switch.
function setupLines() {
  const m = load();
  const cfg = config();
  if (!cfg.css.length) return [];
  const darkAttr = m.rules.some((r) => /\[data-theme=["']?dark/.test(r.selector)) ? `data-theme="dark"` : m.rules.some((r) => r.media === "dark") ? "(automatic via prefers-color-scheme)" : null;
  const wrap = m.scope.startsWith(".") ? `<div class="${m.scope.slice(1)}">` : null;
  return [
    `SETUP: link ${cfg.css.map((f) => `\`${f}\``).join(", ")} (use a relative path from your file)`,
    ...(wrap ? [`  wrap the UI in ${wrap}${darkAttr ? `; dark theme: add ${darkAttr} on that wrapper` : ""}`] : []),
  ];
}

// "Already built — reuse" block for one or more classes, with an HTML example if one exists.
function useLines(classes) {
  if (!classes.length) return [];
  const out = [`USE (already built in the stylesheet, reuse it, don't rebuild in your own CSS): ${classes.map((c) => `.${c}`).join(" ")}`];
  for (const c of classes) {
    const ex = exampleOf(c);
    if (ex) { out.push(`  example (paths relative to ${basename(config().examples[0])}):`, `  ${ex}`); break; }
  }
  return out;
}

const server = new McpServer({ name: "design-md-mcp", version: "0.1.0" });

server.registerTool(
  "ds_overview",
  {
    description: "Names of every token group and component in the project's design system (no values). Building a screen? Call get_screen_kit first instead.",
    inputSchema: {},
  },
  async () => {
    const m = load();
    const byGroup = {};
    for (const t of Object.values(m.tokens)) (byGroup[t.group] ??= []).push(t.id.replace(/^\w+\./, ""));
    const hasCss = Object.keys(m.light).length > 0;
    const out = [
      `${m.front.name ?? "Design system"}${m.front.description ? ` — ${m.front.description}` : ""}`,
      hasCss
        ? `CSS tokens live on \`${m.scope}\`; dark via [data-theme="dark"] / .dark / prefers-color-scheme. In code prefer CSS vars; YAML names are the spec aliases.`
        : "No CSS loaded: values come from the DESIGN.md YAML only.",
      ...(hasCss ? ["Building a screen? Call get_screen_kit(task) first: it lists reusable component classes. Reuse them before writing CSS."] : []),
      ...Object.entries(byGroup).map(([g, ids]) => `${g} (${ids.length}): ${ids.join(" ")}`),
      `components (${Object.keys(m.components).length}): ${Object.keys(m.components).join(" ")}`,
      ...(m.assets.length ? [`asset colours: ${m.assets.map((a) => a.symbol).join(", ")}`] : []),
      `rule sections: ${m.secs.filter((s) => s.level <= 2).map((s) => s.title).join(" · ")}`,
    ];
    return text(out.join("\n"));
  }
);

server.registerTool(
  "get_token",
  {
    description: "Exact value of one token, light + dark, its CSS var and usage rule. Accepts a CSS var (--action, var(--r-lg)) or a YAML name (primary, colors.primary, rounded.lg, typography.body-md).",
    inputSchema: { name: z.string().describe("Token name, e.g. --text-secondary, primary, rounded.lg") },
  },
  async ({ name }) => {
    const t = lookup(name);
    if (t) return text(fmtToken(t));
    const alt = search(name, 5).map((r) => r.id);
    return text(`No token "${name}". Closest: ${alt.join(", ") || "none"}`);
  }
);

server.registerTool(
  "find_token",
  {
    description: "Find the right token or component for a design intent in plain words, e.g. 'secondary label text', 'failed status', 'agent avatar background', 'network selector'. Returns ranked matches with values.",
    inputSchema: {
      intent: z.string().describe("What the value is for"),
      limit: z.number().int().min(1).max(12).optional().describe("Max results (default 6)"),
    },
  },
  async ({ intent, limit = 6 }) => {
    const { tokens, components } = load();
    const res = search(intent, limit);
    if (!res.length) return text(`Nothing matched "${intent}". Try ds_overview for names.`);
    return text(
      res
        .map((r) =>
          r.kind === "token"
            ? fmtToken(tokens[r.id])
            : `component ${r.id}: ${Object.entries(components[r.id].spec).map(([k, v]) => `${k}=${typeof v.value === "object" ? v.ref : v.value}`).join(", ")}  (get_component for rules)`
        )
        .join("\n")
    );
  }
);

server.registerTool(
  "get_component",
  {
    description: "Full spec for one component: resolved token values, the CSS classes that implement it in the loaded CSS, and its written rules from DESIGN.md.",
    inputSchema: { name: z.string().describe("Component name, e.g. button-primary, chain-chip, bottom-sheet, agent-pill") },
  },
  async ({ name }) => {
    const { components } = load();
    const key = name.trim().toLowerCase().replace(/^\./, "").replace(/\s+/g, "-");
    const c = components[key];
    const classes = classesFor(key);
    if (!c) {
      if (classes.length) return text([...useLines(classes), "css:", ...cssRulesFor(key).map((r) => "  " + r)].join("\n"));
      const alt = search(name, 8).filter((r) => r.kind === "component").map((r) => r.id);
      return text(`No component "${name}". Closest: ${alt.join(", ") || Object.keys(components).join(", ")}. get_screen_kit lists every reusable class.`);
    }
    const out = [`component ${c.name}`, ...useLines(classes), "spec:"];
    for (const [k, v] of Object.entries(c.spec)) {
      out.push(`  ${k}: ${typeof v.value === "object" ? show(v.value) : v.value}${v.ref !== v.value ? `  ← ${v.ref}` : ""}`);
    }
    const css = cssRulesFor(c.name);
    if (css.length) out.push("css:", ...css.map((r) => "  " + r));
    if (c.prose) out.push(`rules (${c.prose.title}):`, clip(c.prose.body, 1200));
    return text(out.join("\n"));
  }
);

server.registerTool(
  "get_screen_kit",
  {
    description: "START HERE when building a screen. One call returns: how to link the stylesheet, every reusable component class (grouped), the components most relevant to the task with an HTML example, and the must-follow rules. Reuse these classes instead of writing new CSS.",
    inputSchema: { task: z.string().describe("The screen you are building, e.g. 'send confirm sheet for USDT', 'swap review', 'onboarding'") },
  },
  async ({ task }) => {
    const m = load();
    const q = words(task);
    const out = [`SCREEN KIT: ${task}`, ...setupLines()];
    // A "## Setup" section in DESIGN.md (extra scripts, icon sprites, fonts) travels with the kit.
    const setup = m.secs.find((x) => /^(setup|getting started|installation)$/i.test(x.title));
    if (setup) out.push("", "SETUP (from DESIGN.md):", clip(setup.body, 900));

    if (m.groups.length) {
      out.push("", "REUSABLE CLASSES (by group):");
      for (const g of m.groups) out.push(`  ${g.title}: ${g.classes.map((c) => "." + c).join(" ")}`);
      // Most relevant groups / classes for this task.
      const ranked = m.groups
        .flatMap((g) => g.classes.map((c) => ({ c, g: g.title, s: hits(q, c.replace(/-/g, " ")) * 3 + hits(q, g.title) })))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s);
      const top = [...new Set(ranked.map((x) => x.c))].slice(0, 6);
      if (top.length) {
        out.push("", `MOST RELEVANT: ${top.map((c) => "." + c).join(" ")}`);
        let shown = 0;
        for (const c of top) {
          const ex = exampleOf(c);
          if (ex && shown < 2) { out.push(`  .${c} example (paths relative to ${basename(config().examples[0])}):`, `  ${ex}`); shown++; }
        }
      }
    }

    const comps = search(task, 12).filter((r) => r.kind === "component").map((r) => r.id).slice(0, 6);
    if (comps.length) out.push("", `YAML COMPONENTS (get_component for spec): ${comps.join(", ")}`);

    // Asset colour if the task names one (e.g. USDT).
    for (const a of m.assets.filter((a) => !a.fallback && q.includes(a.symbol.toLowerCase()))) {
      out.push("", `ASSET ${a.symbol}: hue ${a.hue}, class .tk-${a.symbol.toLowerCase()} on the tinted card (token_for_asset for icon + tint rules)`);
    }

    // Must-follow rules: Do/Don't table + bullet rules from colour and typography sections.
    const rules = [];
    const dd = m.secs.find((x) => /do'?s and don'?ts/i.test(x.title));
    if (dd) for (const line of dd.body.split("\n")) {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length === 2 && !/^-+$/.test(cells[0]) && cells[0] !== "Do") rules.push(`✓ ${cells[0]}  ✗ ${cells[1]}`);
    }
    for (const sec of m.secs.filter((x) => /colou?r rules|^typography$|^colors$/i.test(x.title))) {
      for (const line of sec.body.split("\n")) if (/^\s*-\s/.test(line)) rules.push(line.trim().replace(/^-\s*/, ""));
    }
    if (rules.length) out.push("", "MUST-FOLLOW RULES:", ...rules.map((r) => "  " + clip(r, 200)));
    return text(out.join("\n"));
  }
);

// Only for systems that define a "Token colour" table (crypto / brand-tinted assets).
if (load().assets.length) server.registerTool(
  "token_for_asset",
  {
    description: "Brand colour, CSS class and icon for a crypto asset (USDC, USDT, TRX, ETH…) used by the token-tinted Preview card and token rows. Unknown or multi-colour assets return the fallback rule.",
    inputSchema: { symbol: z.string().describe("Ticker, e.g. USDC") },
  },
  async ({ symbol }) => {
    const { assets, assetFiles, rules, tkRules } = load();
    const sym = symbol.trim().toUpperCase();
    const row = assets.find((a) => a.symbol.toUpperCase() === sym) ?? assets.find((a) => a.fallback);
    const mapped = row && !row.fallback;
    const cls = mapped && rules.some((r) => r.selector.includes(`.tk-${sym.toLowerCase()}`)) ? `.tk-${sym.toLowerCase()}` : ".tk-none";
    const icons = assetFiles.filter((f) => f.toLowerCase().includes(sym.toLowerCase()));
    const bullets = tkRules.split("\n").filter((l) => l.trim().startsWith("-")).map((l) => "  " + l.trim());
    return text(
      [
        `${sym}: ${mapped ? "mapped" : "NOT mapped → fallback"} hue ${row?.hue}${mapped ? "" : " (amount ink stays var(--action))"}`,
        `  class: ${cls} on .preview-card (sets --tk; --tk-ink derives from it)`,
        `  icon: ${icons.join(", ") || "none in assets/ — use a generic disc on var(--chip-fill)"}`,
        `  rule: ${row?.rule ?? "-"}`,
        ...bullets,
      ].join("\n")
    );
  }
);

server.registerTool(
  "check_value",
  {
    description: "Check a hardcoded value (hex, rgba, or px) against the system. Returns the exact token if it exists, else the nearest tokens, so you replace magic numbers with tokens.",
    inputSchema: { value: z.string().describe("e.g. #0080FF, rgba(17,29,74,.4), 18px") },
  },
  async ({ value }) => {
    const res = nearest(value, 4);
    if (!res) return text(`Can't parse "${value}". Pass a hex, rgb(a) or px value.`);
    const exact = res.filter((r) => r.d < 0.5);
    const isColor = !!parseColor(value);
    const fmt = (r) => `${r.id}${r.mode ? ` [${r.mode}]` : ""} = ${r.v}${r.d >= 0.5 ? ` (off by ${isColor ? r.d.toFixed(1) : r.d + "px"})` : ""}`;
    return text(
      exact.length
        ? `IN SYSTEM: ${exact.map(fmt).join("; ")}`
        : `NOT a token. Nearest:\n${res.map((r) => "  " + fmt(r)).join("\n")}`
    );
  }
);

server.registerTool(
  "get_rules",
  {
    description: "Read one rule section of DESIGN.md (or a --docs file) by topic, e.g. 'colour rules', 'dark mode', 'do and don't', 'typography', 'elevation', 'motion'.",
    inputSchema: {
      topic: z.string(),
      max_chars: z.number().int().min(200).max(8000).optional().describe("Default 2500"),
    },
  },
  async ({ topic, max_chars = 2500 }) => {
    const hits = findSection(topic);
    if (!hits.length) return text(`No section for "${topic}". Sections: ${load().secs.map((s) => s.title).join(" · ")}`);
    const [best, ...rest] = hits;
    return text(
      `## ${best.title} (${best.file})\n${clip(best.body, max_chars)}` +
        (rest.length ? `\n\nOther matches: ${rest.slice(0, 5).map((s) => s.title).join(" · ")}` : "")
    );
  }
);

await server.connect(new StdioServerTransport());
