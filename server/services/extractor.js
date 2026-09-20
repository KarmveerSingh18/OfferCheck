import { GoogleGenerativeAI } from '@google/generative-ai';

const EXTRACTION_SYSTEM_PROMPT = `You are a forensic text claim extractor for job and internship offers.
Your job is ONLY to extract specific, literal claims made in the provided text.

CRITICAL RULES:
1. Do NOT invent, normalize, correct, or assume domain names or company names. Extract them verbatim as they appear in the text.
2. If an email address is present (e.g. hr@company-careers.org), sender_domain should be the domain portion ("company-careers.org").
3. payment_requested MUST be true IF AND ONLY IF the offer requires the candidate to pay/transfer money, buy equipment, pay an insurance/background deposit, or purchase gift cards. If the text says "no fees", "no upfront payment", or doesn't ask the candidate to pay money, payment_requested MUST be false.
4. amount: MUST be the specific sum the offer is asking the recipient/candidate to PAY, SEND, TRANSFER, or PROVIDE (e.g., "$250").
   - CRITICAL: Do NOT extract salary, hourly rate, stipend, bonus, or compensation figures (e.g., "$65/hr", "$5,000/month", "$120,000/year") as amount.
   - If payment_requested is false, or if no fee/payment amount was specified, amount MUST be null.

EXAMPLES OF AMOUNT EXTRACTION:
- Example A: "Starting compensation is $65/hr. You are required to pay a refundable equipment fee of $250."
  -> payment_requested: true, amount: "$250" (Ignore the $65/hr compensation figure).
- Example B: "Stipend is $1,500/month. No fees are associated with this application."
  -> payment_requested: false, amount: null (Ignore the $1,500/month stipend figure).
- Example C: "You must wire a deposit immediately to reserve your spot."
  -> payment_requested: true, amount: null (Payment demanded but no exact dollar figure stated).

5. deadline_pressure_phrases must be exact quotes from the text (e.g. "respond within 24 hours or forfeit").

6. Return strictly valid JSON with this exact shape:
{
  "company_name": string | null,
  "sender_email": string | null,
  "sender_domain": string | null,
  "payment_requested": boolean,
  "amount": string | null,
  "deadline_pressure_phrases": string[],
  "claimed_affiliations": string[]
}`;

/**
 * Extracts structured claims from the raw offer text using Gemini LLM.
 * @param {string} offerText
 * @returns {Promise<{
 *   company_name: string|null,
 *   sender_email: string|null,
 *   sender_domain: string|null,
 *   payment_requested: boolean,
 *   amount: string|null,
 *   deadline_pressure_phrases: string[],
 *   claimed_affiliations: string[]
 * }>}
 */
export async function extractClaims(offerText) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.LLM_API_KEY;

  if (!apiKey) {
    return fallbackRegexExtractor(offerText);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const prompt = `${EXTRACTION_SYSTEM_PROMPT}\n\n[OFFER TEXT TO ANALYZE]:\n"""\n${offerText}\n"""`;

  // Attempt 1 with 1 retry on parse failure
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      const parsed = JSON.parse(rawText);
      return sanitizeClaims(parsed, offerText);
    } catch (err) {
      console.warn(`[Extractor] LLM extraction attempt ${attempt} failed:`, err.message);
      if (attempt === 2) {
        console.warn('[Extractor] Falling back to regex extraction after retry failure.');
        return fallbackRegexExtractor(offerText);
      }
    }
  }

  return fallbackRegexExtractor(offerText);
}

function sanitizeClaims(data, rawText) {
  const company_name = typeof data?.company_name === 'string' && data.company_name.trim() ? data.company_name.trim() : null;
  const sender_email = typeof data?.sender_email === 'string' && data.sender_email.trim() ? data.sender_email.trim().toLowerCase() : null;
  
  let sender_domain = typeof data?.sender_domain === 'string' && data.sender_domain.trim() ? data.sender_domain.trim().toLowerCase() : null;
  if (!sender_domain && sender_email && sender_email.includes('@')) {
    sender_domain = sender_email.split('@')[1];
  }
  // Strip protocol or paths if included
  if (sender_domain) {
    sender_domain = sender_domain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  }

  const payment_requested = Boolean(data?.payment_requested);
  let amount = typeof data?.amount === 'string' && data.amount.trim() ? data.amount.trim() : null;
  if (!payment_requested) {
    amount = null;
  }

  const deadline_pressure_phrases = Array.isArray(data?.deadline_pressure_phrases)
    ? data.deadline_pressure_phrases.filter(p => typeof p === 'string' && p.trim())
    : [];
  const claimed_affiliations = Array.isArray(data?.claimed_affiliations)
    ? data.claimed_affiliations.filter(a => typeof a === 'string' && a.trim())
    : [];

  return {
    company_name,
    sender_email,
    sender_domain,
    payment_requested,
    amount,
    deadline_pressure_phrases,
    claimed_affiliations
  };
}

