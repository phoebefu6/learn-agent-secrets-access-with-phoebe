#!/usr/bin/env python3
"""Write assets/asa-sample.js: the scope catalogue (REAL published names) and the Halyard graph
(CONSTRUCTED for teaching). Generated with json.dumps, never string interpolation.

Usage: python3 materials/build-asa-sample.py <repo>

Real rows, read 2026-11-10 (see materials/research-notes.md for URLs and tiers):
  - GitHub fine-grained personal access token permissions (a subset of the 76 names)
  - Slack OAuth scopes (20 rows)
  - Google Workspace OAuth scopes (Gmail, Drive, Calendar; 18 rows, Google's own class where stated)
Constructed: Halyard, its tools, its warehouse and payments scope names, every sensitivity weight.
"""
import json
import sys
from pathlib import Path

READ = "2026-11-10"

CATALOGUE = {
    "github": {
        "name": "GitHub fine-grained personal access tokens",
        "url": "https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens",
        "read": READ,
        "note": "Each permission is granted at read or read and write; write includes read. 76 names on the page (32 repository, 30 organization, 14 account); a subset is shown.",
        "rows": [
            ["Actions", "repository", "workflow runs, artifacts, caches"],
            ["Administration", "repository", "settings, collaborators, delete or rename the repository"],
            ["Contents", "repository", "files, commits, branches, releases"],
            ["Issues", "repository", "issues and their comments, labels"],
            ["Metadata", "repository", "basic repository information"],
            ["Pull requests", "repository", "pull requests, reviews, merges"],
            ["Secrets", "repository", "Actions secrets for the repository"],
            ["Variables", "repository", "Actions variables"],
            ["Webhooks", "repository", "repository webhooks"],
            ["Workflows", "repository", "workflow files under .github/workflows"],
            ["Environments", "repository", "deployment environments"],
            ["Deployments", "repository", "deployments and their statuses"],
            ["Dependabot secrets", "repository", "secrets Dependabot uses"],
            ["Members", "organization", "organization members and teams"],
            ["Administration", "organization", "organization settings"],
            ["Secrets", "organization", "organization Actions secrets"],
            ["Self-hosted runners", "organization", "runners and runner groups"],
            ["Email addresses", "account", "the user's email addresses"],
            ["Git SSH keys", "account", "the user's SSH keys"],
            ["Profile", "account", "the user's profile"],
        ],
    },
    "slack": {
        "name": "Slack OAuth scopes",
        "url": "https://docs.slack.dev/reference/scopes/",
        "read": READ,
        "note": "Meanings paraphrased from Slack's scope reference.",
        "rows": [
            ["chat:write", "write", "send messages as the app"],
            ["chat:write.public", "write", "send messages to channels the app is not a member of"],
            ["channels:read", "read", "basic information about public channels"],
            ["channels:history", "read", "messages in public channels the app was added to"],
            ["channels:join", "write", "join public channels"],
            ["groups:read", "read", "basic information about private channels the app was added to"],
            ["groups:history", "read", "messages in private channels the app was added to"],
            ["im:read", "read", "basic information about direct messages the app was added to"],
            ["im:history", "read", "messages in direct messages the app was added to"],
            ["im:write", "write", "start direct messages with people"],
            ["files:read", "read", "files in conversations the app was added to"],
            ["files:write", "write", "upload, edit and delete files as the app"],
            ["users:read", "read", "people in the workspace"],
            ["users:read.email", "read", "email addresses of people in the workspace"],
            ["reactions:read", "read", "emoji reactions"],
            ["reactions:write", "write", "add and edit emoji reactions"],
            ["search:read", "read", "search the workspace's content"],
            ["admin", "write", "administer the workspace"],
            ["incoming-webhook", "write", "post messages to specific channels"],
            ["commands", "write", "add shortcuts and slash commands"],
        ],
    },
    "google": {
        "name": "Google Workspace OAuth scopes (Gmail, Drive, Calendar)",
        "url": "https://developers.google.com/workspace/gmail/api/auth/scopes",
        "read": READ,
        "note": "Prefix .../auth/ is https://www.googleapis.com/auth/. Class is Google's own (Restricted, Sensitive, Non-sensitive) where its page states one; the Calendar page states none.",
        "rows": [
            ["https://mail.google.com/", "Restricted", "full Gmail, including permanent delete that bypasses the trash"],
            [".../auth/gmail.readonly", "Restricted", "read messages and settings"],
            [".../auth/gmail.modify", "Restricted", "read, compose and send; no permanent delete"],
            [".../auth/gmail.compose", "Restricted", "create drafts and send"],
            [".../auth/gmail.metadata", "Restricted", "labels and headers, no message bodies"],
            [".../auth/gmail.send", "Sensitive", "send email only"],
            [".../auth/gmail.labels", "Non-sensitive", "view and modify labels"],
            [".../auth/drive", "Restricted", "view and manage all Drive files"],
            [".../auth/drive.readonly", "Restricted", "view and download all Drive files"],
            [".../auth/drive.metadata.readonly", "Restricted", "view file metadata"],
            [".../auth/drive.file", "Non-sensitive", "only files the user opens with, or shares to, the app"],
            [".../auth/drive.appdata", "Non-sensitive", "the app's own configuration folder"],
            [".../auth/calendar", "not stated", "view, edit, share and delete calendars"],
            [".../auth/calendar.readonly", "not stated", "read calendars"],
            [".../auth/calendar.events", "not stated", "view and edit events on all calendars"],
            [".../auth/calendar.events.readonly", "not stated", "view events on all calendars"],
            [".../auth/calendar.events.owned", "not stated", "manage events on calendars the user owns"],
            [".../auth/calendar.freebusy", "not stated", "view availability"],
        ],
    },
}

