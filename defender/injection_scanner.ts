/*
 * defender/injection_scanner.ts — heuristic PROMPT_INJECTION detection.
 * Collects merchant-controlled strings from the proposal and flags
 * instruction-override, payment-manipulation, and hidden-character signals.
 */

import { DefenderAssessmentRequest } from '../shared/types/index.js';

// Phrase categories
const INSTRUCTION_OVERRIDE_PHRASES = [
  'ignore previous',
  'ignore all instructions',
  'disregard',
  'system prompt',
  'you are now',
  'new instructions',
  'forget',
  'clear context',
];

const PAYMENT_MANIPULATION_PHRASES = [
  'approve the payment',
  'increase the budget',
  'change the amount',
  'send to',
  'skip verification',
  'transfer to',
  'pay to',
];

// The fixed phrases above miss simple rewordings ("ignore ALL previous instructions",
// "approve THIS transaction"), so these patterns allow the usual filler words in between.
const INSTRUCTION_OVERRIDE_PATTERNS = [
  /\b(ignore|disregard|forget|override)\s+(?:\w+\s+){0,3}(instructions?|rules|prompts?|guidelines|context)\b/,
  /\bignore\s+(?:\w+\s+){0,2}(previous|prior|above|earlier|preceding)\b/,
];

const PAYMENT_MANIPULATION_PATTERNS = [
  /\b(approve|authori[sz]e|confirm)\s+(?:\w+\s+){0,2}(payment|transaction|purchase|order|transfer)\b/,
  /\b(skip|bypass|disable)\s+(?:\w+\s+){0,2}(verification|security|checks?|review|defender)\b/,
];

// Zero-width and bidirectional control character ranges
const ZERO_WIDTH_CHARS = [
  '\u200B', // ZERO WIDTH SPACE
  '\u200C', // ZERO WIDTH NON-JOINER
  '\u200D', // ZERO WIDTH JOINER
  '\u200E', // LEFT-TO-RIGHT MARK
  '\u200F', // RIGHT-TO-LEFT MARK
  '\u202A', // LEFT-TO-RIGHT EMBEDDING
  '\u202B', // RIGHT-TO-LEFT EMBEDDING
  '\u202C', // POP DIRECTIONAL FORMATTING
  '\u202D', // LEFT-TO-RIGHT OVERRIDE
  '\u202E', // RIGHT-TO-LEFT OVERRIDE
  '\u2060', // WIDTH-NO-BREAK SPACE
  '\uFEFF', // BOM
];

// HTML / markdown comment patterns
const COMMENT_PATTERNS = [
  /<!--[\s\S]*?-->/g, // HTML comments
  /\[!--[\s\S]*?--\]/g, // markdown-style comments (less common)
];

/**
 * Check if a string contains zero-width or bidirectional control characters.
 */
function containsControlChars(str: string): boolean {
  for (const ch of str) {
    if (ZERO_WIDTH_CHARS.includes(ch)) return true;
  }
  return false;
}

/**
 * Check if a string looks like base64 (long enough, only base64 chars + padding).
 */
function looksLikeBase64(str: string): boolean {
  if (str.length < 40) return false;
  // Base64 alphabet: A-Z, a-z, 0-9, +, /, =
  const base64Regex = /^[A-Za-z0-9+/]*=*$/;
  return base64Regex.test(str);
}

/**
 * Extract all merchant-controlled strings from the proposal.
 */
function extractMerchantStrings(request: DefenderAssessmentRequest): Array<{ name: string; value: string }> {
  const results: Array<{ name: string; value: string }> = [];

  const { purchaseProposal, approvalToken } = request;
  const proposal = purchaseProposal;

  // merchantName
  results.push({ name: 'merchantName', value: proposal.merchantName });

  // productTitle
  results.push({ name: 'productTitle', value: proposal.productTitle });

  // sku
  results.push({ name: 'sku', value: proposal.sku });

  // variant fields and specs
  const variant = proposal.variant || {};
  if (variant.color) results.push({ name: 'variant.color', value: variant.color });
  if (variant.size) results.push({ name: 'variant.size', value: variant.size });
  if (variant.specs) {
    for (const [key, val] of Object.entries(variant.specs)) {
      results.push({ name: `variant.specs.${key}`, value: String(val) });
    }
  }

  // negotiationLog.description
  if (proposal.negotiationLog && proposal.negotiationLog.description) {
    results.push({ name: 'negotiationLog.description', value: proposal.negotiationLog.description });
  }

  // checkoutUrl
  results.push({ name: 'checkoutUrl', value: proposal.checkoutUrl });

  return results;
}

/**
 * Check a string snippet for instruction-override phrases.
 * Returns the severity if matched, otherwise null.
 */
