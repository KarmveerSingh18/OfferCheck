import React, { useState, useEffect } from 'react';

const LOADING_STEPS = [
  'Reading claims from the offer...',
  'Checking domain registration...',
  'Searching for company presence...',
  'Scoring evidence...'
];

export default function InputPanel({ onAnalyze, isLoading, error }) {
  const [offerText, setOfferText] = useState('');
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setActiveStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!offerText.trim() || isLoading) return;
    onAnalyze(offerText);
  };

  return (
    <div className="input-panel-container">
      <div className="panel-header">
        <h2 className="panel-title">Verify Job or Internship Offer</h2>
        <p className="panel-subtitle">
          Paste the full text of an email, offer letter, or recruitment message to evaluate fraud signals and domain integrity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="analysis-form">
        <div className="form-group">
          <label htmlFor="offer-text-input" className="form-label">
            Offer Text
          </label>
          <textarea
            id="offer-text-input"
            className="offer-textarea"
            placeholder="Paste the complete offer email, message body, or contract text here (including sender details, email headers, salary, and requirements)..."
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            disabled={isLoading}
            rows={12}
            required
          />
        </div>

        {error && (
          <div className="alert-box alert-error" role="alert">
            <span className="alert-title">Analysis Error:</span> {error}
          </div>
        )}

        {!isLoading ? (
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!offerText.trim()}
            >
              Analyze Offer
            </button>
            <span className="action-hint">Deterministic verification across registration, consistency, and claims.</span>
          </div>
        ) : (
          <div className="loading-sequence-card" aria-live="polite">
            <div className="loading-header">
              <span className="loading-spinner-indicator" />
              <span className="loading-header-title">Executing Verification Pipeline</span>
            </div>
            <div className="loading-steps-list">
              {LOADING_STEPS.map((step, idx) => {
                const isCompleted = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                const isPending = idx > activeStepIndex;

                let statusClass = 'step-pending';
                let statusLabel = 'Queued';
                if (isCompleted) {
                  statusClass = 'step-done';
                  statusLabel = 'Done';
                } else if (isCurrent) {
                  statusClass = 'step-active';
                  statusLabel = 'Running';
                }

                return (
                  <div key={step} className={`loading-step-item ${statusClass}`}>
                    <span className="step-marker" />
                    <span className="step-text">{step}</span>
                    <span className="step-badge">{statusLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
