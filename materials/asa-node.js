// Run the browser engine (assets/asa-live.js) in node on the shipped sample and print the canon
// as JSON, in the same shape as materials/asa_reference.py --json. Usage: node materials/asa-node.js <repo>
const fs = require("fs"), path = require("path"), vm = require("vm");
const repo = process.argv[2] || path.join(__dirname, "..");
const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(repo, "assets/asa-sample.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(repo, "assets/asa-live.js"), "utf8"), ctx);
const A = ctx.ASA;
const RUNGS = [
  ["r0", "Day one: one shared admin key", {}],
  ["r1", "One credential per tool", { cred: "pertool" }],
  ["r2", "Scopes cut to the job", { cred: "pertool", scopes: "cut" }],
  ["r3", "Keys behind a broker", { cred: "pertool", scopes: "cut", broker: true }],
  ["r4", "Gates on irreversible actions", { cred: "pertool", scopes: "cut", broker: true, gates: "irrev" }],
  ["r5", "On-behalf-of for rep requests", { cred: "pertool", scopes: "cut", broker: true, gates: "irrev", obo: true }]
];
const TRAPS = [
  ["t1", "Finished design, but rep requests also read ticket text", { cred: "pertool", scopes: "cut", broker: true, gates: "irrev", obo: true, mixed: true }],
  ["t2", "Broker on, but the refunds key leaks into a tool error", { cred: "pertool", scopes: "cut", broker: true, leak: true }],
  ["t3", "Gates on the day-one shared key, nothing else", { gates: "irrev" }],
  ["t4", "Finished design, but the warehouse tool keeps its admin role", { cred: "pertool", scopes: "cut", broker: true, gates: "irrev", obo: true, wide: "warehouse" }],
  ["t5", "Finished design with every write gated", { cred: "pertool", scopes: "cut", broker: true, gates: "writes", obo: true }]
];
const CUTS = [
  ["c0", "One credential per tool, nothing cut", { cred: "pertool", cutTools: [] }],
  ["c1", "Cut the refunds tool", { cred: "pertool", cutTools: ["refunds"] }],
  ["c2", "Also cut the warehouse tool", { cred: "pertool", cutTools: ["refunds", "warehouse"] }],
  ["c3", "Also cut the chat tool", { cred: "pertool", cutTools: ["refunds", "warehouse", "chat"] }],
  ["c4", "Also cut the tickets tool", { cred: "pertool", cutTools: ["refunds", "warehouse", "chat", "tickets"] }]
];
function canon(rid, name, o) {
  const r = A.run(o), out = {};
  for (const k of Object.keys(r)) if (k[0] !== "_") out[k] = r[k];
  out.rung = rid; out.name = name;
  return JSON.parse(JSON.stringify(out));
}
const res = { ladder: RUNGS.map(x => canon(...x)), traps: TRAPS.map(x => canon(...x)), cuts: CUTS.map(x => canon(...x)) };
console.log(JSON.stringify(res, null, 1));
