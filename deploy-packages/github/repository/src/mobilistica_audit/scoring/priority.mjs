// scoring/priority.mjs — pure function, browser-compatible.
// Implements the P0..P4 derivation and estimated_effort mapping exactly as
// fixed in docs/specs/core-engine-spec.md ("優先度導出"). Covered by
// tests/priority.test.mjs boundary-value tests — do not change the
// thresholds without updating both.

const ORDER = ['P0', 'P1', 'P2', 'P3', 'P4'];

/**
 * impact = sales_impact*2 + cwv_impact*1.5 + mobile_ux_impact + seo_impact (max 22.5)
 */
export function computeImpact(scores) {
  const { sales_impact = 0, cwv_impact = 0, mobile_ux_impact = 0, seo_impact = 0 } = scores || {};
  return sales_impact * 2 + cwv_impact * 1.5 + mobile_ux_impact + seo_impact;
}

/**
 * @param {object} scores 7-axis scores (0-5 each)
 * @param {{p0?:boolean}} [options] p0: hard purchase-blocking override
 * @returns {'P0'|'P1'|'P2'|'P3'|'P4'}
 */
export function derivePriority(scores, options = {}) {
  if (options.p0) return 'P0';

  const impact = computeImpact(scores);
  let priority;
  if (impact >= 14) priority = 'P1';
  else if (impact >= 9) priority = 'P2';
  else if (impact >= 4.5) priority = 'P3';
  else priority = 'P4';

  const certainty = scores && typeof scores.certainty === 'number' ? scores.certainty : 3;
  if (certainty <= 1) {
    priority = downgrade(priority);
  }

  return priority;
}

function downgrade(priority) {
  const idx = ORDER.indexOf(priority);
  if (idx === -1) return priority;
  return ORDER[Math.min(idx + 1, ORDER.length - 1)];
}

/**
 * difficulty+cost >= 7 -> large, >= 4 -> medium, else small.
 * Does not influence priority (spec: "difficulty/costはpriorityに影響させず").
 */
export function deriveEstimatedEffort(scores) {
  const difficulty = scores && typeof scores.difficulty === 'number' ? scores.difficulty : 0;
  const cost = scores && typeof scores.cost === 'number' ? scores.cost : 0;
  const sum = difficulty + cost;
  if (sum >= 7) return 'large';
  if (sum >= 4) return 'medium';
  return 'small';
}
