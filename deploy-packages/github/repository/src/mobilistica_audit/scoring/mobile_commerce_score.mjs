// scoring/mobile_commerce_score.mjs — pure function, browser-compatible.
// CWV 40% + Performance 20% + commerce_ux 20% + mobile_ux 10% + technical_seo 10%.
// Missing axes are excluded from the denominator and reported in `missing`
// so pipeline.mjs can add a summary.limitations entry.

export const WEIGHTS = Object.freeze({
  cwv: 40,
  performance: 20,
  commerce_ux: 20,
  mobile_ux: 10,
  technical_seo: 10,
});

const RATING_SCORE = { good: 100, 'needs-improvement': 60, poor: 20 };

/** Maps a CWV rating string to a 0-100 numeric proxy used for the CWV axis. */
export function ratingToScore(rating) {
  return Object.prototype.hasOwnProperty.call(RATING_SCORE, rating) ? RATING_SCORE[rating] : null;
}

/**
 * Averages available core_web_vitals metric ratings into a single 0-100
 * CWV axis score. Returns null if no metric has a rating.
 * @param {object} coreWebVitals {lcp:{rating}, inp:{rating}, cls:{rating}, ...}
 */
export function computeCwvCategoryScore(coreWebVitals) {
  if (!coreWebVitals) return null;
  const ratings = Object.values(coreWebVitals)
    .map((m) => (m && typeof m === 'object' ? ratingToScore(m.rating) : null))
    .filter((v) => v !== null);
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function gradeFor(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

/**
 * @param {{cwv:?number, performance:?number, commerce_ux:?number, mobile_ux:?number, technical_seo:?number}} categoryScores
 *   Each 0-100 or null/undefined if unavailable.
 * @returns {{score:?number, grade:?string, missing:string[]}}
 */
export function computeMobileCommerceScore(categoryScores = {}) {
  let totalWeight = 0;
  let weightedSum = 0;
  const missing = [];

  for (const [axis, weight] of Object.entries(WEIGHTS)) {
    const value = categoryScores[axis];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      missing.push(axis);
      continue;
    }
    totalWeight += weight;
    weightedSum += value * weight;
  }

  if (totalWeight === 0) {
    return { score: null, grade: null, missing };
  }

  const score = Math.round((weightedSum / totalWeight) * 100) / 100;
  return { score, grade: gradeFor(score), missing };
}
