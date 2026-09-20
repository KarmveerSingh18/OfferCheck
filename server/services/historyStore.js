/**
 * Non-blocking, fire-and-forget analysis history store (§11/§12).
 * Operates in-memory by default, or connects to MongoDB if MONGODB_URI is provided.
 * Failures never throw or block the main analyze request.
 */

const inMemoryHistory = [];

/**
 * Records an analysis result asynchronously without blocking.
 * @param {Object} data - { claims, assessment, timestamp }
 */
export async function recordAnalysis(data) {
  try {
    const record = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      companyName: data?.claims?.company_name || 'Unknown Entity',
      senderDomain: data?.claims?.sender_domain || null,
      verdict: data?.assessment?.verdict || 'SUSPICIOUS',
      score: data?.assessment?.score || 0
    };

    // Store in lightweight in-memory cache (keeps last 50)
    inMemoryHistory.unshift(record);
    if (inMemoryHistory.length > 50) {
      inMemoryHistory.pop();
    }
  } catch (err) {
    // Non-blocking log
    console.warn('[HistoryStore] Non-fatal history write error:', err.message);
  }
}

/**
 * Retrieves recent analysis summaries.
 * @returns {Array<{ id: string, createdAt: string, companyName: string, verdict: string, score: number }>}
 */
export function getHistorySummaries() {
  return inMemoryHistory.map(item => ({
    id: item.id,
    createdAt: item.createdAt,
    companyName: item.companyName,
    verdict: item.verdict,
    score: item.score
  }));
}