function checkInstructionOverride(snippet: string): 'CRITICAL' | null {
  const lower = snippet.toLowerCase();
  for (const phrase of INSTRUCTION_OVERRIDE_PHRASES) {
    if (lower.includes(phrase)) return 'CRITICAL';
  }
  if (INSTRUCTION_OVERRIDE_PATTERNS.some((re) => re.test(lower))) return 'CRITICAL';
  return null;
}

/**
 * Check a string snippet for payment-manipulation phrases.
 * Returns the severity if matched, otherwise null.
 */
function checkPaymentManipulation(snippet: string): 'CRITICAL' | null {
  const lower = snippet.toLowerCase();
  for (const phrase of PAYMENT_MANIPULATION_PHRASES) {
    if (lower.includes(phrase)) return 'CRITICAL';
  }
  if (PAYMENT_MANIPULATION_PATTERNS.some((re) => re.test(lower))) return 'CRITICAL';
  return null;
}

/**
 * Check if text is addressed to an AI/agent/assistant.
 * Heuristic: starts with "assistant:", "bot:", "hey ", "ok ", etc.
 * Or contains patterns like " assistant" addressing the agent.
 */
function isAddressedToAI(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Common AI assistant prefixes
  const aiPrefixes = ['assistant:', 'bot:', 'hey assistant', 'ok assistant'];
  for (const prefix of aiPrefixes) {
    if (lower.startsWith(prefix)) return true;
  }
  // Check for "the shopping assistant" or similar role references
  if (/the\s+assistant/i.test(text) || /the\s+bot/i.test(text)) return true;
  return false;
}

/**
 * Check for role tags like <system>, <assistant>, etc.
 */
function containsRoleTags(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /<system>/i.test(text) ||
    /<assistant>/i.test(text) ||
    /<user>/i.test(text) ||
    /<prompt>/i.test(text)
  );
}

/**
 * Check for long base64-looking blobs.
 */
function checkBase64Blob(text: string): boolean {
  // Extract potential base64 strings (long sequences of base64 chars)
  const base64Regex = /[A-Za-z0-9+/]{40,}={0,2}/g;
  const matches = text.match(base64Regex);
  if (matches) {
    for (const match of matches) {
      if (looksLikeBase64(match)) return true;
    }
  }
  return false;
}

/**
 * Main scanning function: returns detected threats with field name and snippet.
 */
export interface InjectionThreat {
  type: string;
  severity: string;
  field: string;
  snippet: string;
}

export function scanPromptInjection(request: DefenderAssessmentRequest): InjectionThreat[] {
  const threats: InjectionThreat[] = [];
  const merchantStrings = extractMerchantStrings(request);

  for (const { name, value } of merchantStrings) {
    const snippet = value.length > 80 ? value.substring(0, 80) : value;
    const lower = snippet.toLowerCase();

    // 1. Check instruction-override phrases -> CRITICAL
    const overrideSeverity = checkInstructionOverride(snippet);
    if (overrideSeverity) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'CRITICAL',
        field: name,
        snippet,
      });
      // Don't break; continue checking other signals but we already have critical
      // Actually, let's continue to collect all signals
    }

    // 2. Check payment-manipulation phrases -> CRITICAL
    const manipSeverity = checkPaymentManipulation(snippet);
    if (manipSeverity) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'CRITICAL',
        field: name,
        snippet,
      });
    }

    // 3. Check if text is addressed to AI -> HIGH
    if (isAddressedToAI(snippet)) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'HIGH',
        field: name,
        snippet,
      });
    }

    // 4. Check for role tags -> HIGH
    if (containsRoleTags(snippet)) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'HIGH',
        field: name,
        snippet,
      });
    }

    // 5. Check for zero-width/bidi control characters -> HIGH
    if (containsControlChars(snippet)) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'HIGH',
        field: name,
        snippet,
      });
    }

    // 6. Check for HTML/markdown comments -> MEDIUM
    let commentHit: string | null = null;
    for (const pattern of COMMENT_PATTERNS) {
      const match = snippet.match(pattern);
      if (match) {
        commentHit = match[0].substring(0, 80);
        break;
      }
    }
    if (commentHit) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'MEDIUM',
        field: name,
        snippet: commentHit,
      });
    }

    // 7. Check for long base64-looking blobs -> MEDIUM
    if (checkBase64Blob(snippet)) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'MEDIUM',
        field: name,
        snippet,
      });
    }

    // 8. Weaker signals: check for AI-related addressing that's subtler
    // "the shopping assistant", "the bot", etc. as weaker signal -> MEDIUM
    if (/the\s+shopping\s+assistant/i.test(lower) || /the\s+bot/i.test(lower)) {
      threats.push({
        type: 'PROMPT_INJECTION',
        severity: 'MEDIUM',
        field: name,
        snippet,
      });
    }
  }

  return threats;
}