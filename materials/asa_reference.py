#!/usr/bin/env python3
"""Python reference for assets/asa-live.js. Same graph, same search order, same tie-breaks.

Usage:
  python3 materials/asa_reference.py <repo>          # human-readable canon
  python3 materials/asa_reference.py <repo> --json   # canon as JSON (compare-ladder.py reads this)

Reads the data straight out of assets/asa-sample.js (the file the browser loads), so both engines
see the same bytes.
"""
from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

DEFAULTS = dict(cred="shared", scopes="broad", broker=False, gates="none", obo=False, mixed=False, leak=False, wide=None, cutTools=None)

RUNGS = [
    ["r0", "Day one: one shared admin key", {}],
    ["r1", "One credential per tool", {"cred": "pertool"}],
    ["r2", "Scopes cut to the job", {"cred": "pertool", "scopes": "cut"}],
    ["r3", "Keys behind a broker", {"cred": "pertool", "scopes": "cut", "broker": True}],
    ["r4", "Gates on irreversible actions", {"cred": "pertool", "scopes": "cut", "broker": True, "gates": "irrev"}],
    ["r5", "On-behalf-of for rep requests", {"cred": "pertool", "scopes": "cut", "broker": True, "gates": "irrev", "obo": True}],
]
TRAPS = [
    ["t1", "Finished design, but rep requests also read ticket text", {"cred": "pertool", "scopes": "cut", "broker": True, "gates": "irrev", "obo": True, "mixed": True}],
    ["t2", "Broker on, but the refunds key leaks into a tool error", {"cred": "pertool", "scopes": "cut", "broker": True, "leak": True}],
    ["t3", "Gates on the day-one shared key, nothing else", {"gates": "irrev"}],
    ["t4", "Finished design, but the warehouse tool keeps its admin role", {"cred": "pertool", "scopes": "cut", "broker": True, "gates": "irrev", "obo": True, "wide": "warehouse"}],
    ["t5", "Finished design with every write gated", {"cred": "pertool", "scopes": "cut", "broker": True, "gates": "writes", "obo": True}],
]

CUTS = [  # session 3: cut scopes one tool at a time, from one credential per tool
    ["c0", "One credential per tool, nothing cut", {"cred": "pertool", "cutTools": []}],
    ["c1", "Cut the refunds tool", {"cred": "pertool", "cutTools": ["refunds"]}],
    ["c2", "Also cut the warehouse tool", {"cred": "pertool", "cutTools": ["refunds", "warehouse"]}],
    ["c3", "Also cut the chat tool", {"cred": "pertool", "cutTools": ["refunds", "warehouse", "chat"]}],
    ["c4", "Also cut the tickets tool", {"cred": "pertool", "cutTools": ["refunds", "warehouse", "chat", "tickets"]}],
]


def load(repo: Path) -> dict:
    s = (repo / "assets" / "asa-sample.js").read_text()
    i = s.index("window.ASA_SAMPLE = ") + len("window.ASA_SAMPLE = ")
    return json.loads(s[i:].rstrip().rstrip(";"))


