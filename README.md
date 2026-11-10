# Learn Secrets & Access for AI Agents with Phoebe

Six 45-minute sessions for builders and platform engineers wiring an LLM agent to real systems
through tools and MCP servers: give the agent its own identity, decide whose authority each call
carries, scope every tool, keep keys out of the context window, gate what cannot be undone, and
prove afterwards what it did. By Phoebe Fu.

Running case: Halyard, a constructed logistics SaaS and its ops agent (tickets, warehouse, refunds,
chat, fetch). Every session adds a page to Halyard's agent access plan.

## The bench

`assets/asa-live.js` runs a breadth-first search over a graph built from `assets/asa-sample.js`:
untrusted entry points, the agent, its tools, their credentials and scopes, and the actions those
scopes allow, plus what an attacker can call directly with a key that leaves through an ungated way
out. It reports sensitive actions reachable without a gate, the weighted blast radius, stolen-key
reach, keys readable in the context, approvals and the lethal-trifecta flag.

Scope and permission names for Gmail, Slack and GitHub are real (read 2026-11-10); Halyard, its
warehouse and payments scope names and every weight are constructed.

Verify the engine against the Python reference:

```
python3 materials/build-asa-sample.py .      # regenerate the sample
python3 materials/compare-ladder.py .        # node engine vs materials/asa_reference.py, by value
```

## Sessions

1. What the agent is holding
2. Whose authority: the agent's own, or the user's
3. Scope the tool, not the agent
4. Keep the key out of the context window
5. When the agent must ask first
6. Prove what it did, then sign the plan

Static site, no build step: open `index.html`.
