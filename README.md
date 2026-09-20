# OfferCheck — Automated Job & Internship Offer Verification

**Built for BUILD//ANYTHING 2026** — a 10-hour hackathon.

🔗 **Live demo:** [add your deployed link here once live]

## The Problem

Fake internship and job offer scams are a growing, current problem — not a hypothetical one. Institutions like IIT Roorkee have had to publicly warn students against fraudulent offers impersonating their name, and individual victims have lost significant sums (one reported case: a student lost HK$190,000 to a fake internship scam) to offers that looked convincing enough to act on.

The response today is entirely reactive: institutional warnings after the fact, scattered "is this legit?" threads on Reddit or Quora, and generic spam filters that only catch known malicious links — nothing catches a well-written scam email with no malware attached, just a request for an upfront "processing fee."

**OfferCheck lets anyone paste a suspicious offer and get an evidence-backed verdict in seconds**, instead of guessing.

## Why This Isn't Just Another AI Wrapper

Most "AI scam detectors" ask a language model "does this look like a scam?" and return a confidence score — a black box that can't explain itself and isn't reproducible between runs.

OfferCheck does the opposite: **the LLM is only used to extract structured claims from the text. Every verification and scoring decision after that is deterministic, evidence-based, and independently reproducible.** The system checks whether the sender's domain is registered, how old it is, whether it matches the claimed company, and whether the company has a real public hiring presence — then combines those *independent, verifiable* signals into a score using transparent rules, not another AI guess.

This also means it doesn't get fooled the way a naive keyword filter would. A blunt "does the domain match the company name" check would incorrectly flag a legitimate third-party recruiter (a real, common hiring pattern) as a scam. OfferCheck recognizes that pattern and treats it as neutral evidence — not proof of fraud — while a genuine payment request or a non-existent domain overrides everything else and forces a cautious verdict, no matter how convincing the rest of the offer looks.

## Tech Stack

- **Frontend:** React (Vite), plain CSS — no UI framework or design library
- **Backend:** Node.js, Express
- **Extraction:** Google Gemini (structured JSON output), with a regex-based fallback if no API key is configured
- **Domain verification:** RDAP (live domain registry lookups)
- **Web presence check:** Brave Search API (optional, mitigating signal only)
- No database required — the core pipeline is fully stateless

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

### Key Design Principles

- **Separation of Extraction and Verification**: The LLM is used strictly for structured data extraction, gated by a verbatim substring validator. Keeping extraction and verification as separate stages ensures a hallucinated or misread claim cannot silently corrupt the verification signals.
- **Deterministic, LLM-Free Scoring**: Risk scoring is calculated via transparent additive rules rather than LLM judgment. This ensures verdicts are reproducible, predictable, and auditable across runs rather than relying on a variable black-box AI opinion.
- **Hard Safety Overrides**: Non-negotiable floor verdicts are enforced for critical red flags (such as upfront payment requests or non-existent domains). This ensures a well-produced scam with convincing mitigating signals — like an aged domain or active web presence — cannot dilute its risk score or talk its way to a clean verdict.

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

The app includes one-click "Try a sample" buttons for all three cases below.

1. **Clear Scam**: Offer demanding an upfront refundable equipment fee from a free public email (`@gmail.com`). Triggers the hard payment override regardless of any mitigating evidence — result: `LIKELY_SCAM`.
2. **Legitimate Offer**: Formal offer from an established enterprise (`microsoft.com`) with a matching domain, long registration history, and zero fee requirements — result: `LIKELY_LEGIT`.
3. **Borderline Recruiter**: A staffing agency (`talent-partners.com`) recruiting on behalf of a third-party company. This is the case that shows the system's actual judgment — a naive domain-match filter would flag this as suspicious simply because the sender's domain doesn't match the company being hired for. OfferCheck recognizes the third-party-recruiter pattern instead, correctly avoiding a false-positive scam classification.

## Scope & Limitations

OfferCheck is a **signal-based screening tool, not a guarantee**. It's designed to catch the most common, high-confidence fraud patterns — upfront payment requests, non-existent or brand-new domains, and free-email-provider impersonation of established companies — using independently verifiable, public evidence.

It won't catch every scam. A sophisticated attacker using a compromised legitimate domain, or a scam with no payment request and no domain red flags, could still pass evidence-based checks. Every result is shown with the underlying evidence so the user can make their own final judgment — the tool surfaces evidence, it doesn't replace human review for a decision this consequential.