class Engine:
    def __init__(self, sample: dict):
        self.H = sample["halyard"]
        self.tools = self.H["tools"]
        self.actions = self.H["actions"]
        self.entries = self.H["entries"]
        self.prov = self.H["providers"]
        self.order = {a["id"]: i for i, a in enumerate(self.actions)}

    def broad_scopes(self, tool):
        return list(self.prov[tool["provider"]]["scopes"])

    def tool_scopes(self, o, tool):
        if o["cutTools"] is not None:
            cut = tool["id"] in o["cutTools"]
        else:
            cut = o["scopes"] == "cut" and o["wide"] != tool["id"]
        return list(self.H["cut"][tool["id"]]) if cut else self.broad_scopes(tool)

    def cred_for(self, o, tool, session):
        if tool["provider"] is None:
            return None
        leak = bool(o["leak"] and tool["id"] == "refunds")
        if o["obo"] and tool["obo"]:
            if session == "batch":
                return None
            base = self.tool_scopes(o, tool)
            sc = [s for s in base if s in self.H["rep"]["scopes"]]
            return dict(id="rep:" + tool["id"], label="rep's delegated token (" + tool["id"] + ")", scopes=sc,
                        providers=[tool["provider"]], inContext=(not o["broker"]) or leak)
        if o["cred"] == "shared":
            sc, provs = [], []
            if o["scopes"] == "broad":
                for p in self.prov:
                    provs.append(p)
                    sc += self.prov[p]["scopes"]
            else:
                for t in self.tools:
                    if t["provider"] is None:
                        continue
                    provs.append(t["provider"])
                    sc += self.H["cut"][t["id"]]
            leak_any = bool(o["leak"])
            return dict(id="shared", label="HALYARD_ADMIN_KEY (shared)", scopes=sc, providers=provs,
                        inContext=(not o["broker"]) or leak_any)
        sc = self.tool_scopes(o, tool)
        return dict(id="key:" + tool["id"], label=tool["id"] + " key", scopes=sc, providers=[tool["provider"]],
                    inContext=(not o["broker"]) or leak)

    @staticmethod
    def gated(o, a):
        if o["gates"] == "irrev":
            return bool(a["irrev"])
        if o["gates"] == "writes":
            return a["kind"] != "read"
        return False

    @staticmethod
    def allows(cred, a):
        return any(s in cred["scopes"] for s in a["anyOf"])

    def graph(self, o):
        """Nodes and ordered adjacency. Edge = (to, label)."""
        adj, kind, gated_nodes, creds_in = {}, {}, set(), {}

        def add(u, v, label=""):
            adj.setdefault(u, []).append((v, label))
            adj.setdefault(v, [])

        sessions = ["batch", "rep"]
        for e in self.entries:
            kind["entry:" + e["id"]] = "entry"
            add("entry:" + e["id"], "agent@" + e["session"])
            if o["mixed"] and e["id"] == "ticket":
                add("entry:" + e["id"], "agent@rep")
        for S in sessions:
            keys = []
            for t in self.tools:
                tn = "tool:" + t["id"] + "@" + S
                add("agent@" + S, tn)
                c = self.cred_for(o, t, S)
                if c is not None and c["inContext"] and c["id"] not in [k["id"] for k in keys]:
                    keys.append(c)
                for a in self.actions:
                    if a["tool"] != t["id"]:
                        continue
                    ok = (t["provider"] is None) or (c is not None and self.allows(c, a))
                    if not ok:
                        continue
                    an = "act:" + a["id"] + "@" + S
                    kind[an] = "act"
                    add(tn, an, c["label"] if c else "no credential")
                    if self.gated(o, a):
                        gated_nodes.add(an)
            creds_in[S] = keys
            if keys:
                for a in self.actions:
                    an = "act:" + a["id"] + "@" + S
                    if a["kind"] == "out" and an in adj and an not in gated_nodes:
                        add(an, "thief@" + S, "keys leave with the request")
                for c in keys:
                    for a in self.actions:
                        if a["provider"] in c["providers"] and self.allows(c, a):
                            tn2 = "thief:" + a["id"] + "@" + S
                            kind[tn2] = "thiefact"
                            add("thief@" + S, tn2, c["label"])
        return adj, kind, gated_nodes, creds_in

    def run(self, opts=None):
        o = dict(DEFAULTS)
        o.update(opts or {})
        adj, kind, gated_nodes, creds_in = self.graph(o)
        reached, thief_reached, gated_hit, best_path = {}, set(), set(), None
        keys_seen = []
        for e in self.entries:
            if e["trusted"]:
                continue
            start = "entry:" + e["id"]
            par = {start: None}
            q = deque([start])
            while q:
                u = q.popleft()
                if u in gated_nodes:
                    continue
                for v, lab in adj.get(u, []):
                    if v not in par:
                        par[v] = (u, lab)
                        q.append(v)
            for S in ("batch", "rep"):
                if "agent@" + S in par:
                    for c in creds_in[S]:
                        if c["id"] not in keys_seen:
                            keys_seen.append(c["id"])
            for n in par:
                if n.startswith("act:"):
                    aid = n[4:].split("@")[0]
                    if n in gated_nodes:
                        gated_hit.add(aid)
                    else:
                        reached.setdefault(aid, []).append((e["id"], n, par))
                elif n.startswith("thief:"):
                    aid = n[6:].split("@")[0]
                    thief_reached.add(aid)
                    reached.setdefault(aid, []).append((e["id"], n, par))
        A = {a["id"]: a for a in self.actions}
        sens = self.H["sensitiveAt"]
        hit = sorted([i for i in reached if A[i]["w"] >= sens], key=lambda i: self.order[i])
        thief = sorted([i for i in thief_reached if A[i]["w"] >= sens], key=lambda i: self.order[i])
        gated_s = sorted([i for i in gated_hit if A[i]["w"] >= sens and i not in reached], key=lambda i: self.order[i])
        weighted = sum(A[i]["w"] for i in hit)
        # shortest injected path to the heaviest reachable sensitive action
        best = None
        for i in hit:
            for (eid, node, par) in reached[i]:
                path, cur = [], node
                while cur is not None:
                    p = par[cur]
                    path.append((cur, p[1] if p else ""))
                    cur = p[0] if p else None
                path.reverse()
                hops = len(path) - 1
                key = (-A[i]["w"], hops, [x["id"] for x in self.entries].index(eid), self.order[i])
                if best is None or key < best[0]:
                    best = (key, path)
        steps = []
        if best:
            for node, lab in best[1]:
                steps.append(dict(node=node, via=lab))
        priv = [i for i in hit if A[i]["kind"] == "read"]
        outs = [i for i in sorted(reached, key=lambda i: self.order[i]) if A[i]["kind"] == "out"]
        return dict(headline=len(hit), weighted=weighted, reached=hit, stolen=len(thief), stolenIds=thief,
                    keysInContext=len(keys_seen), approvals=len(gated_s), gatedIds=gated_s,
                    trifecta=bool(priv and outs), privateLeg=priv, wayOutLeg=outs,
                    pathTarget=(best[1][-1][0].split(":")[1].split("@")[0] if best else None),
                    pathHops=(len(best[1]) - 1 if best else 0), path=steps)


