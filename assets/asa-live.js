/* asa-live.js - the blast-radius bench for learn-agent-secrets-access-with-phoebe.
 *
 * A REAL graph search, not a simulation. From asa-sample.js it builds a graph of
 *   entry points (ticket body, customer email, web page fetched, staff chat message)
 *   -> the agent, in a session (its own batch identity, or a rep's request)
 *   -> tools -> the actions each tool's credential has the scope for
 *   -> and, when a credential is readable in the context AND an ungated way out is reachable,
 *      an attacker holding the stolen keys, who calls the providers directly with no gate.
 * It runs a breadth-first search from every UNTRUSTED entry point and reports:
 *   - sensitive actions reachable without passing a gate (the headline)
 *   - the weighted blast radius (sum of sensitivity weights)
 *   - what a stolen key alone reaches, keys readable in context, approvals the gates now ask for
 *   - the lethal-trifecta flag (private data + untrusted input + a way out, all ungated)
 *   - the shortest injected path to the heaviest reachable action, drawn on the graph.
 * Real: Gmail, Slack and GitHub scope names. Constructed: Halyard, its tools, its warehouse and
 * payments scope names, every weight. materials/asa_reference.py runs the same search and
 * materials/compare-ladder.py checks the two engines by value.
 */
(function (root) {
  "use strict";

  var SAMPLE = root.ASA_SAMPLE || null;
  var DEFAULTS = { cred: "shared", scopes: "broad", broker: false, gates: "none", obo: false, mixed: false, leak: false, wide: null, cutTools: null };
  var PRESETS = {
    r0: {},
    r1: { cred: "pertool" },
    r2: { cred: "pertool", scopes: "cut" },
    r3: { cred: "pertool", scopes: "cut", broker: true },
    r4: { cred: "pertool", scopes: "cut", broker: true, gates: "irrev" },
    r5: { cred: "pertool", scopes: "cut", broker: true, gates: "irrev", obo: true }
  };
  var RUNG_NAMES = {
    r0: "Day one: one shared admin key", r1: "One credential per tool", r2: "Scopes cut to the job",
    r3: "Keys behind a broker", r4: "Gates on irreversible actions", r5: "On-behalf-of for rep requests"
  };

  function merge(o) { var r = {}, k; for (k in DEFAULTS) r[k] = DEFAULTS[k]; if (o) for (k in o) r[k] = o[k]; return r; }

  function Engine(sample) {
    var H = sample.halyard, i;
    this.H = H; this.tools = H.tools; this.actions = H.actions; this.entries = H.entries; this.prov = H.providers;
    this.order = {}; for (i = 0; i < H.actions.length; i++) this.order[H.actions[i].id] = i;
  }
  Engine.prototype.broadScopes = function (t) { return this.prov[t.provider].scopes.slice(); };
  Engine.prototype.toolScopes = function (o, t) {
    var cut;
    if (o.cutTools !== null && o.cutTools !== undefined) cut = o.cutTools.indexOf(t.id) >= 0;
    else cut = o.scopes === "cut" && o.wide !== t.id;
    return cut ? this.H.cut[t.id].slice() : this.broadScopes(t);
  };
  Engine.prototype.credFor = function (o, t, S) {
    if (t.provider === null) return null;
    var leak = !!(o.leak && t.id === "refunds"), sc, provs, p, i;
    if (o.obo && t.obo) {
      if (S === "batch") return null;
      var base = this.toolScopes(o, t), rep = this.H.rep.scopes;
      sc = base.filter(function (s) { return rep.indexOf(s) >= 0; });
      return { id: "rep:" + t.id, label: "rep's delegated token (" + t.id + ")", scopes: sc, providers: [t.provider], inContext: (!o.broker) || leak };
    }
    if (o.cred === "shared") {
      sc = []; provs = [];
      if (o.scopes === "broad") {
        for (p in this.prov) { provs.push(p); sc = sc.concat(this.prov[p].scopes); }
      } else {
        for (i = 0; i < this.tools.length; i++) {
          if (this.tools[i].provider === null) continue;
          provs.push(this.tools[i].provider); sc = sc.concat(this.H.cut[this.tools[i].id]);
        }
      }
      return { id: "shared", label: "HALYARD_ADMIN_KEY (shared)", scopes: sc, providers: provs, inContext: (!o.broker) || !!o.leak };
    }
    sc = this.toolScopes(o, t);
    return { id: "key:" + t.id, label: t.id + " key", scopes: sc, providers: [t.provider], inContext: (!o.broker) || leak };
  };
  function gated(o, a) {
    if (o.gates === "irrev") return !!a.irrev;
    if (o.gates === "writes") return a.kind !== "read";
    return false;
  }
  function allows(c, a) { for (var i = 0; i < a.anyOf.length; i++) if (c.scopes.indexOf(a.anyOf[i]) >= 0) return true; return false; }

  Engine.prototype.graph = function (o) {
    var adj = {}, gatedNodes = {}, credsIn = {}, toolCred = {}, self = this;
    function add(u, v, label) { (adj[u] = adj[u] || []).push([v, label || ""]); if (!adj[v]) adj[v] = []; }
    this.entries.forEach(function (e) {
      add("entry:" + e.id, "agent@" + e.session);
      if (o.mixed && e.id === "ticket") add("entry:" + e.id, "agent@rep");
    });
    ["batch", "rep"].forEach(function (S) {
      var keys = [];
      self.tools.forEach(function (t) {
        var tn = "tool:" + t.id + "@" + S;
        add("agent@" + S, tn);
        var c = self.credFor(o, t, S);
        toolCred[t.id + "@" + S] = c;
        if (c !== null && c.inContext && !keys.some(function (k) { return k.id === c.id; })) keys.push(c);
        self.actions.forEach(function (a) {
          if (a.tool !== t.id) return;
          var ok = (t.provider === null) || (c !== null && allows(c, a));
          if (!ok) return;
          var an = "act:" + a.id + "@" + S;
          add(tn, an, c ? c.label : "no credential");
          if (gated(o, a)) gatedNodes[an] = true;
        });
      });
      credsIn[S] = keys;
      if (keys.length) {
        self.actions.forEach(function (a) {
          var an = "act:" + a.id + "@" + S;
          if (a.kind === "out" && adj[an] && !gatedNodes[an]) add(an, "thief@" + S, "keys leave with the request");
        });
        keys.forEach(function (c) {
          self.actions.forEach(function (a) {
            if (c.providers.indexOf(a.provider) >= 0 && allows(c, a)) add("thief@" + S, "thief:" + a.id + "@" + S, c.label);
          });
        });
      }
    });
    return { adj: adj, gatedNodes: gatedNodes, credsIn: credsIn, toolCred: toolCred };
  };

  Engine.prototype.run = function (opts) {
    var o = merge(opts), g = this.graph(o), self = this;
    var A = {}; this.actions.forEach(function (a) { A[a.id] = a; });
    var reached = {}, reachedOrder = [], thiefReached = {}, gatedHit = {}, keysSeen = [], allReached = {};
    var entryIds = this.entries.map(function (e) { return e.id; });
    this.entries.forEach(function (e) {
      if (e.trusted) return;
      var start = "entry:" + e.id, par = {}, seen = [start], q = [start], h = 0;
      par[start] = null;
      while (h < q.length) {
        var u = q[h++];
        if (g.gatedNodes[u]) continue;
        var out = g.adj[u] || [];
        for (var i = 0; i < out.length; i++) {
          var v = out[i][0];
          if (!Object.prototype.hasOwnProperty.call(par, v)) { par[v] = [u, out[i][1]]; q.push(v); seen.push(v); }
        }
      }
      ["batch", "rep"].forEach(function (S) {
        if (Object.prototype.hasOwnProperty.call(par, "agent@" + S)) {
          g.credsIn[S].forEach(function (c) { if (keysSeen.indexOf(c.id) < 0) keysSeen.push(c.id); });
        }
      });
      seen.forEach(function (n) {
        var aid;
        if (n.indexOf("act:") === 0) {
          aid = n.slice(4).split("@")[0];
          if (g.gatedNodes[n]) gatedHit[aid] = true;
          else { if (!reached[aid]) { reached[aid] = []; reachedOrder.push(aid); } reached[aid].push([e.id, n, par]); allReached[aid] = "agent"; }
        } else if (n.indexOf("thief:") === 0) {
          aid = n.slice(6).split("@")[0];
          thiefReached[aid] = true;
          if (!reached[aid]) { reached[aid] = []; reachedOrder.push(aid); }
          reached[aid].push([e.id, n, par]);
          if (!allReached[aid]) allReached[aid] = "thief";
        }
      });
    });
    var sens = this.H.sensitiveAt, ord = this.order;
    function byOrder(a, b) { return ord[a] - ord[b]; }
    var hit = Object.keys(reached).filter(function (i) { return A[i].w >= sens; }).sort(byOrder);
    var thief = Object.keys(thiefReached).filter(function (i) { return A[i].w >= sens; }).sort(byOrder);
    var gatedS = Object.keys(gatedHit).filter(function (i) { return A[i].w >= sens && !reached[i]; }).sort(byOrder);
    var weighted = 0; hit.forEach(function (i) { weighted += A[i].w; });
    var best = null;
    function less(x, y) { for (var k = 0; k < x.length; k++) { if (x[k] < y[k]) return true; if (x[k] > y[k]) return false; } return false; }
    hit.forEach(function (i) {
      reached[i].forEach(function (rec) {
        var path = [], cur = rec[1], par = rec[2];
        while (cur !== null) { var p = par[cur]; path.push([cur, p ? p[1] : ""]); cur = p ? p[0] : null; }
        path.reverse();
        var key = [-A[i].w, path.length - 1, entryIds.indexOf(rec[0]), ord[i]];
        if (best === null || less(key, best[0])) best = [key, path];
      });
    });
    var steps = best ? best[1].map(function (s) { return { node: s[0], via: s[1] }; }) : [];
    var priv = hit.filter(function (i) { return A[i].kind === "read"; });
    var outs = Object.keys(reached).sort(byOrder).filter(function (i) { return A[i].kind === "out"; });
    var gatedAll = Object.keys(gatedHit).filter(function (i) { return !reached[i]; }).sort(byOrder);
    return {
      headline: hit.length, weighted: weighted, reached: hit, stolen: thief.length, stolenIds: thief,
      keysInContext: keysSeen.length, approvals: gatedS.length, gatedIds: gatedS,
      trifecta: !!(priv.length && outs.length), privateLeg: priv, wayOutLeg: outs,
      pathTarget: best ? best[1][best[1].length - 1][0].split(":")[1].split("@")[0] : null,
      pathHops: best ? best[1].length - 1 : 0, path: steps,
      /* view-only extras (not part of the canon) */
      _o: o, _allReached: allReached, _gatedAll: gatedAll, _toolCred: g.toolCred, _keys: keysSeen
    };
  };

  var ASA = {
    DEFAULTS: DEFAULTS, PRESETS: PRESETS, RUNG_NAMES: RUNG_NAMES,
    engine: SAMPLE ? new Engine(SAMPLE) : null,
    run: function (o) { return ASA.engine.run(o); },
    preset: function (id) { return merge(PRESETS[id] || {}); }
  };
  root.ASA = ASA;
  if (typeof module !== "undefined" && module.exports) module.exports = ASA;
  if (typeof document === "undefined" || !SAMPLE) return;

  /* ====================================================================== widgets */
  var SVGNS = "http://www.w3.org/2000/svg";
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function svgEl(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  var H = SAMPLE.halyard;
  var ACT = {}; H.actions.forEach(function (a) { ACT[a.id] = a; });
  var TOOL = {}; H.tools.forEach(function (t) { TOOL[t.id] = t; });
  function actLabel(id) { return ACT[id] ? ACT[id].label : id; }
  function list(ids) { return ids.length ? ids.map(function (i) { return actLabel(i).toLowerCase(); }).join("; ") : "none"; }

  function nodeText(n) {
    if (n.indexOf("entry:") === 0) { var id = n.slice(6); for (var i = 0; i < H.entries.length; i++) if (H.entries[i].id === id) return H.entries[i].label; }
    if (n === "agent@batch") return "ops agent (its own identity)";
    if (n === "agent@rep") return "ops agent (inside a rep's request)";
    if (n.indexOf("tool:") === 0) return TOOL[n.slice(5).split("@")[0]].label;
    if (n.indexOf("thief@") === 0) return "attacker holding the stolen keys";
    if (n.indexOf("act:") === 0) return actLabel(n.slice(4).split("@")[0]);
    if (n.indexOf("thief:") === 0) return actLabel(n.slice(6).split("@")[0]) + " (direct, no gate)";
    return n;
  }
  function pathText(r) {
    if (!r.path.length) return "No sensitive action is reachable from untrusted input without a gate.";
    var parts = r.path.map(function (s, i) {
      var t = esc(nodeText(s.node)), nx = r.path[i + 1];
      if (nx && nx.via && (nx.node.indexOf("act:") === 0 || nx.node.indexOf("thief:") === 0)) t += ' <span class="as-via">(with ' + esc(nx.via) + ')</span>';
      if (nx && nx.via && nx.node.indexOf("thief@") === 0) t += ' <span class="as-via">(' + esc(nx.via) + ')</span>';
      return t;
    });
    return parts.join(' <span class="as-arr">&#8594;</span> ');
  }

  /* ---------- 1. the blast-radius bench ---------- */
  function mountBench(host) {
    var start = host.getAttribute("data-preset") || "r0";
    var state = ASA.preset(start);
    var title = host.getAttribute("data-title") || "Halyard blast-radius bench";
    host.classList.add("as-bench");
    function seg(key, label, opts) {
      return '<div class="as-ctl"><span class="as-clabel">' + label + '</span><div class="as-seg" role="group" aria-label="' + esc(label) + '">' +
        opts.map(function (p) { return '<button type="button" data-k="' + key + '" data-v="' + p[0] + '">' + p[1] + '</button>'; }).join("") + '</div></div>';
    }
    host.innerHTML =
      '<div class="as-head"><h4>' + esc(title) + '</h4>' +
      '<p class="as-intro">Constructed Halyard example. Halyard&#39;s ops agent reads tickets, customer email and fetched web pages, none of which it can trust. Every lever below rebuilds the graph and the search runs again in your browser: which sensitive actions can a poisoned input reach without a human approving it?</p></div>' +
      '<div class="as-ladder" role="group" aria-label="Ladder presets"><span class="as-clabel">Ladder</span>' +
        ["r0", "r1", "r2", "r3", "r4", "r5"].map(function (k, i) { return '<button type="button" data-preset="' + k + '" title="' + esc(RUNG_NAMES[k]) + '"><b>' + i + '</b> ' + esc(RUNG_NAMES[k]) + '</button>'; }).join("") + '</div>' +
      '<div class="as-controls">' +
        seg("cred", "Credentials", [["shared", "One shared admin key"], ["pertool", "One per tool"]]) +
        seg("scopes", "Scopes", [["broad", "Everything the provider offers"], ["cut", "Cut to the job"]]) +
        seg("broker", "Broker", [["false", "Keys in the agent&#39;s environment"], ["true", "Broker attaches them at call time"]]) +
        seg("gates", "Approval gates", [["none", "None"], ["irrev", "Irreversible actions"], ["writes", "Every write"]]) +
        seg("obo", "Refunds run as", [["false", "The agent&#39;s own identity"], ["true", "The requesting rep (on-behalf-of)"]]) +
        (host.getAttribute("data-percut") ? '<div class="as-ctl as-percut"><span class="as-clabel">Cut scopes tool by tool</span>' +
          ["refunds", "warehouse", "chat", "tickets"].map(function (t) { return '<label class="as-tog"><input type="checkbox" data-cut="' + t + '"> Cut the ' + t + ' tool to its job</label>'; }).join("") +
        '</div>' : '') +
        '<div class="as-ctl as-traps"><span class="as-clabel">Break it</span>' +
          '<label class="as-tog"><input type="checkbox" data-t="leak"> The refunds key leaks into a tool error</label>' +
          '<label class="as-tog"><input type="checkbox" data-t="mixed"> Rep requests also read the ticket text</label>' +
          '<label class="as-tog"><input type="checkbox" data-t="wide"> The warehouse tool keeps its admin role</label>' +
        '</div>' +
      '</div>' +
      '<div class="as-verdict" aria-live="polite"></div>' +
      '<div class="as-metrics"></div>' +
      '<div class="as-path"></div>' +
      '<div class="as-stage"></div>' +
      '<div class="as-tablewrap"><table class="as-table"><thead><tr><th>Action</th><th>Tool</th><th>Needs any of</th><th>Weight</th><th>From untrusted input</th></tr></thead><tbody></tbody></table></div>' +
      '<p class="as-rail">Real: the Gmail, Slack and GitHub scope and permission names, as published (read 2026-11-10). Constructed: Halyard, its tools, its warehouse and payments scope names, the rep, and every sensitivity weight (1 to 10; 3 and up counts as sensitive). Modelled: a key readable in the context leaves through any ungated way out (send email, fetch a URL, export); rep requests name an order id and do not pull ticket text into the run unless you tick the second box.</p>';

    function sync() {
      host.querySelectorAll(".as-seg button").forEach(function (b) {
        var k = b.getAttribute("data-k"), v = b.getAttribute("data-v");
        b.classList.toggle("is-on", String(state[k]) === v);
        b.setAttribute("aria-pressed", String(state[k]) === v ? "true" : "false");
      });
      host.querySelectorAll(".as-traps input").forEach(function (c) {
        var t = c.getAttribute("data-t");
        c.checked = t === "wide" ? (state.cutTools ? (state.wide === "warehouse") : state.wide === "warehouse") : !!state[t];
      });
      host.querySelectorAll(".as-percut input").forEach(function (c) {
        var t = c.getAttribute("data-cut");
        c.checked = state.cutTools ? state.cutTools.indexOf(t) >= 0 : (state.scopes === "cut" && state.wide !== t);
      });
      host.querySelectorAll(".as-ladder button").forEach(function (b) {
        var p = ASA.preset(b.getAttribute("data-preset")), same = true;
        for (var k in DEFAULTS) if (String(p[k]) !== String(state[k])) same = false;
        if (state.cutTools) same = false;
        b.classList.toggle("is-on", same);
      });
      render();
    }
    function metric(label, value, kind, note, bad) {
      return '<div class="as-metric' + (bad ? ' is-bad' : '') + '"><div class="as-mlabel">' + esc(label) + '</div><div class="as-mvalue">' + esc(value) +
        '</div><div class="as-munit">' + esc(note) + '</div><span class="as-mkind is-' + kind + '">' + kind + '</span></div>';
    }
    function render() {
      var r = ASA.run(state);
      var v = host.querySelector(".as-verdict");
      v.className = "as-verdict " + (r.headline <= 2 ? "is-good" : "is-bad");
      v.innerHTML = "<b>" + r.headline + " of " + H.actions.filter(function (a) { return a.w >= H.sensitiveAt; }).length +
        " sensitive actions</b> reachable from untrusted input with no human in the way. Weighted blast radius <b>" + r.weighted + "</b>." +
        (r.trifecta ? " <b>Lethal trifecta: present.</b>" : " Lethal trifecta: broken.");
      host.querySelector(".as-metrics").innerHTML =
        metric("Sensitive actions reachable, no gate", String(r.headline), "computed", "graph search from 3 untrusted entry points", r.headline > 2) +
        metric("Weighted blast radius", String(r.weighted), "computed", "sum of constructed weights", r.weighted > 8) +
        metric("What a stolen key alone reaches", String(r.stolen), "computed", r.stolen ? "sensitive actions, called direct, no gate" : "no key can leave with a request", r.stolen > 0) +
        metric("Keys readable in the context", String(r.keysInContext), "computed", r.keysInContext ? "credentials the model could print" : "the broker holds them", r.keysInContext > 0) +
        metric("Approvals the gates now ask for", String(r.approvals), "computed", "sensitive actions behind a gate", false) +
        metric("Lethal trifecta", r.trifecta ? "present" : "broken", "computed", "private data: " + (r.privateLeg.length ? "yes" : "no") + ", way out: " + (r.wayOutLeg.length ? "yes" : "no"), r.trifecta);
      host.querySelector(".as-path").innerHTML = '<span class="as-clabel">Shortest injected path to the heaviest reachable action' + (r.path.length ? " (" + r.pathHops + " hops)" : "") + '</span><p>' + pathText(r) + '</p>';
      drawGraph(host.querySelector(".as-stage"), r);
      var tb = host.querySelector(".as-table tbody"); tb.innerHTML = "";
      H.actions.forEach(function (a) {
        var st = r._allReached[a.id], g = r._gatedAll.indexOf(a.id) >= 0, s, cls;
        if (st === "agent") { s = "reachable"; cls = "is-hit"; }
        else if (st === "thief") { s = "reachable with a stolen key"; cls = "is-hit"; }
        else if (g) { s = "behind a gate"; cls = "is-gate"; }
        else { s = "out of reach"; cls = "is-off"; }
        var tr = document.createElement("tr"); tr.className = cls;
        tr.innerHTML = "<td>" + esc(a.label) + (a.w < H.sensitiveAt ? " <em>not sensitive</em>" : "") + "</td><td>" + esc(a.tool ? TOOL[a.tool].label : "no tool") +
          "</td><td><code>" + (a.anyOf.length ? a.anyOf.map(esc).join("</code> <code>") : "no credential") + "</code></td><td>" + a.w + (a.irrev ? " <em>irreversible</em>" : "") + "</td><td>" + s + "</td>";
        tb.appendChild(tr);
      });
      host.setAttribute("data-headline", r.headline);
      host.setAttribute("data-weighted", r.weighted);
      host.setAttribute("data-stolen", r.stolen);
    }
    host.querySelectorAll(".as-seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-k"), v = b.getAttribute("data-v");
        state[k] = v === "true" ? true : v === "false" ? false : v;
        state.cutTools = null;
        sync();
      });
    });
    host.querySelectorAll(".as-traps input").forEach(function (c) {
      c.addEventListener("change", function () {
        var t = c.getAttribute("data-t");
        if (t === "wide") {
          state.wide = c.checked ? "warehouse" : null;
          if (state.cutTools) {
            state.cutTools = state.cutTools.filter(function (x) { return x !== "warehouse"; });
            if (!c.checked) state.cutTools.push("warehouse");
          }
        } else state[t] = c.checked;
        sync();
      });
    });
    host.querySelectorAll(".as-ladder button").forEach(function (b) {
      b.addEventListener("click", function () { state = ASA.preset(b.getAttribute("data-preset")); sync(); });
    });
    host.querySelectorAll(".as-percut input").forEach(function (c) {
      c.addEventListener("change", function () {
        var cur = [];
        host.querySelectorAll(".as-percut input").forEach(function (x) { if (x.checked) cur.push(x.getAttribute("data-cut")); });
        state.cutTools = cur; state.wide = null;
        state.scopes = cur.length === 4 ? "cut" : "broad";
        sync();
      });
    });
    sync();
    var api = {
      set: function (o) { state = merge(o); sync(); return ASA.run(state); },
      preset: function (id) { state = ASA.preset(id); sync(); return ASA.run(state); },
      state: function () { var r = ASA.run(state); return { headline: r.headline, weighted: r.weighted, stolen: r.stolen, keys: r.keysInContext, approvals: r.approvals, trifecta: r.trifecta }; }
    };
    root.ASA_BENCH = api;
    (root.ASA_BENCHES = root.ASA_BENCHES || []).push(api);
  }

  /* the graph, drawn: entries | agent | tools (with their key) | actions */
  function drawGraph(stage, r) {
    var o = r._o;
    var groups = [["tickets", ["G1", "G2", "G3"]], ["warehouse", ["W1", "W2", "W3", "W4"]], ["refunds", ["P1", "P2", "P3", "P4"]],
      ["chat", ["S1", "S2", "S3", "S4", "S5"]], ["fetch", ["F1"]], [null, ["H1", "H2", "H3", "H4"]]];
    var top = 58, rowH = 19, gap = 12, y = top, rowY = {}, groupY = [];
    groups.forEach(function (g) {
      var y0 = y;
      g[1].forEach(function (id) { rowY[id] = y + rowH / 2; y += rowH; });
      groupY.push([y0, y]); y += gap;
    });
    var Hh = y + 34;
    var svg = svgEl("svg", { viewBox: "0 0 880 " + Hh, role: "img",
      "aria-label": "Blast-radius graph. " + r.headline + " sensitive actions reachable from untrusted input without a gate. Reachable: " + list(r.reached) + ". Behind a gate: " + list(r._gatedAll) + "." });
    svg.appendChild(svgEl("text", { x: 16, y: 22, "class": "as-svh" }, "FROM A POISONED INPUT TO WHAT IT CAN TOUCH"));
    svg.appendChild(svgEl("text", { x: 16, y: 42, "class": "as-svs" }, "entry points"));
    svg.appendChild(svgEl("text", { x: 196, y: 42, "class": "as-svs" }, "agent"));
    svg.appendChild(svgEl("text", { x: 336, y: 42, "class": "as-svs" }, "tools and the key each holds"));
    svg.appendChild(svgEl("text", { x: 604, y: 42, "class": "as-svs" }, "actions (weight)"));
    var onPath = {};
    r.path.forEach(function (s, i) { if (i > 0) onPath[r.path[i - 1].node + ">" + s.node] = true; onPath[s.node] = true; });
    var lines = svgEl("g", {}), boxes = svgEl("g", {}), labels = svgEl("g", {});
    svg.appendChild(lines); svg.appendChild(boxes); svg.appendChild(labels);

    // entries
    var eY = {}, eTop = top;
    H.entries.forEach(function (e, i) {
      var yy = eTop + i * 62;
      eY[e.id] = yy + 22;
      var hot = onPath["entry:" + e.id];
      boxes.appendChild(svgEl("rect", { x: 16, y: yy, width: 150, height: 44, rx: 9, "class": e.trusted ? "as-box" : (hot ? "as-box-hot" : "as-box-un") }));
      labels.appendChild(svgEl("text", { x: 26, y: yy + 18, "class": "as-svl" }, e.label));
      labels.appendChild(svgEl("text", { x: 26, y: yy + 34, "class": e.trusted ? "as-svs" : "as-svr" }, e.trusted ? "trusted (staff)" : "untrusted"));
    });
    // agent boxes
    var aB = { batch: top + 40, rep: top + 190 };
    ["batch", "rep"].forEach(function (S) {
      var yy = aB[S], hot = onPath["agent@" + S];
      boxes.appendChild(svgEl("rect", { x: 196, y: yy, width: 116, height: 58, rx: 10, "class": hot ? "as-box-hot" : "as-box" }));
      labels.appendChild(svgEl("text", { x: 206, y: yy + 20, "class": "as-svl" }, "ops agent"));
      labels.appendChild(svgEl("text", { x: 206, y: yy + 36, "class": "as-svs" }, S === "batch" ? "own identity," : "inside a rep's"));
      labels.appendChild(svgEl("text", { x: 206, y: yy + 50, "class": "as-svs" }, S === "batch" ? "ticket queue" : "chat request"));
    });
    // entry -> agent edges
    H.entries.forEach(function (e) {
      var targets = [e.session]; if (o.mixed && e.id === "ticket") targets.push("rep");
      targets.forEach(function (S) {
        var hot = onPath["entry:" + e.id + ">agent@" + S];
        lines.appendChild(svgEl("path", { d: "M166 " + eY[e.id] + " C182 " + eY[e.id] + " 180 " + (aB[S] + 29) + " 196 " + (aB[S] + 29), "class": hot ? "as-edge-hot" : (e.trusted ? "as-edge" : "as-edge-un") }));
      });
    });
    // tools
    var tY = {};
    groups.forEach(function (g, gi) {
      var yc = (groupY[gi][0] + groupY[gi][1]) / 2, yy = Math.max(groupY[gi][0] - 2, yc - 24);
      var hgt = Math.max(44, Math.min(48, groupY[gi][1] - groupY[gi][0] + 4));
      yy = yc - hgt / 2;
      if (g[0] === null) {
        var thiefOn = r._keys.length > 0 && r.stolen > 0;
        boxes.appendChild(svgEl("rect", { x: 336, y: yy, width: 196, height: hgt, rx: 9, "class": thiefOn ? "as-box-hot" : "as-box-off" }));
        labels.appendChild(svgEl("text", { x: 346, y: yy + 18, "class": "as-svl" }, "no tool: stolen key only"));
        labels.appendChild(svgEl("text", { x: 346, y: yy + 34, "class": thiefOn ? "as-svr" : "as-svs" }, thiefOn ? "a key left with a request" : "no key leaves"));
        tY.thief = yc;
        return;
      }
      tY[g[0]] = yc;
      var cb = r._toolCred[g[0] + "@batch"], cr = r._toolCred[g[0] + "@rep"], c = cb || cr;
      var hot = onPath["tool:" + g[0] + "@batch"] || onPath["tool:" + g[0] + "@rep"];
      boxes.appendChild(svgEl("rect", { x: 336, y: yy, width: 196, height: hgt, rx: 9, "class": hot ? "as-box-hot" : "as-box" }));
      labels.appendChild(svgEl("text", { x: 346, y: yy + 18, "class": "as-svl" }, TOOL[g[0]].label));
      var keyTxt, keyCls = "as-svs";
      if (g[0] === "fetch") keyTxt = "no credential, any URL";
      else if (!cb && cr) { keyTxt = "rep's token, rep requests only"; keyCls = "as-svg"; }
      else if (c && c.inContext) { keyTxt = (c.id === "shared" ? "shared admin key" : c.label) + ", in context"; keyCls = "as-svr"; }
      else if (c) { keyTxt = c.label + ", brokered"; keyCls = "as-svg"; }
      else keyTxt = "no credential";
      labels.appendChild(svgEl("text", { x: 346, y: yy + 34, "class": keyCls }, keyTxt));
    });
    // agent -> tool edges (one per tool, from the batch agent; rep agent too when on path)
    groups.forEach(function (g) {
      if (g[0] === null) return;
      ["batch", "rep"].forEach(function (S) {
        var hot = onPath["agent@" + S + ">tool:" + g[0] + "@" + S];
        if (S === "rep" && !hot) return;
        lines.appendChild(svgEl("path", { d: "M312 " + (aB[S] + 29) + " C326 " + (aB[S] + 29) + " 322 " + tY[g[0]] + " 336 " + tY[g[0]], "class": hot ? "as-edge-hot" : "as-edge" }));
      });
    });
    // thief edge from the agent column when a key leaves
    if (r.stolen > 0) {
      var wayHot = false; r.path.forEach(function (s) { if (s.node.indexOf("thief@") === 0) wayHot = true; });
      lines.appendChild(svgEl("path", { d: "M254 " + (aB.rep + 58) + " C254 " + (tY.thief) + " 300 " + tY.thief + " 336 " + tY.thief, "class": wayHot ? "as-edge-hot" : "as-edge-un" }));
    }
    // actions
    groups.forEach(function (g) {
      g[1].forEach(function (id) {
        var a = ACT[id], yy = rowY[id], st = r._allReached[id], gt = r._gatedAll.indexOf(id) >= 0;
        var cls = st ? "as-dot-hit" : gt ? "as-dot-gate" : "as-dot-off";
        var from = g[0] === null ? tY.thief : tY[g[0]];
        if (st || gt) {
          var hotE = onPath["act:" + id + "@batch"] || onPath["act:" + id + "@rep"] || onPath["thief:" + id + "@batch"] || onPath["thief:" + id + "@rep"];
          var srcX = 532;
          if (st === "thief" && g[0] !== null) {
            // drawn from the stolen-key box: a direct call, not through the tool
            from = tY.thief;
          }
          lines.appendChild(svgEl("path", { d: "M" + srcX + " " + from + " C566 " + from + " 566 " + yy + " 598 " + yy, "class": hotE ? "as-edge-hot" : (st ? "as-edge-hit" : "as-edge-gate") }));
        }
        if (gt) boxes.appendChild(svgEl("rect", { x: 599, y: yy - 6, width: 12, height: 12, rx: 3, "class": "as-dot-gate" }));
        else boxes.appendChild(svgEl("circle", { cx: 605, cy: yy, r: 5.5, "class": cls }));
        labels.appendChild(svgEl("text", { x: 618, y: yy + 4, "class": st ? "as-svhit" : gt ? "as-svgate" : "as-svoff" },
          a.label + (gt ? " (gate)" : "")));
        labels.appendChild(svgEl("text", { x: 868, y: yy + 4, "text-anchor": "end", "class": st ? "as-svhit" : "as-svoff" }, String(a.w)));
      });
    });
    svg.appendChild(svgEl("text", { x: 16, y: Hh - 12, "class": "as-svs" },
      "Constructed Halyard example. Red: reachable from untrusted input. Brass square: behind an approval gate. Grey: out of reach."));
    stage.innerHTML = ""; stage.appendChild(svg);
  }

  /* ---------- 2. the scope catalogue (real rows) ---------- */
  function mountScopes(host) {
    var C = SAMPLE.catalogue, keys = ["github", "slack", "google"], cur = host.getAttribute("data-provider") || "slack";
    host.classList.add("as-bench");
    host.innerHTML = '<div class="as-head"><h4>The scope catalogue, as the providers publish it</h4>' +
      '<p class="as-intro">Real names, read at source on 2026-11-10. Filter for a word your tool needs ("read", "write", "admin", "send") and see how coarse or fine each provider lets you be.</p></div>' +
      '<div class="as-ctl"><div class="as-seg" role="group" aria-label="Provider">' +
      keys.map(function (k) { return '<button type="button" data-p="' + k + '">' + esc(C[k].name.split(" (")[0]) + '</button>'; }).join("") + '</div></div>' +
      '<div class="as-try"><label class="as-clabel" for="as-scope-q">Filter</label><input id="as-scope-q" type="text" placeholder="e.g. write"></div>' +
      '<p class="as-count" aria-live="polite"></p>' +
      '<div class="as-tablewrap"><table class="as-table"><thead><tr><th>Name</th><th class="as-c2"></th><th>What it grants</th></tr></thead><tbody></tbody></table></div>' +
      '<p class="as-rail as-src"></p>';
    var q = host.querySelector("#as-scope-q");
    function render() {
      host.querySelectorAll(".as-seg button").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-p") === cur); });
      var P = C[cur], f = q.value.trim().toLowerCase();
      host.querySelector(".as-c2").textContent = cur === "github" ? "Level" : cur === "slack" ? "Reads or writes" : "Google's class";
      var rows = P.rows.filter(function (r) { return !f || (r[0] + " " + r[1] + " " + r[2]).toLowerCase().indexOf(f) >= 0; });
      var tb = host.querySelector("tbody"); tb.innerHTML = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.innerHTML = "<td><code>" + esc(r[0]) + "</code></td><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td>";
        tb.appendChild(tr);
      });
      host.querySelector(".as-count").textContent = rows.length + " of " + P.rows.length + " rows shown";
      host.querySelector(".as-src").innerHTML = esc(P.note) + ' Source: <a href="' + esc(P.url) + '">' + esc(P.name) + "</a>, read " + esc(P.read) + ".";
    }
    host.querySelectorAll(".as-seg button").forEach(function (b) { b.addEventListener("click", function () { cur = b.getAttribute("data-p"); render(); }); });
    q.addEventListener("input", render);
    render();
  }

  /* ---------- 3. the whole ladder, computed (session 6) ---------- */
  function mountLadder(host) {
    host.classList.add("as-bench");
    var rows = ["r0", "r1", "r2", "r3", "r4", "r5"].map(function (k) { var r = ASA.run(PRESETS[k]); r.k = k; return r; });
    var max = rows[0].weighted, html = '<div class="as-head"><h4>The whole ladder, computed now</h4>' +
      '<p class="as-intro">Constructed Halyard example. Each rung is the bench above at one preset, searched again in your browser as this page loaded. The bars are the weighted blast radius.</p></div>' +
      '<div class="as-tablewrap"><table class="as-table as-lad"><thead><tr><th>Rung</th><th>Reachable, no gate</th><th>Weighted</th><th class="as-barh">Blast radius</th><th>Stolen key reaches</th><th>Keys in context</th><th>Approvals</th><th>Trifecta</th></tr></thead><tbody>';
    rows.forEach(function (r, i) {
      html += '<tr><td><b>' + i + '</b> ' + esc(RUNG_NAMES[r.k]) + '</td><td>' + r.headline + '</td><td>' + r.weighted + '</td><td class="as-barc"><span class="as-bar" style="width:' + Math.max(2, Math.round(100 * r.weighted / max)) + '%"></span></td><td>' + r.stolen + '</td><td>' + r.keysInContext + '</td><td>' + r.approvals + '</td><td>' + (r.trifecta ? "present" : "broken") + '</td></tr>';
    });
    html += '</tbody></table></div><p class="as-rail">Every number is the engine&#39;s own output for that preset. The weights are constructed; the shape of the fall is the lesson, not the values.</p>';
    host.innerHTML = html;
    host.setAttribute("data-ladder", rows.map(function (r) { return r.headline + "/" + r.weighted; }).join(","));
  }

  function boot() {
    document.querySelectorAll(".asa-bench").forEach(mountBench);
    document.querySelectorAll(".asa-scopes").forEach(mountScopes);
    document.querySelectorAll(".asa-ladder").forEach(mountLadder);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : globalThis);
