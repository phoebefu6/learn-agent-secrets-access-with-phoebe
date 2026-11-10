# Secrets & Access for AI Agents - Phase 2 source verification

Fetch date: 2026-11-10. All facts paraphrased unless in quotation marks. Tier: "read-at-source" = fetched from the publisher's own page; "reported" = seen only via secondary sources.

---

## 1. MCP specification - Authorization (current revision)

- URL: https://modelcontextprotocol.io/specification/latest/basic/authorization (resolves to revision 2026-07-28)
- Revision check: https://modelcontextprotocol.io/specification/versioning states the CURRENT protocol version is **2026-07-28**. Previous revision 2025-11-25 (handshake-based, now older). 2025-06-18 is also older.
- Sub-page: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations
- Tier: read-at-source

Facts:
- Authorization is OPTIONAL; HTTP transports SHOULD conform; STDIO transports SHOULD NOT and instead take credentials from the environment.
- Based on OAuth 2.1 draft (cites draft-ietf-oauth-v2-1-13), plus RFC 6750, 8414, 7591, 8707, 9728, 9207 and Client ID Metadata Documents draft.
- A protected MCP server acts as an OAuth 2.1 resource server; the MCP client acts as an OAuth 2.1 client.
- MCP servers MUST implement Protected Resource Metadata (RFC 9728); clients MUST use it to discover the authorization server.
- Clients MUST send the RFC 8707 `resource` parameter in both authorization and token requests, set to the MCP server's canonical URI, even if the AS does not support it.
- Servers MUST validate tokens were issued for them as intended audience; "MCP servers MUST NOT accept or transit any other tokens."
- Clients MUST implement PKCE, MUST use S256 when capable, and MUST refuse to proceed if `code_challenge_methods_supported` is absent from AS metadata.
- In 2026-07-28, Client ID Metadata Documents are SHOULD; Dynamic Client Registration is MAY and marked deprecated. Tokens MUST NOT go in URI query strings.
- Scope guidance: servers SHOULD return `scope` in `WWW-Authenticate`; insufficient scope -> 403 with `error="insufficient_scope"`; clients do step-up authorization with the union of scopes.
- Security considerations: AS SHOULD issue short-lived access tokens; MUST rotate refresh tokens for public clients; upstream calls need a separate token, the server MUST NOT pass through the client's token.

## 1b. MCP Security Best Practices

- URL: https://modelcontextprotocol.io/specification/latest/basic/security_best_practices (2026-07-28 docs)
- Tier: read-at-source

Facts:
- Confused deputy: arises in MCP proxy servers using a static client ID to a third-party AS, combined with dynamic client registration and a consent cookie.
- Attack: attacker registers a client with a malicious redirect_uri; consent cookie skips the consent screen; the MCP authorization code goes to the attacker.
- Mitigation: proxy servers MUST implement per-client consent, keep a per-user registry of approved client_ids, exact redirect_uri matching, single-use short-lived `state`.
- Token passthrough defined as accepting client tokens not issued to the MCP server and forwarding them downstream; explicitly forbidden.
- Passthrough risks listed: security control circumvention, accountability and audit trail issues, trust boundary issues, future compatibility risk.
- Other attack sections: SSRF, State Handle Hijacking, Local MCP Server Compromise, OAuth Authorization URL Validation, stdio Transport Security in Proxy Scenarios, Mix-Up Attacks, Localhost Redirect URI Impersonation, CIMD Trust Policies, Scope Minimization.
- Scope minimization: warns against wildcard or omnibus scopes (`*`, `all`, `full-access`); suggests a minimal initial scope like `mcp:tools-basic` and incremental elevation.

## 2. OAuth 2.1 draft

- URL: https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/
- Latest: **draft-ietf-oauth-v2-1-17**, dated 31 October 2026, expires 4 May 2027. Note: MCP 2026-07-28 still cites -13.
- Tier: read-at-source (first ~100k characters read)

Facts:
- Active OAuth WG Internet-Draft, intended Standards Track; IESG state "I-D Exists". Would obsolete RFC 6749 and RFC 6750.
- PKCE is required in OAuth 2.1 (Section 1.8).
- Implicit grant removed (Section 10.1); Resource Owner Password Credentials grant not specified.
- Authorization servers MUST reject redirect URIs that do not exactly match a registered one (loopback port exempt).
- Refresh tokens MUST be bound to the scope and resource servers the resource owner consented to.
- AS and RS SHOULD use sender-constraining (DPoP or mutual TLS) for access tokens.
- Not verified in the portion read: refresh token one-time-use wording and the query-string ban (MCP spec separately forbids tokens in the query string).

