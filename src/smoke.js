// Smoke test: spawns the server over stdio and calls every tool once.
// Run: node src/smoke.js            (uses examples/tidepool)
//      node src/smoke.js --file path/to/DESIGN.md [--css …]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ex = (f) => new URL(`../examples/tidepool/${f}`, import.meta.url).pathname;
const DEMO = ["--file", ex("DESIGN.md"), "--css", ex("tokens.css")];
const client = new Client({ name: "smoke", version: "0" });
await client.connect(new StdioClientTransport({ command: "node", args: [new URL("./server.js", import.meta.url).pathname, ...(process.argv.length > 2 ? process.argv.slice(2) : DEMO)] }));
const calls = [
  ["ds_overview", {}],
  ["get_screen_kit", { task: "approve payment sheet" }],
  ["get_token", { name: "--ink-2" }],
  ["get_token", { name: "primary" }],
  ["get_token", { name: "rounded.lg" }],
  ["find_token", { intent: "copilot suggestion", limit: 4 }],
  ["find_token", { intent: "rejected status", limit: 3 }],
  ["get_component", { name: "button-primary" }],
  ["get_component", { name: "bottom-sheet" }],
  ["check_value", { value: "#0F7B6C" }],
  ["check_value", { value: "#1a73e8" }],
  ["check_value", { value: "18px" }],
  ["get_rules", { topic: "colour rules", max_chars: 600 }],
];
let total = 0;
for (const [name, args] of calls) {
  const r = await client.callTool({ name, arguments: args });
  const t = r.content[0].text;
  total += t.length;
  console.log(`\n### ${name} ${JSON.stringify(args)}  (${t.length} chars)\n${t}`);
}
console.log(`\nTOTAL ${total} chars for ${calls.length} calls`);
await client.close();
