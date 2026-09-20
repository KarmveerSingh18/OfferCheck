const FREE_PUBLIC_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'yandex.com'
]);

const COMMON_CORP_SUFFIXES = new Set([
  'inc', 'llc', 'corp', 'corporation', 'ltd', 'limited', 'co', 'company',
  'technologies', 'technology', 'tech', 'solutions', 'group', 'services',
  'global', 'consulting', 'international', 'systems', 'software', 'holdings'
]);

const RECRUITER_KEYWORDS = new Set([
  'recruit', 'recruiting', 'recruitment', 'talent', 'staffing', 'search',
  'partners', 'associates', 'careers', 'hire', 'hiring', 'headhunters', 'jobs'
]);

/**
 * Checks company and sender domain consistency deterministically (§6A).
 *
 * @param {string|null} company_name - Verified company name
 * @param {string|null} sender_domain - Verified sender domain
 * @param {string|null} sender_email - Verified sender email
 * @returns {{
 *   category: 'MATCH' | 'MISMATCH' | 'THIRD_PARTY_POSSIBLE' | 'INSUFFICIENT_DATA',
 *   freeEmailProvider: boolean,
 *   details: string
 * }}
 */
export function checkDomainConsistency(company_name, sender_domain, sender_email) {
  // Check free/public provider
  let freeEmailProvider = false;
  const emailDomain = sender_email && sender_email.includes('@')
    ? sender_email.split('@')[1].toLowerCase()
    : (sender_domain ? sender_domain.toLowerCase() : null);

  if (emailDomain && FREE_PUBLIC_EMAIL_PROVIDERS.has(emailDomain)) {
    freeEmailProvider = true;
  }

  // If missing company name or sender domain -> INSUFFICIENT_DATA
  if (!company_name || !sender_domain) {
    return {
      category: 'INSUFFICIENT_DATA',
      freeEmailProvider,
      details: 'Insufficient verified domain or company entity data in offer text.'
    };
  }

  const cleanDomain = sender_domain.toLowerCase().trim().replace(/^www\./, '');
  // Extract domain base (e.g. "acme" from "acme.com" or "careers-acme.co.uk")
  const domainParts = cleanDomain.split('.');
  const registrableBase = domainParts.length > 2 ? domainParts[domainParts.length - 2] : domainParts[0];

  // Tokenize company name
  const rawCompanyTokens = company_name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !COMMON_CORP_SUFFIXES.has(t));

  const domainTokens = cleanDomain
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !COMMON_CORP_SUFFIXES.has(t));

  // If sender used a free provider for official company communications, it's an immediate mismatch
  if (freeEmailProvider) {
    return {
      category: 'MISMATCH',
      freeEmailProvider: true,
      details: `Sender is using a free public email provider (${emailDomain}) claiming to represent ${company_name}.`
    };
  }

  // Check for direct match / token overlap
  const hasOverlap = rawCompanyTokens.some(compTok => 
    registrableBase.includes(compTok) || domainTokens.some(domTok => domTok.includes(compTok) || compTok.includes(domTok))
  );

  if (hasOverlap) {
    return {
      category: 'MATCH',
      freeEmailProvider: false,
      details: `Sender domain "${sender_domain}" aligns directly with company name "${company_name}".`
    };
  }

  // Check if domain suggests a legitimate 3rd-party recruiter / staffing agency
  const hasRecruiterKeyword = domainTokens.some(tok => RECRUITER_KEYWORDS.has(tok));
  if (hasRecruiterKeyword) {
    return {
      category: 'THIRD_PARTY_POSSIBLE',
      freeEmailProvider: false,
      details: `Sender domain "${sender_domain}" does not match "${company_name}", but reflects a potential third-party recruiting or staffing entity.`
    };
  }

  // Otherwise, it's a domain/company mismatch
  return {
    category: 'MISMATCH',
    freeEmailProvider: false,
    details: `Sender domain "${sender_domain}" does not correspond to claimed organization "${company_name}".`
  };
}
