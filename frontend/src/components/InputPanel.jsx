import React, { useState, useEffect } from 'react';

const LOADING_STEPS = [
  'Reading claims from the offer...',
  'Checking domain registration...',
  'Searching for company presence...',
  'Scoring evidence...'
];

const SAMPLE_SUSPICIOUS = `From: Google Recruitment Team <google.careers.hr@gmail.com>
Subject: Urgent Job Offer - Remote Software Intern

Congratulations! Google LLC is pleased to offer you the position of Remote Software Engineer Intern.
Your starting compensation is $65/hr.

To finalize your onboarding and dispatch your company laptop, you are required to submit a refundable equipment insurance fee of $250 via wire transfer within 24 hours or this offer will be revoked immediately.

Contact: google.careers.hr@gmail.com
Google LLC`;

const SAMPLE_LEGITIMATE = `From: Microsoft University Recruiting <internships@microsoft.com>
Subject: Offer of Employment - Software Engineer Intern

Dear Candidate,
Microsoft Corporation is pleased to extend an offer for the Software Engineer Intern role in Redmond, WA.
Please review your formal offer letter attached and accept through the Microsoft Careers portal at microsoft.com.
There are no fees associated with this application or onboarding process.

Best regards,
University Talent Team
Microsoft Corporation
internships@microsoft.com`;

const SAMPLE_BORDERLINE = `From: Sarah Jenkins <s.jenkins@talent-partners.com>
Subject: Opportunity with Acme Technologies

Hi there,
I am a senior recruiter at Talent Partners Staffing. We are currently recruiting on behalf of Acme Technologies for a Backend Developer role with an annual salary of $120,000.
Please let me know if you would like to review the job description. No upfront payment or fees are ever required.

Best,
Sarah Jenkins
Talent Partners Staffing
s.jenkins@talent-partners.com`;

const SAMPLES = [
  { label: 'Try: Suspicious Offer', text: SAMPLE_SUSPICIOUS },
  { label: 'Try: Legitimate Offer', text: SAMPLE_LEGITIMATE },
  { label: 'Try: Borderline Case', text: SAMPLE_BORDERLINE },
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
        <p className="panel-differentiator">
          Independent verification across domain registration, sender consistency, and claim extraction — not a keyword filter.
        </p>
        <p className="panel-instruction">
          Paste the full text of an email, offer letter, or recruitment message to evaluate fraud signals and domain integrity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="analysis-form">
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="offer-text-input" className="form-label">
              Offer Text
            </label>
            <div className="sample-buttons">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  className="btn btn-sample"
                  disabled={isLoading}
                  onClick={() => setOfferText(sample.text)}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
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
