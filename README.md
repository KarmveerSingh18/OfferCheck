# OfferCheck — Automated Job & Internship Offer Verification

OfferCheck is a security-focused verification engine designed to detect fraudulent job offers, recruitment scams, and impersonation attempts. It combines structured LLM extraction with an anti-hallucination validation gate, live RDAP domain registry lookups, entity-domain consistency analysis, and a deterministic risk scoring engine. Verification and risk scoring are strictly separated from LLM generation, ensuring reproducible, explainable, and audit-grade risk verdicts.

## Architecture

```
User Input (Offer Text)
  │
  ▼
1. Claim Extractor (LLM structured output)
  │
  ▼
2. Extraction Validator (Verbatim substring anti-hallucination gate)
  │ (Only verified fields proceed)
  ├───────────────────┬───────────────────┐
  ▼                   ▼                   ▼
3A. Consistency     3B. RDAP Lookup     3C. Web Search
  (Deterministic)     (Live Registry)     (Mitigating Only)
  └───────────────────┼───────────────────┘
                      ▼
4. Evidence Aggregator (Normalizes signals into 3–5 structured findings)
                      │
                      ▼
5. Deterministic Risk Engine (Additive scoring + hard safety overrides)
                      │
                      ▼
6. Assessment & Structured Results View (Verdict, score, evidence cards)
```

## Running the Application

### 1. Backend Server
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:3001`.

### 2. Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
Client runs on `http://localhost:5173`.

## Environment Configuration

Create a `.env` file in `server/` (see `server/.env.example`):
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here    # (Optional: fallback regex extractor active if omitted)
BRAVE_SEARCH_API_KEY=your_brave_api_key     # (Optional: corporate web presence check)
```

## Demo Scenarios

1. **Clear Scam (Case 1)**: Offer demanding upfront refundable equipment fee from a free public email (`@gmail.com`). Triggering hard payment override and high risk score (`LIKELY_SCAM`).
2. **Legitimate Offer (Case 2)**: Formal offer from an established enterprise (`microsoft.com`) with matching domain registration history and zero fee requirements (`LIKELY_LEGIT`).
3. **Borderline Recruiter (Case 3)**: Staffing agency domain (`talent-partners.com`) recruiting for a third-party company (`THIRD_PARTY_POSSIBLE` detected, preventing false-positive scam classification).
