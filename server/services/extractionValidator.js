/**
 * Anti-hallucination validation gate (§5).
 * Validates extracted string entities by ensuring they appear verbatim
 * (case-insensitive) in the original offer text.
 *
 * @param {Object} rawClaims - The claims returned by extractor.js
 * @param {string} offerText - The original raw offer text
 * @returns {{
 *   validatedClaims: Object,
 *   unverifiedFields: Array<{field: string, value: any, reason: string}>
 * }}
 */
export function validateExtraction(rawClaims, offerText) {
  if (!rawClaims || typeof rawClaims !== 'object') {
    return {
      validatedClaims: {
        company_name: null,
        sender_email: null,
        sender_domain: null,
        payment_requested: false,
        amount: null,
        deadline_pressure_phrases: [],
        claimed_affiliations: []
      },
      unverifiedFields: [{ field: 'claims', value: null, reason: 'Claims object was empty or invalid' }]
    };
  }

  const normalizedText = (offerText || '').toLowerCase();
  const unverifiedFields = [];

  const checkSubstring = (val) => {
    if (!val || typeof val !== 'string') return false;
    return normalizedText.includes(val.toLowerCase().trim());
  };

  // 1. Company Name check
  let company_name = rawClaims.company_name || null;
  if (company_name) {
    if (!checkSubstring(company_name)) {
      unverifiedFields.push({
        field: 'company_name',
        value: company_name,
        reason: `Company name "${company_name}" not found verbatim in source text.`
      });
      company_name = null;
    }
  }

  // 2. Sender Email check
  let sender_email = rawClaims.sender_email || null;
  if (sender_email) {
    if (!checkSubstring(sender_email)) {
      unverifiedFields.push({
        field: 'sender_email',
        value: sender_email,
        reason: `Email address "${sender_email}" not found verbatim in source text.`
      });
      sender_email = null;
    }
  }

  // 3. Sender Domain check
  let sender_domain = rawClaims.sender_domain || null;
  if (sender_domain) {
    if (!checkSubstring(sender_domain)) {
      unverifiedFields.push({
        field: 'sender_domain',
        value: sender_domain,
        reason: `Domain "${sender_domain}" not found verbatim in source text.`
      });
      sender_domain = null;
    }
  }

  // 4. Pressure phrases per-item check
  const validatedPressurePhrases = [];
  if (Array.isArray(rawClaims.deadline_pressure_phrases)) {
    for (const phrase of rawClaims.deadline_pressure_phrases) {
      if (typeof phrase === 'string' && phrase.trim()) {
        if (checkSubstring(phrase)) {
          validatedPressurePhrases.push(phrase.trim());
        } else {
          unverifiedFields.push({
            field: 'deadline_pressure_phrases',
            value: phrase,
            reason: `Urgency phrase "${phrase}" not found verbatim in source text.`
          });
        }
      }
    }
  }

  // 5. Claimed affiliations per-item check
  const validatedAffiliations = [];
  if (Array.isArray(rawClaims.claimed_affiliations)) {
    for (const aff of rawClaims.claimed_affiliations) {
      if (typeof aff === 'string' && aff.trim()) {
        if (checkSubstring(aff)) {
          validatedAffiliations.push(aff.trim());
        } else {
          unverifiedFields.push({
            field: 'claimed_affiliations',
            value: aff,
            reason: `Affiliation "${aff}" not found verbatim in source text.`
          });
        }
      }
    }
  }

  // payment_requested and amount are not verbatim string checked per §5
  const payment_requested = Boolean(rawClaims.payment_requested);
  const amount = typeof rawClaims.amount === 'string' ? rawClaims.amount.trim() : null;

  const validatedClaims = {
    company_name,
    sender_email,
    sender_domain,
    payment_requested,
    amount,
    deadline_pressure_phrases: validatedPressurePhrases,
    claimed_affiliations: validatedAffiliations
  };

  return {
    validatedClaims,
    unverifiedFields
  };
}
