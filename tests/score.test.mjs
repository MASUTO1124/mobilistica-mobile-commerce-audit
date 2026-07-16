// tests/score.test.mjs
// scoring/mobile_commerce_score.mjs — 欠損軸の分母除外・グレード境界値。

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeMobileCommerceScore, computeCwvCategoryScore, ratingToScore, WEIGHTS } from '../src/mobilistica_audit/scoring/mobile_commerce_score.mjs';

describe('computeMobileCommerceScore — 全軸データあり', () => {
  test('全軸100なら100点・グレードA', () => {
    const result = computeMobileCommerceScore({ cwv: 100, performance: 100, commerce_ux: 100, mobile_ux: 100, technical_seo: 100 });
    assert.equal(result.score, 100);
    assert.equal(result.grade, 'A');
    assert.deepEqual(result.missing, []);
  });

  test('重み付き平均が正しく計算される', () => {
    // cwv40, performance20, commerce_ux20, mobile_ux10, technical_seo10 = 100
    const result = computeMobileCommerceScore({ cwv: 50, performance: 100, commerce_ux: 100, mobile_ux: 100, technical_seo: 100 });
    // (50*40 + 100*20 + 100*20 + 100*10 + 100*10) / 100 = (2000+2000+2000+1000+1000)/100 = 80
    assert.equal(result.score, 80);
  });
});

describe('computeMobileCommerceScore — 欠損軸は分母から除外', () => {
  test('cwv欠損時は残り60%分で再正規化される', () => {
    // performance100, commerce_ux100, mobile_ux100, technical_seo100, cwv欠損
    const result = computeMobileCommerceScore({ cwv: null, performance: 100, commerce_ux: 100, mobile_ux: 100, technical_seo: 100 });
    assert.equal(result.score, 100);
    assert.deepEqual(result.missing, ['cwv']);
  });

  test('一部軸のみ欠損した場合の加重平均', () => {
    // performance欠損、cwv=50 (weight40), commerce_ux=100(20), mobile_ux=0(10), technical_seo=100(10)
    // totalWeight = 40+20+10+10 = 80
    // weightedSum = 50*40 + 100*20 + 0*10 + 100*10 = 2000+2000+0+1000 = 5000
    // score = 5000/80 = 62.5
    const result = computeMobileCommerceScore({ cwv: 50, performance: null, commerce_ux: 100, mobile_ux: 0, technical_seo: 100 });
    assert.equal(result.score, 62.5);
    assert.deepEqual(result.missing, ['performance']);
  });

  test('全軸欠損はscore:null', () => {
    const result = computeMobileCommerceScore({ cwv: null, performance: null, commerce_ux: null, mobile_ux: null, technical_seo: null });
    assert.equal(result.score, null);
    assert.equal(result.grade, null);
    assert.equal(result.missing.length, 5);
  });

  test('未指定引数（空オブジェクト）でも例外を投げない', () => {
    const result = computeMobileCommerceScore();
    assert.equal(result.score, null);
  });
});

describe('computeMobileCommerceScore — グレード境界値', () => {
  const cases = [
    [90, 'A'],
    [89.99, 'B'],
    [75, 'B'],
    [74.99, 'C'],
    [60, 'C'],
    [59.99, 'D'],
    [40, 'D'],
    [39.99, 'E'],
    [0, 'E'],
  ];
  for (const [score, expectedGrade] of cases) {
    test(`score=${score} -> grade ${expectedGrade}`, () => {
      const result = computeMobileCommerceScore({ cwv: score, performance: score, commerce_ux: score, mobile_ux: score, technical_seo: score });
      assert.equal(result.grade, expectedGrade);
    });
  }
});

describe('ratingToScore / computeCwvCategoryScore', () => {
  test('good=100, needs-improvement=60, poor=20', () => {
    assert.equal(ratingToScore('good'), 100);
    assert.equal(ratingToScore('needs-improvement'), 60);
    assert.equal(ratingToScore('poor'), 20);
    assert.equal(ratingToScore('unknown'), null);
  });

  test('computeCwvCategoryScoreは利用可能なratingのみ平均する', () => {
    const cwv = {
      lcp_ms: { value: 5000, rating: 'poor' },
      cls: { value: 0.05, rating: 'good' },
      inp_ms: { value: null, rating: null },
    };
    // (20 + 100) / 2 = 60 （ratingが無いinpは除外）
    assert.equal(computeCwvCategoryScore(cwv), 60);
  });

  test('全metric rating nullならnull', () => {
    const cwv = { lcp_ms: { value: null, rating: null } };
    assert.equal(computeCwvCategoryScore(cwv), null);
  });

  test('null/undefined入力でも例外を投げない', () => {
    assert.equal(computeCwvCategoryScore(null), null);
    assert.equal(computeCwvCategoryScore(undefined), null);
  });
});

describe('WEIGHTS の整合性', () => {
  test('重み合計は100', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    assert.equal(total, 100);
  });
});
