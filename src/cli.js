#!/usr/bin/env node
// Call one tool from the terminal, no MCP client needed.
//   node src/cli.js <tool> '<json args>' -- --file DESIGN.md [--css …]
// e.g. node src/cli.js find_token '{"intent":"failed status"}' -- --file ./DESIGN.md
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const [tool, json = "{}"] = sep < 0 ? argv : argv.slice(0, sep);
const serverArgs = sep < 0 ? [] : argv.slice(sep + 1);
const client = new Client({ name: "design-md-cli", version: "0" });
try {
  // stderr is inherited, so a startup error from the server (e.g. missing DESIGN.md) prints above.
  await client.connect(new StdioClientTransport({ command: "node", args: [new URL("./server.js", import.meta.url).pathname, ...serverArgs] }));
  if (!tool) {
    const { tools } = await client.listTools();
    console.log(tools.map((t) => `${t.name}: ${t.description}`).join("\n"));
  } else {
    const r = await client.callTool({ name: tool, arguments: JSON.parse(json) });
    console.log(r.content.map((c) => c.text).join("\n"));
  }
  await client.close();
} catch (e) {
  console.error(`design-md-cli: ${e instanceof SyntaxError ? `bad JSON args: ${json}` : "server did not start (see message above)"}`);
  process.exit(1);
}