# ---------------------------------------------------------------- Halyard (constructed)
PROVIDERS = {
    "gmail": {"label": "Google Workspace (support inbox)", "real": True,
              "scopes": ["gmail.readonly", "gmail.send", "gmail.modify", "https://mail.google.com/"]},
    "slack": {"label": "Slack (team chat)", "real": True,
              "scopes": ["channels:history", "chat:write", "chat:write.public", "users:read.email", "admin"]},
    "github": {"label": "GitHub (Halyard's code)", "real": True,
               "scopes": ["Contents: read", "Contents: write", "Secrets: write", "Administration: write"]},
    "warehouse": {"label": "Analytics warehouse", "real": False,
                  "scopes": ["wh.read.aggregates", "wh.read.customers", "wh.admin"]},
    "payments": {"label": "Payments", "real": False,
                 "scopes": ["charges:read", "refunds:write:capped", "refunds:write", "payouts:admin"]},
}

TOOLS = [
    {"id": "tickets", "label": "tickets tool", "provider": "gmail", "obo": False},
    {"id": "warehouse", "label": "warehouse tool", "provider": "warehouse", "obo": False},
    {"id": "refunds", "label": "refunds tool", "provider": "payments", "obo": True},
    {"id": "chat", "label": "chat tool", "provider": "slack", "obo": False},
    {"id": "fetch", "label": "fetch tool", "provider": None, "obo": False},
]

ENTRIES = [
    {"id": "ticket", "label": "ticket body", "trusted": False, "session": "batch"},
    {"id": "email", "label": "customer email", "trusted": False, "session": "batch"},
    {"id": "web", "label": "web page fetched", "trusted": False, "session": "batch"},
    {"id": "chatmsg", "label": "staff chat message", "trusted": True, "session": "rep"},
]

