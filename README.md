# AI Email Assistant — n8n Automation

> Automatically classifies, routes, and responds to emails using Groq's Llama 3.3 70B and n8n.

![n8n](https://img.shields.io/badge/n8n-workflow-orange)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-blue)
![Docker](https://img.shields.io/badge/Docker-ready-blue)

---

## What it does

- **Polls Gmail** every 5 minutes for new unread emails
- **Classifies** each email into: `urgent` / `support` / `sales` / `spam` using Groq's `llama-3.3-70b-versatile`
- **Routes** to appropriate action:
  - Urgent → Slack alert to team
  - Support → AI-generated draft reply saved as Gmail draft
  - Sales → Lead logged to Google Sheets
  - Spam → Auto-labelled and archived
- **Logs** every processed email to Google Sheets + Notion
- **Handles errors** gracefully with retry logic and Slack notifications

---

## Tech Stack

| Layer | Technology |
|---|---|
| Workflow automation | n8n (self-hosted) |
| AI classification + replies | Groq API (Llama 3.3 70B) via HTTP Request |
| Email | Gmail API (OAuth2) |
| Notifications | Slack API |
| Storage | Google Sheets, Notion, PostgreSQL |
| Deployment | Docker + Railway / Render |

---

## Quickstart

```bash
# 1. Clone the repo
git clone https://github.com/tharun-kumar1904/n8n.git
cd n8n

# 2. Set up environment
cp docker/.env.example docker/.env
# Edit docker/.env and fill in your credentials

# 3. Generate an encryption key
openssl rand -hex 32
# Paste result into N8N_ENCRYPTION_KEY in .env

# 4. Start n8n + PostgreSQL
docker compose -f docker/docker-compose.yml up -d

# 5. Open the UI
open http://localhost:5678
```

Once inside n8n:
1. Go to **Settings → Credentials** and add:
   - **Gmail OAuth2** — for reading/writing emails
   - **HTTP Header Auth** — for Groq API (Header Name: `Authorization`, Value: `Bearer YOUR_GROQ_API_KEY`)
   - **Slack API** — for notifications
   - **Google Sheets OAuth2** — for logging
   - **Notion API** — for dashboard (optional)
2. Go to **Workflows → Import from file** → select `workflows/email-assistant-final.json`
3. Import `workflows/error-handler.json` separately
4. Re-assign credentials in each node
5. In Google Sheets nodes, replace `REPLACE_WITH_YOUR_SPREADSHEET_ID` with your actual ID
6. Use payloads from `tests/sample-payloads.json` to test
7. Toggle the workflow **Active**

---

## Architecture

```
Gmail Trigger (every 5 min)
       │
       ▼
Mark as Read (prevent duplicates)
       │
       ▼
Preprocessor (strip HTML, truncate to 2000 chars)
       │
       ▼
HTTP Request → Groq API (Llama 3.3 classify → JSON)
       │
       ▼
Parse AI Response (safe JSON parser with fallback)
       │
       ▼
Switch Router
  ├── urgent  → Slack alert
  ├── support → AI draft reply (Groq) → Gmail draft
  ├── sales   → Google Sheets CRM log
  └── spam    → Gmail label + archive
       │
       ▼
Google Sheets log (all emails)
Notion dashboard
```

See `docs/setup-guide.md` for the full node-by-node configuration.

---

## Project Structure

```
ai-email-assistant/
├── README.md
├── .gitignore
├── Dockerfile
├── workflows/
│   ├── email-assistant-final.json  # Production workflow (Groq + Notion)
│   ├── email-assistant.json        # Full workflow with confidence check
│   ├── master-assistant.json       # Simplified master workflow
│   └── error-handler.json          # Error handling workflow
├── docker/
│   ├── docker-compose.yml          # n8n + PostgreSQL
│   ├── .env.example                # Template (never commit .env)
│   └── nginx.conf                  # Reverse proxy config
├── scripts/
│   ├── preprocess.js               # Email cleaning (paste into Code node)
│   └── parse-ai-response.js        # Safe JSON parser for AI output
├── prompts/
│   ├── classifier.md               # Classification prompt (v1.2)
│   └── reply-generator.md          # Draft reply prompt
├── tests/
│   └── sample-payloads.json        # 6 test emails covering all categories
└── docs/
    ├── setup-guide.md              # Step-by-step setup instructions
    └── architecture-notes.md       # Workflow diagram notes
```

---

## Credential Setup Guide

### Groq API (replaces OpenAI — $0 cost)

In n8n, create an **HTTP Header Auth** credential:
- **Name:** `Groq API Key`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer YOUR_GROQ_API_KEY`

Get your free key at [console.groq.com](https://console.groq.com)

### Why HTTP Request instead of OpenAI node?

The workflow uses `n8n-nodes-base.httpRequest` instead of the built-in OpenAI/LangChain nodes because:
1. **Direct API control** — works with any OpenAI-compatible API (Groq, Together, Ollama)
2. **No version conflicts** — LangChain sub-nodes (`@n8n/n8n-nodes-langchain.openAi`) are designed for AI Agent chains, not standalone use
3. **Better debugging** — raw HTTP responses are easier to inspect

---

## What I Learned

- **Idempotent workflow design** — added "mark as read" immediately after trigger to prevent duplicate processing on retries
- **Prompt engineering for structured output** — using a strict JSON schema in the system prompt reduced parsing failures from ~15% to <1% when using Llama 3.3.
- **n8n credential security** — all API keys stored in n8n's encrypted credential store, never in workflow JSON or environment variables
- **Error boundaries** — the separate error-handler workflow catches failures across all nodes and notifies Slack, so nothing silently fails in production
- **Cost optimisation** — switching from OpenAI to Groq's extremely fast free tier reduced API costs to exactly $0 while processing emails 10x faster.
- **Node type matters** — LangChain sub-nodes vs standard nodes in n8n serve different purposes; using HTTP Request nodes gives maximum compatibility

---

## Deployment

See `docker/docker-compose.yml` for the full Docker setup.
See `docs/setup-guide.md` for Railway and Render deployment steps.

---

## Author

Tharun Kumar
[GitHub](https://github.com/tharun-kumar1904)
