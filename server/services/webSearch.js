/**
 * Provider-agnostic corporate web presence verification service (§6C).
 * Mitigating only — never risk-adding.
 *
 * @param {string|null} companyName - Verified company name
 * @param {string|null} senderDomain - Verified sender domain
 * @returns {Promise<{
 *   found: boolean | 'UNKNOWN',
 *   topResultDomain: string | null,
 *   matchesSenderDomain: boolean,
 *   snippet: string | null
 * }>}
 */
export async function searchCompanyCareers(companyName, senderDomain) {
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    return {
      found: 'UNKNOWN',
      topResultDomain: null,
      matchesSenderDomain: false,
      snippet: null
    };
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY || process.env.SEARCH_API_KEY;
  if (!apiKey) {
    // Graceful fallback when no search API key is configured
    return {
      found: 'UNKNOWN',
      topResultDomain: null,
      matchesSenderDomain: false,
      snippet: null
    };
  }

  const query = `${companyName.trim()} official website careers`;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[WebSearch] Search API returned status ${res.status}`);
      return {
        found: 'UNKNOWN',
        topResultDomain: null,
        matchesSenderDomain: false,
        snippet: null
      };
    }

    const data = await res.json();
    const results = data?.web?.results;

    if (!Array.isArray(results) || results.length === 0) {
      return {
        found: false,
        topResultDomain: null,
        matchesSenderDomain: false,
        snippet: null
      };
    }

    // Inspect top results
    const topResult = results[0];
    let topResultDomain = null;
    if (topResult?.url) {
      try {
        const parsedUrl = new URL(topResult.url);
        topResultDomain = parsedUrl.hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        // ignore
      }
    }

    let matchesSenderDomain = false;
    if (topResultDomain && senderDomain) {
      const cleanSender = senderDomain.toLowerCase().replace(/^www\./, '');
      matchesSenderDomain = (
        topResultDomain === cleanSender ||
        topResultDomain.endsWith(`.${cleanSender}`) ||
        cleanSender.endsWith(`.${topResultDomain}`)
      );
    }

    return {
      found: true,
      topResultDomain,
      matchesSenderDomain,
      snippet: topResult?.description || null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[WebSearch] Error during search request:', err.message);
    return {
      found: 'UNKNOWN',
      topResultDomain: null,
      matchesSenderDomain: false,
      snippet: null
    };
  }
}
