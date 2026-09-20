import React, { useState, useEffect } from 'react';

const LOADING_STEPS = [
  'Reading claims from the offer...',
  'Checking domain registration...',
  'Searching for company presence...',
  'Scoring evidence...'
];

const SAMPLE_SUSPICIOUS = `Subject: Exciting Remote Data Entry Position - Start Immediately!
From: sarah.thompson@gmail.com

Hi there,

I'm Sarah Thompson, a Senior Recruiter at Google. I found your resume on Indeed and I'm impressed with your qualifications. We have an immediate opening for a Remote Data Entry Specialist.

Position Details:
- Company: Google LLC
- Position: Remote Data Entry Specialist
- Pay: $65/hr
- Hours: Flexible, 20-40 hrs/week
- Location: 100% Remote

To secure your position, we require a $250 refundable equipment insurance fee. This will be returned after 90 days of employment. Please send payment via Zelle to equipment.dept@gmail.com.

Once payment is confirmed, we'll ship your equipment and onboarding materials within 48 hours.

Best regards,
Sarah Thompson
Senior Recruiter, Google LLC
sarah.thompson@gmail.com`;

const SAMPLE_LEGITIMATE = `Subject: Offer of Employment - Software Engineer II
From: recruiting@microsoft.com

Dear Candidate,

Following your interviews on May 15th and 20th, I am pleased to extend an offer of employment for the position of Software Engineer II at Microsoft Corporation.

Position: Software Engineer II
Team: Azure Cloud Infrastructure
Location: Redmond, WA (Building 34)
Start Date: July 15, 2025
Base Salary: $165,000/year
Signing Bonus: $25,000
Annual Stock Award: $120,000 (vesting over 4 years)

Benefits include comprehensive health/dental/vision insurance, 401(k) matching, and employee stock purchase plan.

Please review the attached formal offer letter and return the signed copy within 10 business days to recruiting@microsoft.com.

Best regards,
Jennifer Walsh
Senior Technical Recruiter
Microsoft Corporation
recruiting@microsoft.com`;

const SAMPLE_BORDERLINE = `Subject: Contract Opportunity - Marketing Coordinator
From: david.chen@talentpartners-recruiting.com

Hi,

I'm David Chen from Talent Partners Recruiting. We're hiring for a Marketing Coordinator contract role with one of our clients, Acme Corp.

Role: Marketing Coordinator (Contract)
Client: Acme Corp
Duration: 6 months (possible extension)
Rate: $35/hr
Location: Hybrid - 2 days onsite in Chicago, IL

Requirements:
- 2+ years marketing experience
- Proficiency in HubSpot and Google Analytics
- Bachelor's degree in Marketing or related field

If you're interested, please reply with your updated resume and availability for a phone screen this week.

Best,
David Chen
Talent Partners Recruiting
david.chen@talentpartners-recruiting.com
(312) 555-0147`;

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
        <p className="panel-subtitle">
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
