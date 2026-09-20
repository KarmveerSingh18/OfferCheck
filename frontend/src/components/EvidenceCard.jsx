import React from 'react';

export default function EvidenceCard({ evidenceItem }) {
  if (!evidenceItem) return null;

  const { source, finding, severity, supports, details, verified } = evidenceItem;

  const getSourceLabel = (src) => {
    switch (src) {
      case 'domain_consistency':
        return 'Domain & Entity Consistency';
      case 'rdap':
        return 'RDAP Domain Registration';
      case 'web_search':
        return 'Corporate Web Presence';
      case 'extraction':
        return 'Claim Extraction Gate';
      default:
        return src;
    }
  };

  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'high':
        return 'badge-severity-high';
      case 'medium':
        return 'badge-severity-medium';
      case 'low':
        return 'badge-severity-low';
      default:
        return 'badge-severity-info';
    }
  };

  const getSupportsClass = (supp) => {
    if (supp === 'scam') return 'evidence-scam';
    if (supp === 'legit') return 'evidence-legit';
    return 'evidence-neutral';
  };

  const getSupportsLabel = (supp) => {
    if (supp === 'scam') return 'Risk Indicator';
    if (supp === 'legit') return 'Legitimacy Signal';
    return 'Neutral / Information';
  };

  return (
    <div className={`evidence-card ${getSupportsClass(supports)}`}>
      <div className="evidence-header">
        <div className="evidence-source-tag">
          <span className="source-name">{getSourceLabel(source)}</span>
          {verified === false && (
            <span className="unverified-tag">Unverified in source</span>
          )}
        </div>
        <div className="evidence-meta-tags">
          <span className={`severity-badge ${getSeverityBadgeClass(severity)}`}>
            {severity.toUpperCase()} PRIORITY
          </span>
          <span className="supports-tag">
            {getSupportsLabel(supports)}
          </span>
        </div>
      </div>

      <div className="evidence-body">
        <h3 className="evidence-finding">{finding}</h3>
        <p className="evidence-details">{details}</p>
      </div>
    </div>
  );
}
