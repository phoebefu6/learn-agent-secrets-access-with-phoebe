# Agent brief - shared by every fan-out page of learn-agent-secrets-access-with-phoebe

Internal build document, filled from course-builder/references/agent-brief.template.md on 2026-11-10.
Never link it from an audience page.

You are writing ONE static HTML session page. No servers, no npm. **If your target file already
exists on disk, do not write it; report that and stop.** Write the file, return its path and one
line of coverage. No HTML in your reply.

## Read first, in this order

1. The template page. Copy its structure, classes, SVG grammar and quiz markup EXACTLY, including
   4 options per quiz question:
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-agent-secrets-access-with-phoebe/courses/01-what-the-agent-is-holding.html`
   For rhythm on a bench page also skim session 6:
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-agent-secrets-access-with-phoebe/courses/06-prove-what-it-did.html`
2. The source map: every verified fact, its evidence tier, per-session coverage, the bench canon and
   the seams. Use ONLY its numbers; never invent a statistic; if a fact is missing, teach the
   uncertainty. Deeper notes with URLs: `materials/research-notes.md` in the same repo.
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-agent-secrets-access-with-phoebe/materials/official-course-map.md`
3. The stylesheet `:root` block (first 30 lines) for palette tokens:
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-agent-secrets-access-with-phoebe/assets/style.css`

## Page skeleton (keep every component)

toolbar (crumb EXACTLY `<a href="../index.html">learn-agent-secrets-access-with-phoebe</a> / Session N of 6`,
#toggle-all, #zoom-toggle) · masthead (eyebrow "Learn Secrets &amp; Access for AI Agents with Phoebe · Session N of 6",
h1 with one `<span class="accent">`, .sub, .chip-row with the level chip "🟡 Core" (sessions 2, 3) or
"🟠 Deeper" (sessions 4, 5), then two `.chip.audience` and `.chip.time` "45 min", .agenda a1-a4 with
flex weights 1/4/5/1) · main.wrap · section#intro (Part 0: kicker, .lede that names the constructed
Halyard example, .legend pills exactly as the template, .callout.win "★ What you walk out with
tonight") · 3 Parts, each `section.section#part-N` with section-kicker (klabel "Part N · covers ...",
h2, `.tag.concept "N min live"`), a `.lede`, ONE figure, `details.card` accordions (summary:
`.mode.live` or `.mode.self`, title, `.mini`, `.caret ▶`), at least one `.callout.example` with
`span.ex-pill` "Real world" on the page · section#demo-N Build-along (kicker klabel "Build-along",
`.tag.demo "★ 22 min · everyone builds"`, .lede, ONE figure OR the bench widget, `.steps > .step`,
each with a `.prompt-box.good` carrying a `span.label` "★ Step N · ..."; the artifact is the next page
of Halyard's agent access plan) · section#exercise Homework (ol, 4 items) · section#quiz (3 x
`.quiz-q data-answer="0-based"`, `p.qtext`, 4 x `button.qopt` "A · ...", `p.qwhy`; one
`p.quiz-score` after the last; vary the correct letter) · section#official, h2 EXACTLY "What this
session teaches, and where it came from", `.covered > .covered-row` (pill solid ✓ / light ◐ + name +
note), then the `.mono` line EXACTLY "Every fact on this page, and its verification tier, is
recorded in the course's source map." · section.cheat#cheatsheet (h3 "Session N cheat sheet <span>·
pin this</span>", .grid-2 of six .cheat-item) · `.callout.next` with `.nx-pill` "Next session" ·
footer.pagefoot · scripts.

Head: the template's social meta block with this page's own title/description/url;
`<title>Session N · <Title> - learn secrets and access for AI agents with phoebe</title>`;
`<link rel="stylesheet" href="../assets/style.css?v=2">`. Nothing else external.

Scripts at the end, exactly: `<script src="../assets/app.js?v=1"></script>`; and ON A BENCH PAGE ONLY
(sessions 3, 4, 5) also `<script src="../assets/asa-sample.js?v=1"></script>` and
`<script src="../assets/asa-live.js?v=3"></script>`.

First `details.card` in the FIRST Part is `open`; no other. Sentence case headings. Warm practitioner
voice, concrete, never dry. Inside prompt-boxes escape `&` `<` `>`. 450 to 650 lines is guidance
about depth, never a target: never collapse whitespace, dissolve a list into a paragraph, or drop a
component to fit.

## The bench widget (sessions 3, 4, 5 only)

