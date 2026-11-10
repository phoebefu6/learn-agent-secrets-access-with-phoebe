# Official course map - Secrets & Access for AI Agents

Slug `learn-agent-secrets-access-with-phoebe`, bucket dsec, single-track 6 x 45 min, audience builders and
platform engineers. Sources fetched 2026-11-10 (full notes and URLs: `research-notes.md`). Fast-moving: the MCP
specification and the OAuth 2.1 draft change several times a year; re-verify both before every delivery.

Evidence tiers: **R** = read at source on 2026-11-10. **Rep** = reported (secondary source only); pages say so.
**C** = constructed for teaching (Halyard). **M** = modelled assumption, labelled on the widget.

## Running case

Constructed Halyard example. Halyard is an invented mid-size logistics SaaS. One internal ops agent reads support
tickets and customer email (tickets tool, on a Google Workspace support inbox), queries the analytics warehouse
(warehouse tool), issues refunds up to a limit (refunds tool), posts to team chat (chat tool, Slack), and fetches
the tracking pages customers link (fetch tool, no credential). Day one: every tool reads one shared admin key,
`HALYARD_ADMIN_KEY`, from the environment. The same key also runs Halyard's other automation, so it reaches
GitHub, which no tool exposes. Running artifact: Halyard's agent access plan (credential inventory -> identity map
-> scope table -> broker design -> gate rules -> audit spec + signed plan). Support lead Dana is constructed.

## Bench canon (asa-live.js in node == asa_reference.py, 600 values, 0 differences, planted fault caught)

Headline = sensitive actions (weight >= 3) reachable from any untrusted entry point without passing a gate,
including what an attacker can call directly with a key that left through an ungated way out.
21 actions, 19 sensitive. Weights C.

| Rung | Preset | Headline | Weighted | Stolen key reaches | Keys in context | Approvals | Trifecta | Path target |
|---|---|---|---|---|---|---|---|---|
| 0 | Day one: one shared admin key | 19 | 121 | 18 | 1 | 0 | present | Change the payout bank account (3 hops) |
| 1 | One credential per tool | 15 | 90 | 14 | 4 | 0 | present | Change the payout bank account |
| 2 | Scopes cut to the job | 6 | 26 | 5 | 4 | 0 | present | Send email to any address |
| 3 | Keys behind a broker | 6 | 26 | 0 | 0 | 0 | present | Send email to any address |
| 4 | Gates on irreversible actions | 3 | 11 | 0 | 0 | 3 | broken | Read the support inbox |
| 5 | On-behalf-of for rep requests | 2 | 8 | 0 | 0 | 2 | broken | Read the support inbox |

Reached at rung 2/3: read the support inbox, send email to any address, read every public channel, read charges,
refund up to 200 USD, fetch any URL. Rung 4 gates: send email, refund up to 200 USD, fetch any URL. Rung 5:
read the support inbox, read every public channel.

Traps (the bench reporting a WORSE number):

| Trap | Headline | Weighted | Note |
|---|---|---|---|
| t1 finished design, rep requests also read ticket text | 3 | 11 | read charges comes back, under the rep's authority |
| t2 broker on, refunds key leaks into a tool error (no gates) | 6 | 26 | stolen key reaches 2, keys in context 1 |
| t3 gates on the day-one shared key, nothing else | 6 | 24 | 9 approvals; reads still leak: inbox, channels, any-channel post, staff emails, customer table, charges |
| t4 finished design, warehouse tool keeps its admin role | 3 | 15 | customer contact table reachable; 4 approvals |
| t5 finished design with every write gated | 2 | 8 | no further fall: what is left is reads |

Session 3 tool-by-tool cuts (from rung 1): nothing cut 15/90; cut refunds 13/72; + warehouse 10/48; + chat 7/33;
+ tickets 6/26.

Bench uses: s1 baseline (rung 0), s3 cuts (rungs 1-2, tool by tool), s4 broker (rung 3, trap t2), s5 gates
(rung 4, trap t3, t5), s6 full ladder (rungs 0-5, traps t1, t4).

## Per-session coverage

