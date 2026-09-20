import express from 'express';
import { extractClaims } from '../services/extractor.js';
import { validateExtraction } from '../services/extractionValidator.js';
import { checkDomainConsistency } from '../services/domainConsistency.js';
import { lookupRdap } from '../services/rdap.js';
import { searchCompanyCareers } from '../services/webSearch.js';
import { aggregateEvidence } from '../services/evidenceAggregator.js';
import { calculateRisk } from '../services/riskEngine.js';
import { recordAnalysis } from '../services/historyStore.js';

const router = express.Router();

/**
 * POST /api/analyze
 * Single end-to-end pipeline endpoint (§4).
 */
router.post('/', async (req, res) => {
  const { offerText } = req.body || {};

  if (!offerText || typeof offerText !== 'string' || !offerText.trim()) {
    return res.status(400).json({ error: 'offerText is required and must be a non-empty string.' });
  }

  try {
    // 1. Claim Extractor (LLM structured output)
    const rawClaims = await extractClaims(offerText);

    // 2. Extraction Validator (Anti-hallucination gate)
    const { validatedClaims, unverifiedFields } = validateExtraction(rawClaims, offerText);

    // 3. Evaluate Domain Consistency first to determine if sender uses a free public email
    const consistencyResult = checkDomainConsistency(
      validatedClaims.company_name,
      validatedClaims.sender_domain,
      validatedClaims.sender_email
    );

    const isFreeEmail = Boolean(consistencyResult?.freeEmailProvider);

    // 4. Verification signals (skip RDAP for free email providers to prevent misleading age cards)
    const [rdapResult, searchResult] = await Promise.all([
      isFreeEmail
        ? Promise.resolve({
            exists: true,
            domainAgeDays: null,
            registrationDate: null,
            registrar: null,
            status: 'SKIPPED_FREE_EMAIL',
            isFreeEmail: true
          })
        : lookupRdap(validatedClaims.sender_domain),
      searchCompanyCareers(
        validatedClaims.company_name,
        validatedClaims.sender_domain
      )
    ]);

    // 5. Evidence Aggregator (normalizes signals into structured Evidence[])
    const evidence = aggregateEvidence(
      validatedClaims,
      unverifiedFields,
      consistencyResult,
      rdapResult,
      searchResult
    );

    // 6. Deterministic Risk Engine
    const assessment = calculateRisk(
      validatedClaims,
      consistencyResult,
      rdapResult,
      searchResult
    );

    // Fire-and-forget history logging
    recordAnalysis({ claims: validatedClaims, assessment });

    // Final response
    return res.json({
      claims: validatedClaims,
      evidence,
      assessment
    });
  } catch (err) {
    console.error('[Analyze Route] Error executing verification pipeline:', err);
    return res.status(500).json({
      error: 'Failed to process offer verification pipeline.',
      details: err.message
    });
  }
});

export default router;