def canon(repo: Path) -> dict:
    E = Engine(load(repo))
    out = {"ladder": [], "traps": [], "cuts": []}
    for rid, name, o in RUNGS:
        r = E.run(o)
        r.update(rung=rid, name=name)
        out["ladder"].append(r)
    for rid, name, o in TRAPS:
        r = E.run(o)
        r.update(rung=rid, name=name)
        out["traps"].append(r)
    for rid, name, o in CUTS:
        r = E.run(o)
        r.update(rung=rid, name=name)
        out["cuts"].append(r)
    return out


def main():
    repo = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else Path(__file__).resolve().parent.parent
    c = canon(repo)
    if "--json" in sys.argv:
        print(json.dumps(c, indent=1))
        return
    for r in c["ladder"] + c["traps"] + c["cuts"]:
        print(f"{r['rung']}  {r['name']:58s} headline {r['headline']:2d}  weighted {r['weighted']:3d}  "
              f"stolen {r['stolen']:2d}  keys {r['keysInContext']}  approvals {r['approvals']}  "
              f"trifecta {'YES' if r['trifecta'] else 'no '}  path -> {r['pathTarget']} ({r['pathHops']} hops)")
        print("      reached:", " ".join(r["reached"]), "| gated:", " ".join(r["gatedIds"]))


if __name__ == "__main__":
    main()
