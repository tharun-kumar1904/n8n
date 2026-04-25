// ============================================================
// Email Preprocessor
// Paste the contents of this file into an n8n Code node
// placed immediately after the Gmail Trigger node.
//
// Input:  Raw Gmail trigger JSON output
// Output: Clean { messageId, from, fromEmail, subject, body, date }
// ============================================================

const email = $input.item.json;

// ---- Strip HTML tags and decode common entities ----
function stripHtml(html) {
  return (html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove <style> blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove <script> blocks
    .replace(/<[^>]+>/g, ' ')                          // Strip all other tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')                              // Collapse whitespace
    .trim();
}

// ---- Extract plain email address from "Name <email@domain.com>" ----
function parseEmailAddress(raw) {
  if (!raw) return '';
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase().trim() : raw.toLowerCase().trim();
}

// ---- Extract first name from sender string ----
function extractFirstName(raw) {
  if (!raw) return 'there';
  // Try to get name before the email: "Alice Smith <alice@co.com>"
  const nameMatch = raw.match(/^([^<]+)</);
  if (nameMatch) {
    const parts = nameMatch[1].trim().split(' ');
    return parts[0] || 'there';
  }
  return 'there';
}

// ---- Process ----
const rawBody = email.text || email.html || email.snippet || '';
const cleanBody = stripHtml(rawBody).substring(0, 1500); // ~375 tokens max

// Guard: skip if this is a sent-by-us automated email
const fromEmail = parseEmailAddress(email.from);
const isSelfSent = fromEmail.includes('noreply') ||
                   fromEmail.includes('no-reply') ||
                   fromEmail.includes('donotreply');

if (isSelfSent) {
  // Return empty to stop processing
  return [];
}

return [{
  json: {
    messageId:    email.id,
    threadId:     email.threadId,
    from:         email.from || '',
    fromEmail:    fromEmail,
    fromName:     extractFirstName(email.from),
    to:           email.to || '',
    subject:      (email.subject || '(no subject)').trim(),
    body:         cleanBody,
    snippet:      (email.snippet || '').substring(0, 200),
    date:         email.date,
    receivedAt:   new Date().toISOString(),
    charCount:    cleanBody.length,
    estTokens:    Math.round(cleanBody.length / 4)
  }
}];
