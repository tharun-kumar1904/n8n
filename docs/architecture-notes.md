# Architecture Diagram

Place your n8n workflow screenshot here as `architecture.png`.

## How to export from n8n

1. Open your workflow in the n8n canvas
2. Press `Ctrl+A` (or `Cmd+A`) to select all nodes
3. Take a screenshot, or use the n8n share button
4. Save as `architecture.png` in this folder
5. Reference it in README.md: `![Architecture](docs/architecture.png)`

## Workflow overview (text version)

```
Gmail Trigger (poll every 5 min)
  │
  ├─► Mark as Read
  │
  └─► Preprocess Email (strip HTML, truncate)
        │
        └─► OpenAI GPT-4o (classify → JSON)
              │
              └─► Parse AI Response (safe JSON parser)
                    │
                    └─► Confidence Check (IF confidence >= 0.5)
                          │
                          ├─[HIGH]─► Switch Router
                          │           ├── urgent  → Slack Alert
                          │           ├── support → Generate Draft → Gmail Draft
                          │           ├── sales   → Log to Sheets
                          │           └── spam    → Label + Archive
                          │                │
                          │                └─────────────────────► Log to Google Sheets
                          │
                          └─[LOW]──► Slack Manual Review
```