Mount with a div; the engine builds everything. Do NOT write your own widget, ids or numbers.
- `<div class="asa-bench" data-preset="rN" data-title="Halyard blast-radius bench: ..."></div>`
  Presets: r0 shared key, r1 one per tool, r2 scopes cut, r3 broker, r4 gates, r5 on-behalf-of.
  Add `data-percut="1"` to show four "cut the X tool" checkboxes (session 3 only).
- `<div class="asa-scopes" data-provider="slack"></div>` the real scope catalogue browser (session 3 only).
The widget has: ladder preset buttons 0-5; segmented controls Credentials, Scopes, Broker, Approval
gates, Refunds run as; "Break it" checkboxes ("The refunds key leaks into a tool error", "Rep requests
also read the ticket text", "The warehouse tool keeps its admin role"); metric tiles; the shortest
injected path; the graph; the action table. Quote ONLY numbers from the map's canon tables, and say
"the bench prints". Weights are constructed: say so near any weighted number.

## Hard rules (a violation is rework)

- NEVER an em dash or en dash, anywhere (prose, code, aria-labels, comments). Hyphen only.
- No meta text: never "this course", "in this course", "the course teaches", "banned here". The two
  exact estate phrases above are the only self-references; "session 5" cross-references are fine.
- Attribution "by Phoebe Fu". Never "built with" a tool.
- Every number comes from the map or is labelled constructed.
- Contested or missing evidence: teach the disagreement; never resolve what the literature has not.
- Anything the map marks Rep (reported) is written as "reported"; drafts are "drafts, not standards".
- NEVER "lottery" or "lotteries".
- English words only.
- Titles, widget ids and class names must not collide with siblings. Never use these h1/h2 strings:
  "Secrets, keys and...", "Credential paths", "tool permission manifest", "Least privilege people
  can...", "Who may see...", "Connectors and blast radius", "Blast radius is a number...".
  Never use the case names Beacon, Tidewell, Callwell, Saltbox, Northwick, Cadence, Kettle & Co, Marchmont.
- Halyard's real-world stories come from the map's sources (MCP spec, RFCs, OWASP, Vault, Willison,
  the two papers, the IETF drafts, Stripe, the scope references). Never invent an incident, a company
  breach or a statistic. Never Phoebe's own employers, clients or projects.
- Snippets (config, Python, HTTP) are short, read and edited, never claimed as run against a real
  service. Use obviously fake key values like `hx_live_9f2c...`.

## Figure grammar (hand-drawn, every figure)

Palette, ONLY these hexes: ink `#22141A`, muted `#5E4A53`, wine `#43192A`, deep wine `#2C0E1B`, mid wine
`#7A3550`, soft wine `#E6C9D4`, wine tint `#F8EEF2`, faint `#D8C7CE`, hairline `#EFE5E9`, brass `#B3832A`
(fill or stroke only, never text), brass ink `#5A400F` (brass text), brass tint `#FBF3E1`, paper
`#FDFBFC` · `#FFFFFF` · reds `#991B1B` (danger text/stroke), `#FEF2F2`, `#FCA5A5` for the
attacker's path or a wrong-way panel.
Meaning: red = what a poisoned input reaches; brass = a gate, an approval, a "granted" state; wine =
the agent's own design.

- `<figure class="zoomable">` > `<svg viewBox="0 0 880 H" xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="the data, not the shape">` > `<defs>` + `<style>` + content, then
  `<figcaption>🔍 Click to zoom - takeaway</figcaption>`. Grow H, never W.
- Prefix unique per figure, used for every class and id: `k<session><letter>`, e.g. k3a, k3b, k3c, k3d.
- `<defs>` holds three things with the figure prefix P: a wobble filter `id="PSk"`
  (`feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="<int>"` +
  `feDisplacementMap scale="2.4" xChannelSelector="R" yChannelSelector="G"`, `x="-3%" y="-3%"
  width="106%" height="106%"`), a hachure pattern `id="PHc"` (7x7 userSpaceOnUse, rotate(-38), one
  accent line, opacity .5), an open arrowhead `id="PAr"` (path `M1 1 L9 5 L1 9`, fill none, ink
  stroke 1.6). ALL shapes sit inside ONE `<g filter="url(#PSk)" fill="none" stroke="#22141A"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`; rects carry a tiny rotation
  (under 1 degree for panels). Text classes: `.PH` 800 12px ink heading · `.PL` 600 12px ink label ·
  `.PS` 400 11px muted · `.PR` 800 11px `#991B1B` · `.PK` 700 11px brass ink · `.PA` 700 11px deep
  wine caption · `.PW` 800 12px white on a wine fill · `.PM` 600 11px ui-monospace for key/scope text
  · `.PN` 400 12px muted note.
- ALL `<text>` outside the filtered group, never below 10.5px.
- No line, arrow, curve or gridline may cross a label: route arrows through empty gutters and end
  them at box edges. A DELIBERATE strike-through path carries `data-strike="1"`.
- Fit: max chars ≈ (box width - 20) / 7 at 12px, 6.4px/char at 11px; full-width note under 110
  chars; bottom note 22px below the last row, H clears it by 8px. When in doubt, shorten.
- Floor: one figure per Part plus one in the build-along (on bench pages, the bench counts as the
  build-along figure, and you still add one figure there if the step needs a diagram). Draw the
  MECHANISM (where the key sits, which hop the token crosses, which path the injection takes, which
  claim names whom), never a metaphor literally, never decoration.

## Voice and honesty

Constructed cases say "constructed" on the page: Halyard (logistics SaaS), its ops agent, its five tools
(tickets on a Gmail support inbox, warehouse, refunds, chat on Slack, fetch), `HALYARD_ADMIN_KEY`,
support lead Dana, every bench weight, the warehouse scope names (wh.read.aggregates,
wh.read.customers, wh.admin) and payments scope names (charges:read, refunds:write:capped,
refunds:write, payouts:admin). Gmail, Slack and GitHub scope names are real.

Halyard's agreed design, so every page agrees:
- Identity map (s2): tickets, warehouse, chat run as the agent's own workload identity (queue work,
  no person behind it); refunds run on behalf of the requesting rep via token exchange (rep = subject,
  agent = actor); fetch has no credential.