### 1. What the agent is holding (green)
- Non-human identity; OWASP NHI Top 10 2025 (R): NHI1 Improper Offboarding, NHI2 Secret Leakage, NHI3 Vulnerable
  Third-Party NHI, NHI4 Insecure Authentication, NHI5 Overprivileged NHI, NHI6 Insecure Cloud Deployment
  Configurations, NHI7 Long-Lived Secrets, NHI8 Environment Isolation, NHI9 NHI Reuse, NHI10 Human Use of NHI.
- Five places an agent's key ends up: env var; prompt or context; tool output echoed back; logs and traces; the
  model provider's side. (Taxonomy C; each supported by LLM02 listing security credentials as sensitive
  information (R), MCP spec STDIO servers take credentials from the environment (R).)
- OWASP LLM Top 10 2025 (R): LLM02 Sensitive Information Disclosure, LLM06 Excessive Agency.
- Build-along: credential inventory; bench rung 0 = 19 / 121.
- Seam: rotation mechanics -> data-access-control b6.

### 2. Whose authority (yellow)
- RFC 8693 (Jan 2020, R): subject_token required, actor_token optional, `act` claim, nested act = delegation
  chain, `may_act`; impersonation vs delegation.
- Confused deputy: MCP Security Best Practices (R) describes it for MCP proxy servers with a static client id,
  dynamic registration and a consent cookie; mitigations per-client consent, exact redirect_uri, single-use state.
- IETF drafts (R, cited as drafts): draft-oauth-ai-agents-on-behalf-of-user-02 (2025-08-25, expired; adds
  requested_actor and actor_token); draft-klrc-aiagent-auth-03 (2026-07-06; adopted by WIMSE, replaced by
  draft-ietf-wimse-aims, not read).
- SPIFFE (R): SPIFFE ID URI, SVID, X.509-SVID and JWT-SVID, short-lived keys rotated automatically.
- NIST SP 800-207 (Aug 2020, R): tenet 3 per-session access; tenet 4 dynamic policy including client identity.
- Build-along: identity map (no bench number; the bench's rung 5 is previewed in words only).
- Seam: agent loop -> ai-agents b2.

### 3. Scope the tool, not the agent (yellow)
- Real catalogues (R): GitHub fine-grained PAT permissions (read or read and write, write includes read; 76 names);
  Slack scopes (chat:write vs chat:write.public, channels:history, users:read.email, admin); Google scopes with
  Google's own class (gmail.send Sensitive, gmail.readonly Restricted, https://mail.google.com/ Restricted with
  permanent delete; drive.file Non-sensitive).
- Stripe restricted keys (R): rk_ prefix, None/Read/Write per resource, write implies read; Stripe recommends
  restricted keys for agents. Halyard's payments scope names are C, modelled on that shape.
- OWASP LLM06 prevention list (R): minimise extensions, functionality, permissions; read-only OAuth scope example.
- MCP scope minimisation (R): warns against omnibus scopes, suggests a minimal initial scope and step-up.
- Expiry and audience: RFC 8707 resource parameter, audience restriction (R).
- Build-along: scope table; bench tool-by-tool 15/90 -> 6/26.
- Seams: warehouse role -> data-access-control b2; read filters -> ship-internal b5.

### 4. Keep the key out of the context window (orange)
- MCP authorization, revision 2026-07-28 (R): optional; HTTP transports SHOULD conform; OAuth 2.1 basis (cites
  draft -13); MCP server is an OAuth resource server; Protected Resource Metadata RFC 9728 MUST; resource parameter
  RFC 8707 MUST in authorization and token requests; audience validation MUST; "MUST NOT accept or transit any
  other tokens"; PKCE MUST with S256; Client ID Metadata Documents SHOULD, Dynamic Client Registration deprecated;
  no tokens in query strings; insufficient scope -> 403 insufficient_scope, step-up.
- Token passthrough forbidden; risks listed (R): control circumvention, accountability and audit trail, trust
  boundary, future compatibility.
- OAuth 2.1 latest draft -17, 31 Oct 2026 (R): PKCE required, implicit removed, exact redirect match,
  sender-constraining SHOULD (DPoP or mTLS).