## 3. RFC 8693 OAuth 2.0 Token Exchange

- URL: https://www.rfc-editor.org/rfc/rfc8693.html
- Date: January 2020. Standards Track. Authors: M. Jones, A. Nadalin, B. Campbell (ed.), J. Bradley, C. Mortimore.
- Tier: read-at-source

Facts:
- grant_type is `urn:ietf:params:oauth:grant-type:token-exchange`.
- `subject_token` (required) represents the party on whose behalf the new token is requested; `subject_token_type` required.
- `actor_token` (optional) represents the acting party; if present `actor_token_type` is required.
- `requested_token_type` optional; AS may choose if omitted.
- Impersonation: actor is treated as the subject; recipients generally cannot tell them apart.
- Delegation: actor keeps its own identity and acts as agent for the subject; actions attributable to the agent on the subject's behalf.
- `act` claim identifies the current actor; nested `act` claims record the prior delegation chain; access decisions use top-level claims and current actor only.
- `may_act` claim asserts which party is authorized to act for the subject.

## 4. RFC 8707 Resource Indicators for OAuth 2.0

- URL: https://www.rfc-editor.org/rfc/rfc8707.html
- Date: February 2020. Standards Track. Authors: B. Campbell, J. Bradley, H. Tschofenig.
- Tier: read-at-source

Facts:
- `resource` parameter tells the AS which protected resource the client intends to use the token with.
- Value MUST be an absolute URI, MUST NOT contain a fragment, SHOULD NOT contain a query.
- May be repeated for multiple resources, though a single resource is encouraged.
- AS should audience-restrict the token (e.g., `aud` in JWT) so it fails at other resources.
- `invalid_target` error for invalid, unknown or malformed resource, or bad resource/scope combination.

## 5. OWASP Top 10 for LLM Applications 2025

- URLs: https://genai.owasp.org/llm-top-10/ ; https://genai.owasp.org/llmrisk/llm062025-excessive-agency/ ; https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/
- Tier: read-at-source

Full list: LLM01:2025 Prompt Injection; LLM02:2025 Sensitive Information Disclosure; LLM03:2025 Supply Chain; LLM04:2025 Data and Model Poisoning; LLM05:2025 Improper Output Handling; LLM06:2025 Excessive Agency; LLM07:2025 System Prompt Leakage; LLM08:2025 Vector and Embedding Weaknesses; LLM09:2025 Misinformation; LLM10:2025 Unbounded Consumption.

LLM06 facts:
- Three root causes: excessive functionality, excessive permissions, excessive autonomy.
- Excessive permissions example: write or delete rights downstream when only reads are needed.
- Excessive autonomy: high-impact actions not independently verified or approved (e.g., delete without confirmation).
- Prevention list includes: minimize extensions, minimize extension functionality, avoid open-ended extensions, minimize extension permissions, execute extensions in user's context, require user approval, complete mediation, sanitise inputs and outputs.
- Logging/monitoring and rate-limiting limit damage but do not prevent it.
- Example scenario: email-summary assistant whose plugin can also send; indirect prompt injection forwards inbox data; fix = read-only extension, read-only OAuth scope, user approves each send.

LLM02 facts:
- Sensitive info explicitly includes security credentials, alongside PII, financial, health, business and legal data.
- Prevention groups include sanitization, access controls, privacy techniques, user education, secure system configuration, and tokenization and redaction.

## 6. OWASP Top 10 for Agentic Applications (2026 edition)

