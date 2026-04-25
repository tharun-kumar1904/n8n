// ============================================================
// OpenAI Response Parser
// Paste into an n8n Code node placed immediately AFTER
// the OpenAI classification node.
//
// Handles edge cases:
//  - Model wraps JSON in markdown code fences
//  - Model adds preamble text before the JSON
//  - JSON is malformed / model hallucinated
//  - Missing fields in otherwise valid JSON
//
// Input:  OpenAI node output + upstream Preprocess Email data
// Output: Merged object with all fields for downstream nodes
// ============================================================

const openAiOutput = $input.item.json;
const upstream = $('Preprocess Email').item.json;

// ---- Extract raw text from OpenAI response ----
const raw = openAiOutput.choices?.[0]?.message?.content || '';

// ---- Strip markdown code fences if present ----
// GPT-4o with response_format:json_object should not add these,
// but older models or misconfigured calls sometimes do.
let cleaned = raw
  .replace(/```json\n?/gi, '')
  .replace(/```\n?/g, '')
  .trim();

// ---- Attempt to extract JSON object if surrounded by text ----
// Finds the first { ... } block in the string
if (!cleaned.startsWith('{')) {
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];
}

// ---- Parse with fallback ----
let parsed;
let parseError = null;

try {
  parsed = JSON.parse(cleaned);
} catch (e) {
  parseError = e.message;
  // Fallback object — will route to manual review via Confidence Check (confidence=0)
  parsed = {
    category: 'unknown',
    sentiment: 'neutral',
    summary: `AI response could not be parsed. Raw: "${raw.substring(0, 100)}"`,
    suggested_action: 'Review email manually — AI classification failed',
    confidence: 0
  };
}

// ---- Validate and normalise fields ----
const validCategories  = ['urgent', 'support', 'sales', 'spam', 'unknown'];
const validSentiments  = ['positive', 'neutral', 'negative'];

const category  = validCategories.includes(parsed.category)  ? parsed.category  : 'unknown';
const sentiment = validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'neutral';
const confidence = typeof parsed.confidence === 'number'
  ? Math.min(1, Math.max(0, parsed.confidence))
  : 0;

// ---- Build merged output ----
return [{
  json: {
    // From preprocessor
    messageId:    upstream.messageId,
    threadId:     upstream.threadId,
    from:         upstream.from,
    fromEmail:    upstream.fromEmail,
    fromName:     upstream.fromName,
    to:           upstream.to,
    subject:      upstream.subject,
    body:         upstream.body,
    date:         upstream.date,
    receivedAt:   upstream.receivedAt,

    // From AI classification
    category,
    sentiment,
    summary:          parsed.summary          || '(no summary)',
    suggested_action: parsed.suggested_action || '(no action suggested)',
    confidence,

    // Debug
    parseError,
    processedAt: new Date().toISOString()
  }
}];
