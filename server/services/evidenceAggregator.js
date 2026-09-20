/**
 * Normalizes raw verification signals into structured Evidence items (§8).
 *
 * @param {Object} claims - Validated claims object
 * @param {Array} unverifiedFields - Fields rejected by the anti-hallucination gate
 * @param {Object} consistencyResult - Output from domainConsistency.js
 * @param {Object} rdapResult - Output from rdap.js
 * @param {Object} searchResult - Output from webSearch.js
 * @returns {Array<{
 *   source: 'extraction' | 'domain_consistency' | 'rdap' | 'web_search',
 *   finding: string,
 *   severity: 'info' | 'low' | 'medium' | 'high',
 *   supports: 'scam' | 'legit' | 'neutral',
 *   details: string,
 *   verified: boolean
 * }>}
 */
export function aggregateEvidence(claims, unverifiedFields, consistencyResult, rdapResult, searchResult) {
  const evidence = [];

  // 1. Unverified fields notice (Extraction Gate)
  if (Array.isArray(unverifiedFields) && unverifiedFields.length > 0) {
    const fieldNames = unverifiedFields.map(f => f.field).join(', ');
    evidence.push({
      source: 'extraction',
      finding: 'Unverifiable claims excluded from pipeline',
      severity: 'low',
      supports: 'neutral',
      details: `Extraction produced value(s) for [${fieldNames}] not found verbatim in the source text. These were excluded from verification to prevent hallucination.`,
      verified: false
    });
  }

  // 2. Direct Offer Flags: Payment Request
  if (claims.payment_requested) {
    const amtStr = claims.amount ? ` of ${claims.amount}` : '';
    evidence.push({
      source: 'extraction',
      finding: `Upfront financial transaction required${amtStr}`,
      severity: 'high',
      supports: 'scam',
      details: `The offer asks the recipient to pay or transfer money for equipment, checks, or processing fees. Legitimate corporate job offers do not charge candidates upfront.`,
      verified: true
    });
  }

  // 3. Direct Offer Flags: Pressure Phrases
  if (Array.isArray(claims.deadline_pressure_phrases) && claims.deadline_pressure_phrases.length > 0) {
    const phraseCount = claims.deadline_pressure_phrases.length;
    evidence.push({
      source: 'extraction',
      finding: `Artificial deadline pressure (${phraseCount} phrase${phraseCount > 1 ? 's' : ''})`,
      severity: phraseCount > 1 ? 'medium' : 'low',
      supports: 'scam',
      details: `Contains urgency markers such as "${claims.deadline_pressure_phrases.slice(0, 2).join('", "')}". High urgency is frequently used to rush victims into unverified actions.`,
      verified: true
    });
  }

  // 4. Domain & Entity Consistency
  if (consistencyResult) {
    const { category, freeEmailProvider, details } = consistencyResult;

    if (freeEmailProvider) {
      evidence.push({
        source: 'domain_consistency',
        finding: 'Free public email provider used for corporate hiring',
        severity: 'high',
        supports: 'scam',
        details: 'The sender uses a free webmail service (such as Gmail, Yahoo, or Outlook) rather than an official corporate domain.',
        verified: true
      });
    } else if (category === 'MATCH') {
      evidence.push({
        source: 'domain_consistency',
        finding: 'Sender email domain matches company entity',
        severity: 'info',
        supports: 'legit',
        details: details || 'The email domain directly corresponds to the stated hiring company.',
        verified: true
      });
    } else if (category === 'THIRD_PARTY_POSSIBLE') {
      evidence.push({
        source: 'domain_consistency',
        finding: 'Plausible third-party recruiter or staffing domain',
        severity: 'low',
        supports: 'neutral',
        details: details || 'The email domain does not match the hiring company name directly, but contains recognized staffing or talent agency indicators.',
        verified: true
      });
    } else if (category === 'MISMATCH') {
      evidence.push({
        source: 'domain_consistency',
        finding: 'Sender domain does not match hiring company',
        severity: 'high',
        supports: 'scam',
        details: details || 'The sender email domain differs substantially from the hiring company name.',
        verified: true
      });
    } else if (category === 'INSUFFICIENT_DATA') {
      evidence.push({
        source: 'domain_consistency',
        finding: 'Inconclusive domain-to-company link',
        severity: 'info',
        supports: 'neutral',
        details: 'Could not extract a verified company name and corporate email domain pair from the offer text.',
        verified: true
      });
    }
  }

  // 5. RDAP Domain Registration Signal
  if (rdapResult) {
    const { status, domainAgeDays, registrar, exists, isFreeEmail } = rdapResult;

    if (isFreeEmail || status === 'SKIPPED_FREE_EMAIL') {
      evidence.push({
        source: 'rdap',
        finding: 'Domain age verification not applicable for public email provider',
        severity: 'info',
        supports: 'neutral',
        details: 'Domain registration age is not an applicable legitimacy signal for free public webmail services (e.g. Gmail, Yahoo, Outlook) because anyone can create accounts on them.',
        verified: true
      });
    } else if (status === 'NOT_FOUND') {
      evidence.push({
        source: 'rdap',
        finding: 'Sender domain has no active DNS / RDAP registration',
        severity: 'high',
        supports: 'scam',
        details: 'The domain does not exist in public domain registry databases. It may be spoofed, mistyped, or inactive.',
        verified: true
      });
    } else if (status === 'OK' && typeof domainAgeDays === 'number') {
      const ageYears = (domainAgeDays / 365.25).toFixed(1);
      const regStr = registrar ? ` via ${registrar}` : '';

      if (domainAgeDays < 30) {
        evidence.push({
          source: 'rdap',
          finding: `Brand-new domain registration (${domainAgeDays} days old)`,
          severity: 'medium',
          supports: 'scam',
          details: `The sender domain was registered very recently (${domainAgeDays} days ago${regStr}). Freshly registered domains carry heightened impersonation risk.`,
          verified: true
        });
      } else if (domainAgeDays > 730) {
        evidence.push({
          source: 'rdap',
          finding: `Established domain registration (${ageYears} years old)`,
          severity: 'info',
          supports: 'legit',
          details: `Domain has been continuously registered for over ${ageYears} years${regStr}, demonstrating long-term operational standing.`,
          verified: true
        });
      } else {
        evidence.push({
          source: 'rdap',
          finding: `Active domain registration (${domainAgeDays} days old)`,
          severity: 'info',
          supports: 'neutral',
          details: `Domain registration is active${regStr}. Age is approximately ${Math.round(domainAgeDays / 30)} months.`,
          verified: true
        });
      }
    } else if (status === 'UNAVAILABLE') {
      evidence.push({
        source: 'rdap',
        finding: 'Domain registry lookup inconclusive',
        severity: 'info',
        supports: 'neutral',
        details: 'Registry lookup was unavailable or sender domain was missing. Contributes 0 risk points.',
        verified: true
      });
    }
  }

  // 6. Corporate Web Presence
  if (searchResult && searchResult.found !== 'UNKNOWN') {
    if (searchResult.found && searchResult.matchesSenderDomain) {
      evidence.push({
        source: 'web_search',
        finding: 'Public corporate & career presence confirmed',
        severity: 'info',
        supports: 'legit',
        details: `Official search results confirm the organization's corporate web presence matches the sender domain (${searchResult.topResultDomain}).`,
        verified: true
      });
    } else if (searchResult.found && !searchResult.matchesSenderDomain && searchResult.topResultDomain) {
      evidence.push({
        source: 'web_search',
        finding: 'Corporate presence found on different official domain',
        severity: 'low',
        supports: 'neutral',
        details: `Official search results locate the company primarily at ${searchResult.topResultDomain}.`,
        verified: true
      });
    }
  }

  return evidence;
}
