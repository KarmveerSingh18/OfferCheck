const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Sends offer text to OfferCheck verification engine.
 * @param {string} offerText
 * @returns {Promise<{claims: Object, evidence: Array, assessment: Object}>}
 */
export async function analyzeOffer(offerText) {
  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ offerText })
  });

  if (!response.ok) {
    let errMessage = 'Failed to analyze offer.';
    try {
      const errData = await response.json();
      if (errData?.error) errMessage = errData.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMessage);
  }

  return response.json();
}
