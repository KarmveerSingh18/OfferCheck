import { GoogleGenerativeAI } from '@google/generative-ai';

const CLAIM_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    company_name: {
      type: 'string',
      description: 'The exact company or organization name offering the job, or null if unspecified.'
    },
    sender_email: {
      type: 'string',
      description: 'The email address of the recruiter, sender, or contact person, or null if none.'
    },
    sender_domain: {
      type: 'string',
      description: 'The domain name of the sender email or company website mentioned, or null.'
    },
    payment_requested: {
      type: 'boolean',
      description: 'Whether any upfront fee, background check fee, equipment deposit, training charge, or crypto/giftcard transaction is requested.'
    },
    amount: {
      type: 'string',
      description: 'The specific payment amount requested if payment_requested is true, otherwise null.'
    },
    deadline_pressure_phrases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Verbatim phrases indicating artificial urgency, immediate reply demands, or expiration threats.'
    },
    claimed_affiliations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Any notable organizations, institutions, universities, or partners claimed in the text.'
    }
  },
  required: [
    'company_name',
    'sender_email',
    'sender_domain',
    'payment_requested',
    'amount',
    'deadline_pressure_phrases',
    'claimed_affiliations'
  ]
};

const EXTRACTION_SYSTEM_PROMPT = `You are a forensic text claim extractor for job and internship offers.
Your job is ONLY to extract specific, literal claims made in the provided text.
CRITICAL RULES:
1. Do NOT invent, normalize, correct, or assume domain names or company names. Extract them verbatim as they appear in the text.
2. If an email address is present (e.g. hr@company-careers.org), sender_domain should be the domain portion ("company-careers.org").
3. payment_requested MUST be true if the offer asks the candidate to pay for equipment, software, background checks, registration, processing, wire transfers, or cryptocurrency.
4. deadline_pressure_phrases must be exact quotes from the text (e.g. "respond within 24 hours or forfeit").
5. Return strictly valid JSON adhering to the specified schema. No markdown formatting, no commentary.`;

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
    console.warn('[Extractor] No GEMINI_API_KEY configured in environment. Using deterministic fallback parser.');
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
  // Strip protocol or paths if LLM included them
  if (sender_domain) {
    sender_domain = sender_domain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  }

  const payment_requested = Boolean(data?.payment_requested);
  const amount = typeof data?.amount === 'string' && data.amount.trim() ? data.amount.trim() : null;
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
  const compMatch = text.match(/(?:at|from|with|joining)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?(?:\s+(?:Inc|LLC|Corp|Corporation|Technologies|Solutions|Group|Ltd))?)/);
  if (compMatch) {
    company_name = compMatch[1].trim();
  } else if (sender_domain) {
    const mainName = sender_domain.split('.')[0];
    company_name = mainName.charAt(0).toUpperCase() + mainName.slice(1);
  }

  // Payment heuristic
  const paymentRegex = /(?:fee|deposit|payment|pay\s+\$|wire\s+transfer|gift\s+card|bitcoin|crypto|check\s+deposit|equipment\s+fee|background\s+check\s+fee)/i;
  const payment_requested = paymentRegex.test(text);

  const amountMatch = text.match(/\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  const amount = amountMatch ? `$${amountMatch[1]}` : null;

  // Pressure phrases
  const pressurePhrases = [];
  const pressureRegexes = [
    /urgent(?:ly)?/i,
    /within\s+\d+\s+(?:hours?|hrs?|days?)/i,
    /immediate(?:ly)?\s+response/i,
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
    amount: payment_requested ? amount : null,
    deadline_pressure_phrases: pressurePhrases,
    claimed_affiliations: []
  };
}