- Scope table (s3): tickets gmail.readonly + gmail.send; chat channels:history + chat:write; warehouse
  wh.read.aggregates; refunds charges:read + refunds:write:capped; fetch none.
- Broker (s4): keys attached at call time, short-lived, audience-bound to each MCP server; traces
  redacted; no token passthrough.
- Gates (s5): send email, refund, and fetch outside an allowlist of carrier tracking domains need a
  person's approval.

## Cross-links (absolute URLs, link with the side picked, never reteach)

- learn-data-access-control b6 (rotation mechanics): https://phoebefu6.github.io/learn-data-access-control-with-phoebe/courses/b6-secrets-and-keys.html
- learn-data-access-control b2 (warehouse roles): https://phoebefu6.github.io/learn-data-access-control-with-phoebe/courses/b2-role-hierarchy.html
- learn-cyber-security b2 (human and service credential paths): https://phoebefu6.github.io/learn-cyber-security-with-phoebe/courses/b2-credential-paths.html
- learn-ai-red-team b3 (testing prompt injection): https://phoebefu6.github.io/learn-ai-red-team-with-phoebe/courses/b3-prompt-injection.html
- learn-ai-red-team b6 (testing tool abuse): https://phoebefu6.github.io/learn-ai-red-team-with-phoebe/courses/b6-tool-abuse-and-agency.html
- learn-ai-agents b2 (tool calling loop): https://phoebefu6.github.io/learn-ai-agents-with-phoebe/courses/b2-tools-first-agent.html
- learn-ai-agents b7 (guardrails as output filters): https://phoebefu6.github.io/learn-ai-agents-with-phoebe/courses/b7-guardrails.html
- learn-ship-internal-ai-assistant b5 (read filters in retrieval): https://phoebefu6.github.io/learn-ship-internal-ai-assistant-with-phoebe/courses/b5-permissions-inside-retrieval.html
- Hub: https://phoebefu6.github.io/learn-with-phoebe/

## Footer chain and session titles

Footer left: "Session N of 6 · learn-agent-secrets-access-with-phoebe · by Phoebe Fu &nbsp;·&nbsp; 📚 <a href="https://phoebefu6.github.io/learn-with-phoebe/">Learn with Phoebe ↗</a>"
Footer right: `<a href="0(N-1)-....html">← Prev: <title></a> &nbsp;·&nbsp; <a href="0(N+1)-....html">Next: <title> →</a>`

Session titles and files (h1 text exact; put one accent span on a key word):
1. What the agent is holding - 01-what-the-agent-is-holding.html
2. Whose authority: the agent's own, or the user's - 02-whose-authority.html
3. Scope the tool, not the agent - 03-scope-the-tool.html
4. Keep the key out of the context window - 04-keep-the-key-out.html
5. When the agent must ask first - 05-when-the-agent-must-ask.html
6. Prove what it did, then sign the plan - 06-prove-what-it-did.html
