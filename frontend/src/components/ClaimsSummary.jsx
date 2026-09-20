import React, { useState } from 'react';

export default function ClaimsSummary({ claims }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!claims) return null;

  return (
    <div className="claims-summary-container">
      <button
        type="button"
        className="claims-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="toggle-label">
          <span className="toggle-icon">{isOpen ? '▾' : '▸'}</span>
          What we read from this offer
        </span>
        <span className="toggle-hint">
          {isOpen ? 'Click to collapse extracted entities' : 'Click to inspect extracted claims'}
        </span>
      </button>

      {isOpen && (
        <div className="claims-content-table-wrapper">
          <table className="claims-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Claim Field</th>
                <th style={{ width: '52%' }}>Extracted Value</th>
                <th style={{ width: '20%' }}>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="field-name">Company Name</td>
                <td className="field-value">{claims.company_name || <span className="empty-val">None detected</span>}</td>
                <td>
                  <span className={`status-pill ${claims.company_name ? 'pill-verified' : 'pill-neutral'}`}>
                    {claims.company_name ? 'Extracted' : 'N/A'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="field-name">Sender Email</td>
                <td className="field-value font-mono">{claims.sender_email || <span className="empty-val">None detected</span>}</td>
                <td>
                  <span className={`status-pill ${claims.sender_email ? 'pill-verified' : 'pill-neutral'}`}>
                    {claims.sender_email ? 'Extracted' : 'N/A'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="field-name">Sender Domain</td>
                <td className="field-value font-mono">{claims.sender_domain || <span className="empty-val">None detected</span>}</td>
                <td>
                  <span className={`status-pill ${claims.sender_domain ? 'pill-verified' : 'pill-neutral'}`}>
                    {claims.sender_domain ? 'Extracted' : 'N/A'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="field-name">Payment Requested</td>
                <td className="field-value">
                  {claims.payment_requested ? (
                    <strong className="text-danger">YES {claims.amount ? `(${claims.amount})` : ''}</strong>
                  ) : (
                    <span className="text-success">No upfront fee detected</span>
                  )}
                </td>
                <td>
                  <span className={`status-pill ${claims.payment_requested ? 'pill-danger' : 'pill-success'}`}>
                    {claims.payment_requested ? 'High Risk' : 'Clear'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="field-name">Pressure Phrases</td>
                <td className="field-value">
                  {claims.deadline_pressure_phrases && claims.deadline_pressure_phrases.length > 0 ? (
                    <ul className="claim-list">
                      {claims.deadline_pressure_phrases.map((phrase, i) => (
                        <li key={i}>"{phrase}"</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="empty-val">None detected</span>
                  )}
                </td>
                <td>
                  <span className={`status-pill ${claims.deadline_pressure_phrases?.length > 0 ? 'pill-warning' : 'pill-neutral'}`}>
                    {claims.deadline_pressure_phrases?.length > 0 ? `${claims.deadline_pressure_phrases.length} found` : 'Clear'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="field-name">Claimed Affiliations</td>
                <td className="field-value">
                  {claims.claimed_affiliations && claims.claimed_affiliations.length > 0 ? (
                    <ul className="claim-list">
                      {claims.claimed_affiliations.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="empty-val">None detected</span>
                  )}
                </td>
                <td>
                  <span className="status-pill pill-neutral">
                    {claims.claimed_affiliations?.length || 0} listed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
