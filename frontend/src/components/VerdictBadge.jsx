import React from 'react';

export default function VerdictBadge({ assessment }) {
  if (!assessment) return null;

  const { verdict, score, insufficientEvidence, overrideApplied } = assessment;

  let verdictLabel = 'SUSPICIOUS';
  let verdictTheme = 'theme-suspicious';
  let verdictDescription = 'Multiple inconsistencies or risk signals detected. Exercise heightened caution.';

  if (verdict === 'LIKELY_LEGIT') {
    verdictLabel = 'LIKELY LEGITIMATE';
    verdictTheme = 'theme-legit';
    verdictDescription = 'Key domain, entity, and recruitment signals match established records with low risk indicators.';
  } else if (verdict === 'LIKELY_SCAM') {
    verdictLabel = 'LIKELY SCAM';
    verdictTheme = 'theme-scam';
    verdictDescription = 'High-confidence fraudulent or deceptive markers identified across domain, payment, or claims.';
  } else {
    verdictLabel = 'SUSPICIOUS';
    verdictTheme = 'theme-suspicious';
    verdictDescription = 'Anomalous or unverified signals require manual cross-referencing before taking any action.';
  }

  return (
    <div className="verdict-section">
      {insufficientEvidence && (
        <div className="alert-box alert-warning insufficient-banner">
          <div className="alert-badge">CAUTION</div>
          <div>
            <strong>Limited verification data available.</strong>
            <p>Fewer than two external verification signals returned conclusive data. Treat this preliminary assessment with extra caution.</p>
          </div>
        </div>
      )}

      <div className={`verdict-card ${verdictTheme}`}>
        <div className="verdict-header-row">
          <span className="verdict-subheading">ASSESSMENT VERDICT</span>
          <span className="risk-score-pill">
            Risk Score: <strong>{score}</strong>/100
          </span>
        </div>

        <div className="verdict-title-row">
          <h1 className="verdict-title">{verdictLabel}</h1>
        </div>

        <p className="verdict-summary-text">{verdictDescription}</p>

        {overrideApplied && (
          <div className="override-callout">
            <span className="override-tag">CRITICAL RULE APPLIED</span>
            <span className="override-text">
              {overrideApplied === 'payment_requested_override' && 'Upfront payment/fee requirement enforces a minimum Suspicious verdict regardless of other signals.'}
              {overrideApplied === 'domain_not_found_override' && 'Non-existent / unregistered sender domain enforces a minimum Suspicious verdict.'}
              {overrideApplied !== 'payment_requested_override' && overrideApplied !== 'domain_not_found_override' && `Safety override applied: ${overrideApplied}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