- URL: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ (landing page; list in downloadable PDF, not read)
- Release date on landing page: December 9, 2025 (read-at-source).
- List tier: **reported** (from https://docs.modulos.ai/frameworks/owasp-top-10-agentic/top-risks, consistent with several other secondary sources)

- ASI01 Agent Goal Hijack
- ASI02 Tool Misuse and Exploitation
- ASI03 Identity and Privilege Abuse
- ASI04 Agentic Supply Chain Vulnerabilities
- ASI05 Unexpected Code Execution (RCE)
- ASI06 Memory & Context Poisoning
- ASI07 Insecure Inter-Agent Communication
- ASI08 Cascading Failures
- ASI09 Human-Agent Trust Exploitation
- ASI10 Rogue Agents

Note: verify names against the OWASP PDF before publishing. "Least agency" not confirmed on the landing page.

## 7. OWASP Non-Human Identities Top 10 (2025)

- URL: https://owasp.org/www-project-non-human-identities-top-10/2025/top-10-2025/ (redirects to owasp.github.io/www-project-non-human-identities-top-10/2025/top-10-2025)
- Tier: read-at-source. First published January 2025 (reported, secondary).

- NHI1:2025 Improper Offboarding - NHIs not deactivated when no longer needed.
- NHI2:2025 Secret Leakage - keys, tokens, certificates land in unsanctioned places.
- NHI3:2025 Vulnerable Third-Party NHI - compromised IDE extensions or SaaS integrations expose held credentials.
- NHI4:2025 Insecure Authentication - weak or deprecated auth methods.
- NHI5:2025 Overprivileged NHI - far more permissions than the function needs.
- NHI6:2025 Insecure Cloud Deployment Configurations - static cloud creds or weakly validated OIDC in CI/CD.
- NHI7:2025 Long-Lived Secrets - distant or no expiry.
- NHI8:2025 Environment Isolation - same NHI across test and production.
- NHI9:2025 NHI Reuse - one identity shared across several apps.
- NHI10:2025 Human Use of NHI - people using machine identities for manual work, hurting accountability.

## 8. NIST SP 800-207 Zero Trust Architecture

- URLs: https://csrc.nist.gov/pubs/sp/800/207/final ; PDF https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf (Section 2.1)
- Date: August 2020. Authors: Scott Rose, Oliver Borchert, Stu Mitchell, Sean Connelly.
- Tier: read-at-source

Facts:
- Seven tenets in Section 2.1; described as ideal goals, not all fully implementable.
- Tenet 1: all data sources and computing services are resources.
- Tenet 2: all communication secured regardless of network location; location alone does not imply trust.
- Tenet 3: "Access to individual enterprise resources is granted on a per-session basis." Least privilege; auth to one resource does not grant another.
- Tenet 4: access determined by dynamic policy, including client identity (user or service identity), app, asset state, behavioral and environmental attributes.
- Tenet 5: enterprise monitors integrity and security posture of all assets; no asset inherently trusted.
- (Tenets 6-7 on dynamic, strictly enforced authentication/authorization and collecting telemetry: text cut off in extraction; verify wording before quoting.)

## 9. SPIFFE

- URL: https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/
- Tier: read-at-source

Facts:
- SPIFFE ID is a URI `spiffe://trust-domain/workload-identifier`, e.g. `spiffe://acme.com/billing/payments`.
- Trust domain is the trust root; staging and production generally separate trust domains.
- SVID = SPIFFE Verifiable Identity Document; holds one SPIFFE ID, signed by the trust domain authority.
- Two formats: X.509-SVID (preferred, used for TLS; tokens are replayable) and JWT-SVID (for L7 proxies).
- Workload API hands a workload its ID, private key, SVID and trust bundles; the caller needs no pre-existing token.
- Keys and certificates are short-lived and rotated automatically, limiting damage from a leak.

## 10. HashiCorp Vault - leases and dynamic secrets

- URLs: https://developer.hashicorp.com/vault/docs/concepts/lease ; https://developer.hashicorp.com/vault/tutorials/db-credentials/database-secrets
- Tier: read-at-source

Facts:
- Every dynamic secret and service token has a lease; KV secrets do not.
- Lease ID returned with a dynamic secret; used to renew or revoke.
- TTL is the lease duration; renew before expiry or request a new secret. Renewal increment counts from now.
- Revocation invalidates immediately; revoking a token revokes all leases created with it.
- Prefix revocation, e.g. `vault lease revoke -prefix aws/`, revokes a whole group.
- Database engine creates a unique username/password on each request (e.g. `database/creds/readonly`).
- Tutorial example role: `default_ttl=1h`, `max_ttl=24h`.
- Compromise of one app means revoking its credentials only, not rotating shared ones.

## 11. Simon Willison - The lethal trifecta for AI agents

- URL: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- Date: June 16, 2025
- Tier: read-at-source

Facts:
- Three parts: access to private data; exposure to untrusted content; ability to communicate externally.
- Combining all three lets an attacker trick the agent into exfiltrating data.
- Guardrail products citing ~95% detection are a failing grade in web security terms.
- MCP mix-and-match makes the combination easy to assemble by accident.
- Advice: "avoid that lethal trifecta combination entirely."

## 12. Beurer-Kellner et al. 2025 - Design Patterns for Securing LLM Agents against Prompt Injections

- URL: https://arxiv.org/abs/2506.08837 (HTML v3 read)
- arXiv 2506.08837; v1 10 June 2025, v2 11 June 2025, v3 27 June 2025. 14 authors incl. Luca Beurer-Kellner, Beat Buesser, Ana-Maria Cretu, Edoardo Debenedetti.
- Tier: read-at-source

Six patterns:
1. Action-Selector - LLM maps request to predefined tool calls, no feedback from results.
2. Plan-Then-Execute - fixed action plan committed before untrusted data is processed.
3. LLM Map-Reduce - isolated sub-agents each handle one untrusted item; separate reduce step.
4. Dual LLM - privileged LLM with tools; quarantined LLM without tools handles untrusted text.
5. Code-Then-Execute - agent writes a program calling tools and sub-LLMs, then runs it.
6. Context-Minimization - user prompt removed from context after guiding the initial action.

Core principle: "once an LLM agent has ingested untrusted input, it must be constrained" so it cannot trigger consequential actions. Paper discusses utility vs security trade-offs with case studies.

## 13. Debenedetti et al. 2025 - CaMeL, Defeating Prompt Injections by Design

- URL: https://arxiv.org/abs/2503.18813
- arXiv 2503.18813; v1 24 Mar 2025, v2 24 Jun 2025. 10 authors incl. Edoardo Debenedetti, Ilia Shumailov, Tianqi Fan, Jamie Hayes, Nicholas Carlini.
- Tier: read-at-source (abstract)

Facts:
- CaMeL adds a protective system layer around the LLM.
- Extracts control and data flows from the trusted user query; untrusted retrieved data cannot change program flow.
- Uses capabilities to enforce security policies at tool calls, preventing private data leaking over unauthorized flows.
- AgentDojo: 77% of tasks solved with provable security vs 84% for an undefended system.
- Privileged/quarantined LLM split: reported in the paper body (builds on the Dual LLM pattern); not confirmed in the abstract read here.

## 14. IETF drafts on agent on-behalf-of authorization (cite as work in progress)

a) draft-oauth-ai-agents-on-behalf-of-user
- URL: https://datatracker.ietf.org/doc/draft-oauth-ai-agents-on-behalf-of-user/
- Title: OAuth 2.0 Extension: On-Behalf-Of User Authorization for AI Agents. Latest -02, 2025-08-25. Individual submission, now **Expired**. Authors: Thilina (Senarath) and Ayesha Dissanayaka (WSO2).
- Tier: read-at-source
- Extends the authorization code flow; adds `requested_actor` (authorization request) and `actor_token` (token request).
- Goals: explicit consent, auditability via token claims recording user -> client -> agent delegation chain.
- Resource server may be an MCP server, another agent, or a generic resource (reported via search snippet).

