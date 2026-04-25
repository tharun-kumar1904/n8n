# Setup Guide

Complete step-by-step instructions to get the AI Email Assistant running from scratch.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Docker Desktop | [Install here](https://docs.docker.com/get-docker/) |
| Gmail account | With API access enabled |
| OpenAI account | Paid tier recommended ($5 credit minimum) |
| Slack workspace | You need permission to add apps |
| Google account | For Sheets access |

---

## Step 1 — Clone and configure

```bash
git clone https://github.com/yourname/ai-email-assistant
cd ai-email-assistant

# Create your environment file from the template
cp docker/.env.example docker/.env
```

Open `docker/.env` in a text editor and fill in:

```
N8N_USER=admin                    # Your login username
N8N_PASSWORD=some-strong-password  # Your login password
N8N_ENCRYPTION_KEY=               # See step below
WEBHOOK_URL=http://localhost:5678  # Change for production
DB_USER=n8n_user
DB_PASSWORD=another-strong-password
```

**Generate the encryption key:**
```bash
openssl rand -hex 32
# Copy the output and paste it as N8N_ENCRYPTION_KEY
```

---

## Step 2 — Start n8n

```bash
docker compose -f docker/docker-compose.yml up -d
```

Check that both containers are running:
```bash
docker compose -f docker/docker-compose.yml ps
```

Open **http://localhost:5678** and log in with your `N8N_USER` / `N8N_PASSWORD`.

---

## Step 3 — Set up Gmail OAuth2

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "n8n Email Assistant")
3. Enable the **Gmail API** (APIs & Services → Enable APIs → search Gmail)
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:5678/rest/oauth2-credential/callback`
5. Copy the **Client ID** and **Client Secret**
6. In n8n: Settings → Credentials → Add Credential → **Gmail OAuth2 API**
7. Paste Client ID + Secret → Connect → Authorise with your Gmail account

---

## Step 4 — Add OpenAI credential

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. In n8n: Settings → Credentials → Add Credential → **OpenAI API**
4. Paste your API key → Save

---

## Step 5 — Add Slack credential

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From scratch
2. Name it "Email Assistant Bot", pick your workspace
3. Go to **OAuth & Permissions** → Bot Token Scopes → Add:
   - `chat:write`
   - `channels:read`
4. **Install to Workspace** → copy the **Bot User OAuth Token**
5. In n8n: Settings → Credentials → Add Credential → **Slack API**
6. Paste the Bot Token → Save
7. In Slack: go to `#urgent-inbox` and `#n8n-errors` channels → right-click → **Add Apps** → add your bot

---

## Step 6 — Set up Google Sheets

1. Create a new Google Spreadsheet
2. Add two sheets (tabs): `Email Log` and `Sales Leads`
3. In `Email Log`, add headers in row 1:
   ```
   Timestamp | Date | Message ID | From | Subject | Category | Sentiment | Summary | Suggested Action | Confidence
   ```
4. In `Sales Leads`, add headers:
   ```
   Date | From | Email | Subject | Summary | Action | Sentiment | Source
   ```
5. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`
6. In n8n: Settings → Credentials → Add Credential → **Google Sheets OAuth2 API**
   (You can reuse the same Google OAuth2 app you made for Gmail)

---

## Step 7 — Import the workflows

1. In n8n: Workflows → **Import from file**
2. Select `workflows/email-assistant.json` → Import
3. Repeat for `workflows/error-handler.json`
4. Open the `AI Email Assistant` workflow
5. Click each node that shows a credential warning (yellow!) and re-select your credential from the dropdown
6. In the Google Sheets nodes, update the `documentId` field with your Spreadsheet ID

---

## Step 8 — Connect the error handler

1. Open the `AI Email Assistant` workflow settings (gear icon top-right)
2. Under **Error Workflow**, select `Error Handler`
3. Save

---

## Step 9 — Test with sample data

1. In the workflow canvas, click the **Gmail Trigger** node
2. Click **"Listen for test event"**
3. Open `tests/sample-payloads.json` and copy one of the payload objects
4. Paste it into the test panel → Execute
5. Walk through the execution to verify each node works
6. Test all 6 payloads to cover every branch

---

## Step 10 — Activate

Once all tests pass, toggle the workflow to **Active** using the switch in the top-right corner. It will now poll Gmail every 5 minutes automatically.

---

## Deploying to Railway (Production)

1. Push your repo to GitHub (make sure `.env` is in `.gitignore`)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. In Railway's **Variables** tab, add all the values from your `docker/.env`
5. Railway will assign a public URL (e.g. `https://your-app.railway.app`)
6. Update `WEBHOOK_URL` in Railway's variables to match this URL
7. Also update the OAuth2 redirect URIs in Google Cloud Console to include the Railway URL

---

## Troubleshooting

**n8n won't start:**
```bash
docker compose -f docker/docker-compose.yml logs n8n
```
Check for missing environment variables or port conflicts.

**Gmail OAuth2 error:**
Make sure your redirect URI in Google Cloud Console exactly matches:
`https://your-domain.com/rest/oauth2-credential/callback`

**OpenAI returns empty/invalid JSON:**
- Check your API key has credits
- Make sure `response_format: json_object` is set in the OpenAI node
- The Parse AI Response node handles malformed output gracefully

**Emails processed twice:**
The "Mark as Read" node runs before processing. If you see duplicates, check that node is connected correctly and the credential is valid.
