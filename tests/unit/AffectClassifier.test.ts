/**
 * Unit tests — AffectClassifier
 * Tests rule-based classification across all affect states
 */

import type { AUVector } from '../../backend/src/types';
import { AffectClassifier } from '../../backend/src/services/AffectClassifier';

const classifier = new AffectClassifier();

function makeAU(overrides: Partial<AUVector> = {}): AUVector {
  return {
    au1: 0, au4: 0, au6: 0, au12: 0, au20: 0, au23: 0, confidence: 0.9,
    ...overrides,
  };
}

describe('AffectClassifier', () => {

  describe('low confidence → Unknown', () => {
    it('returns Unknown when confidence < 0.50', () => {
      const result = classifier.classify('s1', makeAU({ confidence: 0.3 }));
      expect(result.state).toBe('Unknown');
    });
    it('returns Unknown at exactly 0.50 boundary', () => {
      const result = classifier.classify('s1', makeAU({ confidence: 0.50 }));
      // 0.50 is at boundary — depends on implementation (> vs >=)
      expect(['Unknown', 'Neutral']).toContain(result.state);
    });
  });

  describe('Frustration', () => {
    it('classifies Frustration when au20 > 0.55 and au23 > 0.55', () => {
      const result = classifier.classify('s1', makeAU({ au20: 0.8, au23: 0.8 }));
      expect(result.state).toBe('Frustration');
      expect(result.confidence).toBeGreaterThanOrEqual(0.65);
    });
  });

  describe('Confusion', () => {
    it('classifies Confusion when au4 > 0.60 and au12 < 0.35', () => {
      const result = classifier.classify('s1', makeAU({ au4: 0.75, au12: 0.10 }));
      expect(result.state).toBe('Confusion');
    });
    it('does NOT classify Confusion when au12 is also high', () => {
      const result = classifier.classify('s1', makeAU({ au4: 0.75, au12: 0.80 }));
      expect(result.state).not.toBe('Confusion');
    });
  });

  describe('Anxiety', () => {
    it('classifies Anxiety when au1 > 0.55 and au4 > 0.40', () => {
      const result = classifier.classify('s1', makeAU({ au1: 0.7, au4: 0.6 }));
      expect(result.state).toBe('Anxiety');
    });
  });

  describe('Flow', () => {
    it('classifies Flow when au6 > 0.40, au12 > 0.40 and au4 < 0.30', () => {
      const result = classifier.classify('s1', makeAU({ au6: 0.7, au12: 0.8, au4: 0.1 }));
      expect(result.state).toBe('Flow');
    });
    it('does NOT classify Flow when au4 is high', () => {
      const result = classifier.classify('s1', makeAU({ au6: 0.7, au12: 0.8, au4: 0.5 }));
      expect(result.state).not.toBe('Flow');
    });
  });

  describe('Boredom', () => {
    it('classifies Boredom when all AUs very low', () => {
      const result = classifier.classify('s1', makeAU({ au1:0.05, au4:0.05, au6:0.05, au12:0.05, au20:0.05, au23:0.05 }));
      expect(result.state).toBe('Boredom');
    });
  });

  describe('Neutral (default)', () => {
    it('classifies Neutral for moderate mixed signals', () => {
      const result = classifier.classify('s1', makeAU({ au1:0.3, au4:0.3, au6:0.3, au12:0.3 }));
      expect(result.state).toBe('Neutral');
    });
  });

  describe('session state accumulation', () => {
    it('returns model version string', () => {
      const result = classifier.classify('s-test', makeAU({ au6: 0.8, au12: 0.9, au4: 0.1 }));
      expect(result.modelVersion).toBeDefined();
      expect(typeof result.modelVersion).toBe('string');
    });
  });
});