b) draft-klrc-aiagent-auth
- URL: https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/
- Title: AI Agent Authentication and Authorization. Latest -03, 2026-07-06. Authors: Pieter Kasselman, Jeff Lombardo, Yaroslav Rosomakho, Brian Campbell, Nick Steele, Aaron Parecki.
- Tier: read-at-source
- Adopted by the WIMSE working group and replaced by **draft-ietf-wimse-aims** (not fetched; check its revision before citing).
- Builds on WIMSE architecture and OAuth 2.0 family; defines no new protocol, maps existing standards and gaps.

c) Others seen only in search (reported, not fetched): draft-liu-agent-operation-authorization-02 (Mar 2026), draft-liu-ai-agent-authorization-integration-00 (Jul 2026), draft-aap-oauth-profile-00 (Feb 2026), draft-mishra-oauth-agent-grants-02 (Aug 2026), draft-song-oauth-ai-agent-collaborate-authz-01 (Feb 2026).

## 15. GitHub fine-grained PAT permissions

- URL: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- Tier: read-at-source
- Access levels per permission: read or write (UI labels "Read-only" / "Read and write"; write includes read). Page lists each endpoint against (read) or (write).

Repository permissions (32): Actions, Administration, Agent secrets, Agent variables, Artifact metadata, Attestations, Code quality, Code scanning alerts, Codespaces lifecycle admin, Codespaces metadata, Codespaces secrets, Codespaces, Commit statuses, Contents, Copilot agent settings, Custom properties, Dependabot alerts, Dependabot secrets, Deployments, Environments, GitHub App installation repository access, Issues, Metadata, Pages, Pull requests, Repository creation, Repository security advisories, Secret scanning alerts, Secrets, Variables, Webhooks, Workflows.

Organization permissions (30): API Insights, Administration, Agent secrets, Agent variables, Blocking users, Campaigns, Copilot Spaces, Copilot agent settings, Copilot content exclusion, Custom organization roles, Custom properties, Events, External custom properties for repositories, GitHub Copilot Business, Hosted runner custom images, Issue Fields, Issue Types, Members, Network configurations, Organization Copilot metrics, Organization codespaces secrets, Organization codespaces settings, Organization codespaces, Organization dependabot secrets, Organization private registries, Projects, Secrets, Self-hosted runners, Variables, Webhooks.

