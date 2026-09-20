import express from 'express';

const router = express.Router();

// Stub handler according to Blueprint §4 contract for Step 1 validation
router.post('/', async (req, res) => {
  const { offerText } = req.body || {};

  if (!offerText || typeof offerText !== 'string' || !offerText.trim()) {
    return res.status(400).json({ error: 'offerText is required and must be a non-empty string.' });
  }

  // Contract stub
  return res.json({
    claims: {
      company_name: 'Acme Corp',
      sender_email: 'recruiting@acme.com',
      sender_domain: 'acme.com',
      payment_requested: false,
      amount: null,
      deadline_pressure_phrases: [],
      claimed_affiliations: []
    },
    evidence: [
      {
        source: 'domain_consistency',
        finding: 'Sender domain matches claimed company',
        severity: 'info',
        supports: 'legit',
        details: 'The sender domain acme.com matches the extracted company Acme Corp.',
        verified: true
      },
      {
        source: 'rdap',
        finding: 'Established domain registration (4,200 days old)',
        severity: 'info',
        supports: 'legit',
        details: 'Domain was registered with an active registrar and has an extensive history.',
        verified: true
      }
    ],
    assessment: {
      verdict: 'LIKELY_LEGIT',
      score: 0,
      insufficientEvidence: false,
      overrideApplied: null
    }
  });
});

export default router;