# kind: read (private data), write, out (a way out of the system)
ACTIONS = [
    ["G1", "gmail", "tickets", "Read the support inbox", ["gmail.readonly", "gmail.modify", "https://mail.google.com/"], 4, False, "read"],
    ["G2", "gmail", "tickets", "Send email to any address", ["gmail.send", "gmail.modify", "https://mail.google.com/"], 6, True, "out"],
    ["G3", "gmail", "tickets", "Permanently delete mail", ["https://mail.google.com/"], 7, True, "write"],
    ["S1", "slack", "chat", "Read every public channel", ["channels:history"], 4, False, "read"],
    ["S2", "slack", "chat", "Post in #ops-agent", ["chat:write"], 1, False, "write"],
    ["S3", "slack", "chat", "Post in any channel, joined or not", ["chat:write.public"], 3, False, "write"],
    ["S4", "slack", "chat", "Read staff email addresses", ["users:read.email"], 3, False, "read"],
    ["S5", "slack", "chat", "Administer the workspace", ["admin"], 9, True, "write"],
    ["W1", "warehouse", "warehouse", "Query shipment aggregates", ["wh.read.aggregates", "wh.read.customers", "wh.admin"], 1, False, "read"],
    ["W2", "warehouse", "warehouse", "Read the customer contact table", ["wh.read.customers", "wh.admin"], 7, False, "read"],
    ["W3", "warehouse", "warehouse", "Export a table to an outside bucket", ["wh.admin"], 8, True, "out"],
    ["W4", "warehouse", "warehouse", "Drop a table", ["wh.admin"], 9, True, "write"],
    ["P1", "payments", "refunds", "Read charges", ["charges:read", "payouts:admin"], 3, False, "read"],
    ["P2", "payments", "refunds", "Refund up to 200 USD", ["refunds:write:capped", "refunds:write", "payouts:admin"], 4, True, "write"],
    ["P3", "payments", "refunds", "Refund any amount", ["refunds:write", "payouts:admin"], 8, True, "write"],
    ["P4", "payments", "refunds", "Change the payout bank account", ["payouts:admin"], 10, True, "write"],
    ["H1", "github", None, "Read source code", ["Contents: read", "Contents: write"], 5, False, "read"],
    ["H2", "github", None, "Push to main", ["Contents: write"], 8, False, "write"],
    ["H3", "github", None, "Overwrite Actions secrets", ["Secrets: write"], 8, False, "write"],
    ["H4", "github", None, "Delete a repository", ["Administration: write"], 10, True, "write"],
    ["F1", None, "fetch", "Fetch any URL, data in the query", [], 5, True, "out"],
]

CUT = {  # least scopes each tool's job needs
    "tickets": ["gmail.readonly", "gmail.send"],
    "chat": ["channels:history", "chat:write"],
    "warehouse": ["wh.read.aggregates"],
    "refunds": ["charges:read", "refunds:write:capped"],
}
REP = {"label": "support lead (Dana, constructed)", "scopes": ["charges:read", "refunds:write:capped"]}

HALYARD = {
    "constructed": "Constructed Halyard example: tools, warehouse and payments scope names and every weight are invented for teaching. Gmail, Slack and GitHub scope names are real.",
    "sensitiveAt": 3,
    "providers": PROVIDERS,
    "tools": TOOLS,
    "entries": ENTRIES,
    "actions": [dict(id=a[0], provider=a[1], tool=a[2], label=a[3], anyOf=a[4], w=a[5], irrev=a[6], kind=a[7]) for a in ACTIONS],
    "cut": CUT,
    "rep": REP,
}


def main():
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent)
    data = {"catalogue": CATALOGUE, "halyard": HALYARD}
    head = ("/* Scope catalogue: real published permission and scope names (GitHub, Slack, Google), read "
            + READ + ". Halyard graph: constructed for teaching. Generated by materials/build-asa-sample.py */\n")
    js = head + "window.ASA_SAMPLE = " + json.dumps(data, separators=(",", ":"), ensure_ascii=True) + ";\n"
    out = repo / "assets" / "asa-sample.js"
    out.write_text(js)
    print(f"wrote {out} ({len(js)} bytes)")


if __name__ == "__main__":
    main()
