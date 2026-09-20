/**
 * Deterministic Risk Engine (§7).
 * Pure function computing risk score, overrides, and verdict without any LLM calls.
 *
 * @param {Object} claims - Validated claims
 * @param {Object} consistencyResult - domainConsistency result
 * @param {Object} rdapResult - rdap lookup result
 * @param {Object} searchResult - web search result
 * @returns {{
 *   verdict: 'LIKELY_LEGIT' | 'SUSPICIOUS' | 'LIKELY_SCAM',
 *   score: number,
 *   insufficientEvidence: boolean,
 *   overrideApplied: string | null
 * }}
 */
export function calculateRisk(claims, consistencyResult, rdapResult, searchResult) {
  let score = 0;
  let overrideApplied = null;

  // 1. Additive Risk Points

  // Payment requested: +40
  if (claims?.payment_requested) {
    score += 40;
  }

  // Deadline pressure phrases: +10 each, capped at +20
  if (Array.isArray(claims?.deadline_pressure_phrases)) {
    const phraseCount = claims.deadline_pressure_phrases.length;
    const pressurePoints = Math.min(20, phraseCount * 10);
    score += pressurePoints;
  }

  // Free/public email provider: +20
  if (consistencyResult?.freeEmailProvider) {
    score += 20;
  }

  // Domain/company MISMATCH: +25 (only if not already free provider, to avoid double count on category)
  if (consistencyResult?.category === 'MISMATCH' && !consistencyResult?.freeEmailProvider) {
    score += 25;
  }

  // RDAP NOT_FOUND: +40
  if (rdapResult?.status === 'NOT_FOUND') {
    score += 40;
  }

  // RDAP domain age < 30 days: +15
  if (rdapResult?.status === 'OK' && typeof rdapResult?.domainAgeDays === 'number' && rdapResult.domainAgeDays < 30) {
    score += 15;
  }

  // 2. Mitigating Points (subtracted)

  // RDAP domain age > 2 years (730 days) and consistency MATCH: -20
  if (
    rdapResult?.status === 'OK' &&
    typeof rdapResult?.domainAgeDays === 'number' &&
    rdapResult.domainAgeDays > 730 &&
    consistencyResult?.category === 'MATCH'
  ) {
    score -= 20;
  }

  // Web search confirms official presence on matching domain: -15
  if (searchResult?.found === true && searchResult?.matchesSenderDomain === true) {
    score -= 15;
  }

  // Floor score at 0 and cap at 100
  score = Math.max(0, Math.min(100, score));

  // 3. Evaluate Base Verdict by Threshold
  let verdict = 'LIKELY_LEGIT';
  if (score >= 50) {
    verdict = 'LIKELY_SCAM';
  } else if (score >= 20) {
    verdict = 'SUSPICIOUS';
  } else {
    verdict = 'LIKELY_LEGIT';
  }

  // 4. Hard Overrides (Evaluated per §7)
  // Override 1: payment_requested === true -> cannot be LIKELY_LEGIT (minimum SUSPICIOUS)
  if (claims?.payment_requested) {
    if (verdict === 'LIKELY_LEGIT') {
      verdict = 'SUSPICIOUS';
      overrideApplied = 'payment_requested_override';
    } else if (!overrideApplied) {
      overrideApplied = 'payment_requested_override';
    }
  }

  // Override 2: RDAP status === "NOT_FOUND" -> cannot be LIKELY_LEGIT (minimum SUSPICIOUS)
  if (rdapResult?.status === 'NOT_FOUND') {
    if (verdict === 'LIKELY_LEGIT') {
      verdict = 'SUSPICIOUS';
      overrideApplied = 'domain_not_found_override';
    } else if (!overrideApplied) {
      overrideApplied = 'domain_not_found_override';
    }
  }

  // 5. Insufficient Evidence Detection
  // Usable signals count (excluding UNAVAILABLE / INSUFFICIENT_DATA / UNKNOWN)
  let usableSignalsCount = 0;

  if (consistencyResult && consistencyResult.category !== 'INSUFFICIENT_DATA') {
    usableSignalsCount += 1;
  }

  if (rdapResult && (rdapResult.status === 'OK' || rdapResult.status === 'NOT_FOUND')) {
    usableSignalsCount += 1;
  }

  if (searchResult && searchResult.found !== 'UNKNOWN') {
    usableSignalsCount += 1;
  }

  // If a hard override applied, the verdict is a confident rule-based determination.
  const insufficientEvidence = overrideApplied ? false : usableSignalsCount < 2;

  return {
    verdict,
    score,
    insufficientEvidence,
    overrideApplied
  };
}

// Inline sanity checks run on module import in dev
(function runSanityChecks() {
  try {
    // Case 1: Scam with payment + non-existent domain -> LIKELY_SCAM (score >= 50)
    const scamRes = calculateRisk(
      { payment_requested: true, deadline_pressure_phrases: ['urgent response required'] },
      { category: 'MISMATCH', freeEmailProvider: true },
      { status: 'NOT_FOUND' },
      { found: 'UNKNOWN' }
    );
    if (scamRes.verdict !== 'LIKELY_SCAM' || scamRes.score < 50) {
      console.error('[RiskEngine Sanity Check Failed]: Case 1 should be LIKELY_SCAM with score >= 50', scamRes);
    }

    // Case 2: Legit established company with matching domain -> LIKELY_LEGIT
    const legitRes = calculateRisk(
      { payment_requested: false, deadline_pressure_phrases: [] },
      { category: 'MATCH', freeEmailProvider: false },
      { status: 'OK', domainAgeDays: 3000 },
      { found: true, matchesSenderDomain: true }
    );
    if (legitRes.verdict !== 'LIKELY_LEGIT' || legitRes.score > 0) {
      console.error('[RiskEngine Sanity Check Failed]: Case 2 should be LIKELY_LEGIT with score 0', legitRes);
    }

    // Case 3: Override test: payment requested but artificially suppressed score -> must be SUSPICIOUS, not LIKELY_LEGIT
    const overrideRes = calculateRisk(
      { payment_requested: true, deadline_pressure_phrases: [] },
      { category: 'MATCH', freeEmailProvider: false },
      { status: 'OK', domainAgeDays: 4000 },
      { found: true, matchesSenderDomain: true }
    );
    // Score calculation: +40 (payment) - 20 (old domain match) - 15 (search match) = 5
    // Score 5 is below threshold 20, but payment override must enforce SUSPICIOUS
    if (overrideRes.verdict !== 'SUSPICIOUS' || overrideRes.overrideApplied !== 'payment_requested_override') {
      console.error('[RiskEngine Sanity Check Failed]: Case 3 payment override failed', overrideRes);
    }
  } catch (err) {
    console.error('[RiskEngine Sanity Check Error]:', err);
  }
})();