/**
 * Deterministic fallback regex extractor if no API key is provided or API is unreachable
 */
function fallbackRegexExtractor(text) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const sender_email = emailMatch ? emailMatch[0].toLowerCase() : null;
  let sender_domain = sender_email ? sender_email.split('@')[1] : null;

  if (!sender_domain) {
    const domainMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) sender_domain = domainMatch[1].toLowerCase();
  }

  // Company detection heuristic
  let company_name = null;
  const compMatch = text.match(/(?:on\s+behalf\s+of|joining|at|with|welcome\s+to|from)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*(?:\s+(?:LLC|Inc|Corp|Corporation|Technologies|Solutions|Group|Ltd|Staffing|Agency))?)/i)
    || text.match(/([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*(?:\s+(?:LLC|Inc|Corp|Corporation|Technologies|Solutions|Group|Ltd)))\s+(?:is\s+pleased|is\s+excited|welcomes|invites)/i);

  if (compMatch) {
    company_name = compMatch[1].split('\n')[0].trim();
  } else if (sender_domain && !sender_domain.includes('gmail') && !sender_domain.includes('yahoo') && !sender_domain.includes('outlook')) {
    const mainName = sender_domain.split('.')[0];
    company_name = mainName.charAt(0).toUpperCase() + mainName.slice(1);
  }

  // Payment heuristic with negation checking
  let payment_requested = false;
  let amount = null;

  // Check for explicit payment demands
  const affirmativePaymentPatterns = [
    /(?:submit|pay|send|wire|deposit|transfer|purchase)\s+(?:a\s+)?(?:\$\s*\d+|\w+\s+)*(?:fee|deposit|insurance|check|gift\s*card|crypto|bitcoin|equipment)/i,
    /(?:equipment|onboarding|background\s*check|registration|processing)\s+(?:fee|deposit|charge)\s+of\s+\$\s*\d+/i,
    /(?:refundable|mandatory|required)\s+(?:equipment|onboarding|insurance|deposit|fee)\s+(?:of\s+)?\$\s*\d+/i,
    /(?:fee|deposit|charge|insurance|payment)\s+of\s+\$\s*\d+/i
  ];

  for (const pat of affirmativePaymentPatterns) {
    const m = text.match(pat);
    if (m) {
      payment_requested = true;
      break;
    }
  }

  // Double check negation (e.g. "no fees", "no upfront payment")
  const negationPattern = /(?:no|never|without|zero|not)\s+(?:any\s+)?(?:fees?|payment|charges?|deposit|cost)/i;
  if (negationPattern.test(text) && !affirmativePaymentPatterns.some(p => p.test(text))) {
    payment_requested = false;
  }

  if (payment_requested) {
    // Specifically extract fee/payment amount, ignoring compensation rates like "$65/hr", "$5000/mo"
    const feeAmountMatch = text.match(/(?:fee|deposit|charge|insurance|payment|submit|pay|wire|transfer|send)[\w\s]{0,40}?(?:of\s+)?\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i)
      || text.match(/\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)[\w\s]{0,30}?(?:refundable|mandatory|equipment|insurance|onboarding|fee|deposit|charge)/i);

    if (feeAmountMatch) {
      amount = `$${feeAmountMatch[1]}`;
    }
  }

  // Pressure phrases
  const pressurePhrases = [];
  const pressureRegexes = [
    /urgent(?:ly)?/i,
    /within\s+\d+\s+(?:hours?|hrs?|days?)/i,
    /immediate(?:ly)?\s+(?:response|revoked|forfeit)/i,
    /offer\s+expires\s+in/i,
    /act\s+fast/i,
    /strictly\s+confidential/i
  ];
  for (const reg of pressureRegexes) {
    const m = text.match(reg);
    if (m) pressurePhrases.push(m[0]);
  }

  return {
    company_name,
    sender_email,
    sender_domain,
    payment_requested,
    amount,
    deadline_pressure_phrases: pressurePhrases,
    claimed_affiliations: []
  };
}