- Vault (R): every dynamic secret has a lease; TTL; revoke immediately; revoke a token revokes its leases;
  prefix revoke; database engine creates a unique user per request; tutorial default_ttl 1h, max_ttl 24h.
- Broker pattern (C as Halyard design; mechanism grounded in MCP no-passthrough and Vault leases).
- Build-along: broker design; bench rung 3 = headline 6 unchanged, stolen key 5 -> 0; trap t2.

### 5. When the agent must ask first (orange)
- Willison, 2025-06-16 (R): private data + untrusted content + external communication; ~95% guardrail detection is a
  failing grade in web-security terms; avoid the combination.
- Beurer-Kellner et al. 2025, arXiv 2506.08837 (R): six patterns Action-Selector, Plan-Then-Execute, LLM
  Map-Reduce, Dual LLM, Code-Then-Execute, Context-Minimization; utility trade-offs.
- Debenedetti et al. 2025 CaMeL, arXiv 2503.18813 (R, abstract): control and data flow from the trusted query,
  capabilities at tool calls, AgentDojo 77% of tasks with provable security vs 84% undefended. Privileged and
  quarantined LLM split: Rep from the abstract alone; say "builds on the Dual LLM pattern".
- OWASP LLM06 (R): excessive autonomy, require user approval; logging and rate limiting limit damage but do not
  prevent it.
- Contested: approval fatigue (practitioner argument, no primary measurement found; taught as a disagreement).
- OWASP Agentic Top 10 (release Dec 9 2025 R; the ten names Rep, not shown as a list on pages).
- Build-along: gate rules; bench rung 4 = 3 / 11, trap t3 6 / 24 with 9 approvals.
- Seam: testing whether injection succeeds -> ai-red-team b3, b6.

### 6. Prove what it did, then sign the plan (red)
- Audit record fields (agent id, human principal, token id, tool, argument hash, approver): C design, grounded in
  RFC 8693 act claim (R), MCP passthrough "accountability and audit trail issues" (R), NHI10 (R).
- Revocation: Vault lease revoke and prefix revoke (R); kill switch C.
- Full ladder 19/121 -> 2/8; traps t1, t4.
- Capstone: signed access plan.
- Seams: governance frameworks -> ai-governance b5; testing the gated agent -> agent-launch b8.

## Seams (side picked, link absolute https, never reteach)

| Sibling | Link | We say |
|---|---|---|
| data-access-control b6 | https://phoebefu6.github.io/learn-data-access-control-with-phoebe/courses/b6-secrets-and-keys.html | rotation mechanics live there |
| data-access-control b2 | .../courses/b2-role-hierarchy.html | warehouse role design |
| cyber-security b2 | https://phoebefu6.github.io/learn-cyber-security-with-phoebe/courses/b2-credential-paths.html | human and service credential paths |
| ai-red-team b3, b6 | https://phoebefu6.github.io/learn-ai-red-team-with-phoebe/courses/b3-prompt-injection.html, b6-tool-abuse-and-agency.html | testing the design |
| ai-agents b2 | https://phoebefu6.github.io/learn-ai-agents-with-phoebe/courses/b2-tools-first-agent.html | the tool-calling loop |
| ship-internal b5 | https://phoebefu6.github.io/learn-ship-internal-ai-assistant-with-phoebe/courses/b5-permissions-inside-retrieval.html | read filters in retrieval |
| ai-governance b5 | https://phoebefu6.github.io/learn-ai-governance-with-phoebe/courses/b5-nist-rmf.html | the framework |
| agent-launch b8 | https://phoebefu6.github.io/learn-agent-launch-with-phoebe/courses/b8-agent-trajectory-evals.html | trajectory evals |

## Not covered (honest list)

Vendor walkthroughs (HashiCorp Vault setup, cloud IAM, Okta or Entra agent identity products): Self-study only, as
claims with their basis. No live OAuth flow is run; snippets are read and edited, not deployed. No attack success
rates (red-team course). No EU AI Act or ISO 42001 mapping. No secrets scanning in CI. The OWASP Agentic Top 10
list is not reproduced (names only reported). NIST 800-207 tenets 6-7 not quoted (extraction cut off).

## Citation appendix

See `research-notes.md` sections 1-18 for every URL, revision and date.
