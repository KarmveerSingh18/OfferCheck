import { extractClaims } from './services/extractor.js';
import { validateExtraction } from './services/extractionValidator.js';
import { checkDomainConsistency } from './services/domainConsistency.js';
import { lookupRdap } from './services/rdap.js';
import { searchCompanyCareers } from './services/webSearch.js';
import { aggregateEvidence } from './services/evidenceAggregator.js';
import { calculateRisk } from './services/riskEngine.js';

const CASE_1_SCAM = `
From: Google Recruitment Team <google.careers.hr@gmail.com>
Subject: Urgent Job Offer - Remote Software Intern

Congratulations! Google LLC is pleased to offer you the position of Remote Software Engineer Intern.
Your starting compensation is $65/hr.

To finalize your onboarding and dispatch your company laptop, you are required to submit a refundable equipment insurance fee of $250 via wire transfer or gift card within 24 hours or this offer will be revoked immediately.

Contact: google.careers.hr@gmail.com
Google LLC
`;

const CASE_2_LEGIT = `
From: Microsoft University Recruiting <internships@microsoft.com>
Subject: Offer of Employment - Software Engineer Intern

Dear Candidate,
Microsoft Corporation is pleased to extend an offer for the Software Engineer Intern role in Redmond, WA.
Please review your formal offer letter attached and accept through the Microsoft Careers portal at microsoft.com.
There are no fees associated with this application or onboarding process.

Best regards,
University Talent Team
Microsoft Corporation
internships@microsoft.com
`;

const CASE_3_BORDERLINE = `
From: Sarah Jenkins <s.jenkins@talent-partners.com>
Subject: Opportunity with Acme Technologies

Hi there,
I am a senior recruiter at Talent Partners Staffing. We are currently recruiting on behalf of Acme Technologies for a Backend Developer role.
Please let me know if you would like to review the job description. No upfront payment or fees are ever required.

Best,
Sarah Jenkins
Talent Partners Staffing
s.jenkins@talent-partners.com
`;

async function runPipeline(name, text) {
  console.log(`\n========================================`);
  console.log(`TEST: ${name}`);
  console.log(`========================================`);

  const rawClaims = await extractClaims(text);
  console.log('1. Raw Claims:', rawClaims);

  const { validatedClaims, unverifiedFields } = validateExtraction(rawClaims, text);
  console.log('2. Validated Claims:', validatedClaims);
  console.log('   Unverified Fields:', unverifiedFields);

  const [consistencyResult, rdapResult, searchResult] = await Promise.all([
    checkDomainConsistency(
      validatedClaims.company_name,
      validatedClaims.sender_domain,
      validatedClaims.sender_email
    ),
    lookupRdap(validatedClaims.sender_domain),
    searchCompanyCareers(
      validatedClaims.company_name,
      validatedClaims.sender_domain
    )
  ]);

  console.log('3. Signals:');
  console.log('   - Consistency:', consistencyResult);
  console.log('   - RDAP:', rdapResult);
  console.log('   - Search:', searchResult);

  const evidence = aggregateEvidence(
    validatedClaims,
    unverifiedFields,
    consistencyResult,
    rdapResult,
    searchResult
  );
  console.log(`4. Evidence Items (${evidence.length}):`, evidence.map(e => `[${e.severity.toUpperCase()}] ${e.source}: ${e.finding}`));

  const assessment = calculateRisk(
    validatedClaims,
    consistencyResult,
    rdapResult,
    searchResult
  );
  console.log('5. Assessment:', assessment);

  return { name, claims: validatedClaims, assessment, evidence };
}

async function main() {
  const res1 = await runPipeline('Case 1: Clear Scam', CASE_1_SCAM);
  const res2 = await runPipeline('Case 2: Legit Offer', CASE_2_LEGIT);
  const res3 = await runPipeline('Case 3: Borderline Recruiter', CASE_3_BORDERLINE);

  console.log('\n================ SUMMARY ================');
  console.log(`Case 1: Expected LIKELY_SCAM -> Result: ${res1.assessment.verdict} (Score: ${res1.assessment.score})`);
  console.log(`Case 2: Expected LIKELY_LEGIT -> Result: ${res2.assessment.verdict} (Score: ${res2.assessment.score})`);
  console.log(`Case 3: Expected SUSPICIOUS / Moderate -> Result: ${res3.assessment.verdict} (Score: ${res3.assessment.score})`);

  let allPassed = true;
  if (res1.assessment.verdict !== 'LIKELY_SCAM') {
    console.error('FAIL: Case 1 did not produce LIKELY_SCAM');
    allPassed = false;
  }
  if (res2.assessment.verdict !== 'LIKELY_LEGIT') {
    console.error('FAIL: Case 2 did not produce LIKELY_LEGIT');
    allPassed = false;
  }
  if (res3.assessment.verdict === 'LIKELY_SCAM') {
    console.error('FAIL: Case 3 should not be marked as a confident scam purely on third-party recruiter');
    allPassed = false;
  }

  if (allPassed) {
    console.log('\n>>> ALL 3 DEMO TEST CASES PASSED SPEC CRITERIA! <<<');
  }
}

main().catch(console.error);