Account permissions (14): Block another user, Codespaces user secrets, Email addresses, Followers, GPG keys, Gists, Git SSH keys, Interaction limits, Plan, Private repository invitations, Profile, SSH signing keys, Starring, Watching.

Example endpoint mappings:
- Contents (read): GET /repos/{owner}/{repo}/contents/{path}
- Contents (write): PUT /repos/{owner}/{repo}/contents/{path}
- Issues (read): GET /repos/{owner}/{repo}/issues
- Issues (write): POST /repos/{owner}/{repo}/issues
- Members (read, org): GET /orgs/{org}/members
- Profile (write, account): PATCH /user

## 16. Slack OAuth scopes

- URL: https://docs.slack.dev/reference/scopes/
- Tier: read-at-source (token types not shown in the extract)

| Scope | Meaning |
|---|---|
| chat:write | Send messages as your Slack app |
| chat:write.public | Send messages to channels the app is not a member of |
| channels:read | View basic info about public channels |
| channels:history | Read messages in public channels the app was added to |
| channels:join | Join public channels |
| groups:read | View basic info about private channels the app was added to |
| groups:history | Read messages in private channels the app was added to |
| im:read | View basic info about DMs the app was added to |
| im:history | Read messages in DMs the app was added to |
| im:write | Start direct messages with people |
| files:read | View files in conversations the app was added to |
| files:write | Upload, edit and delete files as the app |
| users:read | View people in a workspace |
| users:read.email | View email addresses of people in a workspace |
| reactions:read | View emoji reactions and their content |
| reactions:write | Add and edit emoji reactions |
| search:read | Search a workspace's content |
| admin | Administer a workspace |
| incoming-webhook | Post messages to specific channels |
| commands | Add shortcuts and slash commands |

## 17. Google Workspace OAuth scopes

- URLs: https://developers.google.com/identity/protocols/oauth2/scopes (master list, no classification); https://developers.google.com/workspace/gmail/api/auth/scopes (Gmail classification); https://developers.google.com/workspace/drive/api/guides/api-specific-auth (Drive classification); https://developers.google.com/workspace/calendar/api/auth (Calendar, no classification shown)
- Tier: read-at-source

| Scope URI | Meaning | Google class |
|---|---|---|
| https://mail.google.com/ | Full Gmail incl. permanent delete bypassing trash | Restricted |
| .../auth/gmail.readonly | Read messages and settings | Restricted |
| .../auth/gmail.modify | Read, compose, send; no permanent delete | Restricted |
| .../auth/gmail.compose | Create drafts and send | Restricted |
| .../auth/gmail.metadata | Labels and headers, no bodies | Restricted |
| .../auth/gmail.send | Send email only | Sensitive |
| .../auth/gmail.labels | View and modify labels | Non-sensitive |
| .../auth/drive | View and manage all Drive files | Restricted |
| .../auth/drive.readonly | View and download all Drive files | Restricted |
| .../auth/drive.metadata.readonly | View file metadata | Restricted |
| .../auth/drive.file | Only files the user opens with or shares to the app | Non-sensitive |
| .../auth/drive.appdata | App's own config data folder | Non-sensitive |
| .../auth/calendar | Full view, edit, share, delete calendars | Not stated on page |
| .../auth/calendar.readonly | Read-only calendars | Not stated on page |
| .../auth/calendar.events | View and edit events on all calendars | Not stated on page |
| .../auth/calendar.events.readonly | View events on all calendars | Not stated on page |
| .../auth/calendar.events.owned | Manage events on calendars the user owns | Not stated on page |
| .../auth/calendar.freebusy | View availability | Not stated on page |

(".../auth/" = https://www.googleapis.com/auth/)
- Master list page says sensitive scopes require Google review and advises choosing non-sensitive scopes where possible.

## 18. Stripe restricted API keys

- URL: https://docs.stripe.com/keys/restricted-api-keys
- Tier: read-at-source

Facts:
- Restricted keys start with `rk_live_` or `rk_test_`; secret keys (`sk_`) have full access.
- Per resource permission: None, Read or Write; default is None. Write implies Read.
- Mapping: GET = read; POST and DELETE = write.
- Example permission labels: Payment Intents: Write; Customers: Read; Disputes: Read. Error docs use ids like `payment_intent_write`, `charge_read` (reported via search).
- Stripe recommends RAKs over secret keys, especially for AI agents; one restricted key per service.
- Key value cannot be retrieved after creation; secret key can be expired with a delayed window up to 7 days.
- Exact "Refunds" permission label NOT confirmed at source.
