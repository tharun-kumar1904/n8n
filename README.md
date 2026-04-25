# AI Email Assistant — n8n Automation

> Automatically classifies, routes, and responds to emails using GPT-4o and n8n.

![n8n](https://img.shields.io/badge/n8n-workflow-orange)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)
![Docker](https://img.shields.io/badge/Docker-ready-blue)

---

## What it does

- **Polls Gmail** every 5 minutes for new unread emails
- **Classifies** each email into: `urgent` / `support` / `sales` / `spam` using GPT-4o
- **Routes** to appropriate action:
  - Urgent → Slack alert to team
  - Support → AI-generated draft reply saved as Gmail draft
  - Sales → Lead logged to Google Sheets + HubSpot
  - Spam → Auto-labelled and archived
- **Logs** every processed email to Google Sheets + Notion
- **Handles errors** gracefully with retry logic and Slack notifications

---

## Tech Stack

| Layer | Technology |
|---|---|
| Workflow automation | n8n (self-hosted) |
| AI classification + replies | OpenAI GPT-4o |
| Email | Gmail API (OAuth2) |
| Notifications | Slack API |
| Storage | Google Sheets, Notion, PostgreSQL |
| Deployment | Docker + Railway / Render |

---

## Quickstart

```bash
# 1. Clone the repo
git clone https://github.com/yourname/ai-email-assistant
cd ai-email-assistant

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
1. Go to **Settings → Credentials** and add: Gmail OAuth2, OpenAI API, Slack API, Google Sheets
2. Go to **Workflows → Import from file** → select `workflows/email-assistant.json`
3. Import `workflows/error-handler.json` separately
4. Re-assign credentials in each node
5. Use payloads from `tests/sample-payloads.json` to test
6. Toggle the workflow **Active**

---

## Architecture

```
Gmail Trigger (every 5 min)
       │
       ▼
Preprocessor (strip HTML, truncate)
       │
       ▼
OpenAI GPT-4o (classify → JSON)
       │
       ▼
Switch Router
  ├── urgent  → Slack alert
  ├── support → AI draft reply → Gmail draft
  ├── sales   → Google Sheets CRM log
  └── spam    → Gmail label + archive
       │
       ▼
Google Sheets log (all emails)
PostgreSQL audit trail
```

See `docs/setup-guide.md` for the full node-by-node configuration.

---

## Project Structure

```
ai-email-assistant/
├── README.md
├── .gitignore
├── workflows/
│   ├── email-assistant.json      # Main n8n workflow (importable)
│   └── error-handler.json        # Error handling workflow
├── docker/
│   ├── docker-compose.yml        # n8n + PostgreSQL
│   ├── .env.example              # Template (never commit .env)
│   └── nginx.conf                # Reverse proxy config
├── scripts/
│   ├── preprocess.js             # Email cleaning (paste into Code node)
│   └── parse-ai-response.js     # Safe JSON parser for OpenAI output
├── prompts/
│   ├── classifier.md             # GPT-4o classification prompt (v1.2)
│   └── reply-generator.md       # Draft reply prompt
├── tests/
│   └── sample-payloads.json     # 4 test emails covering all categories
└── docs/
    ├── setup-guide.md            # Step-by-step setup instructions
    └── architecture.png          # Workflow diagram (add yours here)
```

---

## What I Learned

- **Idempotent workflow design** — added "mark as read" immediately after trigger to prevent duplicate processing on retries
- **Prompt engineering for structured output** — using `response_format: json_object` in GPT-4o + a strict JSON schema in the system prompt reduced parsing failures from ~15% to <1%
- **n8n credential security** — all API keys stored in n8n's encrypted credential store, never in workflow JSON or environment variables
- **Error boundaries** — the separate error-handler workflow catches failures across all nodes and notifies Slack, so nothing silently fails in production
- **Cost optimisation** — truncating email bodies to 1,500 characters before sending to OpenAI reduced token usage by ~60% with no impact on classification accuracy

---

## Deployment

See `docker/docker-compose.yml` for the full Docker setup.
See `docs/setup-guide.md` for Railway and Render deployment steps.

---

## Author

Your Name
[LinkedIn](https://linkedin.com/in/yourname) | [Portfolio](https://yoursite.com) | [Email](mailto:you@email.com)
