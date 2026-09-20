import React, { useState } from 'react';
import InputPanel from './components/InputPanel';
import VerdictBadge from './components/VerdictBadge';
import ClaimsSummary from './components/ClaimsSummary';
import EvidenceCard from './components/EvidenceCard';
import { analyzeOffer } from './api';

const SEVERITY_WEIGHT = {
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

export default function App() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (text) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeOffer(text);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setError(null);
  };

  // Sort evidence cards: high severity first
  const sortedEvidence = analysisResult?.evidence
    ? [...analysisResult.evidence].sort((a, b) => {
        const weightA = SEVERITY_WEIGHT[a.severity?.toLowerCase()] || 0;
        const weightB = SEVERITY_WEIGHT[b.severity?.toLowerCase()] || 0;
        return weightB - weightA;
      })
    : [];

  return (
    <div className="app-layout">
      {/* Clean, Minimal Text Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-lockup">
            <span className="brand-title">OfferCheck</span>
            <span className="brand-badge">Security Verification</span>
          </div>
          <span className="header-tagline">Automated Signal Analysis for Job & Internship Fraud</span>
        </div>
      </header>

      <main className="main-content">
        {!analysisResult ? (
          <InputPanel
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <div className="results-view-container">
            <div className="results-top-bar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                ← Analyze Another Offer
              </button>
              <span className="results-timestamp">
                Verified: {new Date().toLocaleTimeString()}
              </span>
            </div>

            {/* Verdict Badge */}
            <VerdictBadge assessment={analysisResult.assessment} />

            {/* Claims Summary */}
            <ClaimsSummary claims={analysisResult.claims} />

            {/* Evidence Section */}
            <section className="evidence-section">
              <div className="section-header">
                <h2 className="section-title">Verification Evidence & Signals</h2>
                <span className="evidence-count">
                  {sortedEvidence.length} signal{sortedEvidence.length === 1 ? '' : 's'} evaluated
                </span>
              </div>

              <div className="evidence-cards-list">
                {sortedEvidence.map((item, idx) => (
                  <EvidenceCard key={`${item.source}-${idx}`} evidenceItem={item} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Required Disclaimer Footer */}
      <footer className="app-footer">
        <p className="footer-disclaimer">
          Automated, signal-based assessment — not legal or professional advice. Verify independently.
        </p>
      </footer>
    </div>
  );
}
