// tests/priority.test.mjs
// scoring/priority.mjs の境界値テスト（docs/specs/core-engine-spec.md「優先度導出」の式固定）。

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { derivePriority, deriveEstimatedEffort, computeImpact } from '../src/mobilistica_audit/scoring/priority.mjs';

function scores({ sales_impact = 0, cwv_impact = 0, mobile_ux_impact = 0, seo_impact = 0, certainty = 3 } = {}) {
  return { sales_impact, cwv_impact, mobile_ux_impact, seo_impact, certainty, difficulty: 0, cost: 0 };
}

describe('derivePriority — impact境界値 (impact = sales*2 + cwv*1.5 + mobile_ux + seo)', () => {
  test('impact=14 ちょうど -> P1', () => {
    const s = scores({ sales_impact: 4, cwv_impact: 2, mobile_ux_impact: 3, seo_impact: 0 });
    assert.equal(computeImpact(s), 14);
    assert.equal(derivePriority(s), 'P1');
  });

  test('impact=13.99 (14未満) -> P2', () => {
    const s = scores({ sales_impact: 3.99, cwv_impact: 2, mobile_ux_impact: 3, seo_impact: 0 });
    assert.ok(computeImpact(s) < 14);
    assert.equal(derivePriority(s), 'P2');
  });

  test('impact=9 ちょうど -> P2', () => {
    const s = scores({ sales_impact: 3, cwv_impact: 2, mobile_ux_impact: 0, seo_impact: 0 });
    assert.equal(computeImpact(s), 9);
    assert.equal(derivePriority(s), 'P2');
  });

  test('impact=8.99 (9未満) -> P3', () => {
    const s = scores({ sales_impact: 2.99, cwv_impact: 2, mobile_ux_impact: 0, seo_impact: 0 });
    assert.ok(computeImpact(s) < 9);
    assert.equal(derivePriority(s), 'P3');
  });

  test('impact=4.5 ちょうど -> P3', () => {
    const s = scores({ sales_impact: 0, cwv_impact: 3, mobile_ux_impact: 0, seo_impact: 0 });
    assert.equal(computeImpact(s), 4.5);
    assert.equal(derivePriority(s), 'P3');
  });

  test('impact=4.49 (4.5未満) -> P4', () => {
    const s = scores({ sales_impact: 0, cwv_impact: 2.99, mobile_ux_impact: 0, seo_impact: 0 });
    assert.ok(computeImpact(s) < 4.5);
    assert.equal(derivePriority(s), 'P4');
  });

  test('impact=0 -> P4', () => {
    const s = scores();
    assert.equal(computeImpact(s), 0);
    assert.equal(derivePriority(s), 'P4');
  });
});

describe('derivePriority — p0オーバーライド', () => {
  test('p0:true は常にP0（impactやcertaintyに関係なく）', () => {
    const s = scores({ sales_impact: 0, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 0, certainty: 0 });
    assert.equal(derivePriority(s, { p0: true }), 'P0');
  });
});

describe('derivePriority — certainty<=1 の1段階降格', () => {
  test('certainty=1 は P1 -> P2 に降格', () => {
    const s = scores({ sales_impact: 4, cwv_impact: 2, mobile_ux_impact: 3, seo_impact: 0, certainty: 1 });
    assert.equal(derivePriority(s), 'P2');
  });

  test('certainty=0 も1段階のみ降格（P1 -> P2、P0には落ちない）', () => {
    const s = scores({ sales_impact: 4, cwv_impact: 2, mobile_ux_impact: 3, seo_impact: 0, certainty: 0 });
    assert.equal(derivePriority(s), 'P2');
  });

  test('certainty=2 は降格なし', () => {
    const s = scores({ sales_impact: 4, cwv_impact: 2, mobile_ux_impact: 3, seo_impact: 0, certainty: 2 });
    assert.equal(derivePriority(s), 'P1');
  });

  test('P4かつcertainty<=1でもP4のまま（下限で頭打ち）', () => {
    const s = scores({ certainty: 1 });
    assert.equal(derivePriority(s), 'P4');
  });
});

describe('deriveEstimatedEffort — difficulty+cost境界値', () => {
  test('difficulty+cost=7 -> large', () => {
    assert.equal(deriveEstimatedEffort({ difficulty: 4, cost: 3 }), 'large');
  });
  test('difficulty+cost=6 -> medium', () => {
    assert.equal(deriveEstimatedEffort({ difficulty: 3, cost: 3 }), 'medium');
  });
  test('difficulty+cost=4 -> medium', () => {
    assert.equal(deriveEstimatedEffort({ difficulty: 2, cost: 2 }), 'medium');
  });
  test('difficulty+cost=3 -> small', () => {
    assert.equal(deriveEstimatedEffort({ difficulty: 2, cost: 1 }), 'small');
  });
  test('difficulty+cost=0 -> small', () => {
    assert.equal(deriveEstimatedEffort({ difficulty: 0, cost: 0 }), 'small');
  });
});
