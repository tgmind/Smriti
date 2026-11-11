import { describe, it, expect } from 'vitest';
import { calculateNextReview, evaluateCompletedPlay, formatDuration } from '../learningEngine';

describe('Learning & Memory Reinforcement Engine', () => {
  describe('Spaced Repetition Algorithm (SuperMemo SM-2 adaptation)', () => {
    it('schedules initial repetition correctly on Good (2)', () => {
      const initial = { repetition_count: 0, interval_days: 1, ease_factor: 2.5 };
      const next = calculateNextReview(initial, 2, new Date('2026-11-11T00:00:00Z'));

      expect(next.repetition_count).toBe(1);
      expect(next.interval_days).toBe(1);
      expect(next.status).toBe('learning');
      expect(next.next_review_due).toBe('2026-11-12');
    });

    it('gives bonus interval progression for Easy (3)', () => {
      const initial = { repetition_count: 0, interval_days: 1, ease_factor: 2.5 };
      const next = calculateNextReview(initial, 3, new Date('2026-11-11T00:00:00Z'));

      expect(next.repetition_count).toBe(1);
      expect(next.interval_days).toBe(2);
      expect(next.status).toBe('learning');
      expect(next.next_review_due).toBe('2026-11-13');
    });

    it('expands interval geometrically on repeated successful recalls', () => {
      const stage1 = { repetition_count: 2, interval_days: 3, ease_factor: 2.5 };
      const stage2 = calculateNextReview(stage1, 2, new Date('2026-11-11T00:00:00Z'));

      expect(stage2.repetition_count).toBe(3);
      // 3 * 2.5 = 7.5 rounded to 8
      expect(stage2.interval_days).toBe(8);
      expect(stage2.status).toBe('review');
    });

    it('resets repetition count to 0 and interval to 1 on failure (Again - 0)', () => {
      const matureItem = { repetition_count: 5, interval_days: 28, ease_factor: 2.4 };
      const failed = calculateNextReview(matureItem, 0, new Date('2026-11-11T00:00:00Z'));

      expect(failed.repetition_count).toBe(0);
      expect(failed.interval_days).toBe(1);
      expect(failed.status).toBe('learning');
      expect(failed.next_review_due).toBe('2026-11-12');
    });

    it('respects minimum Ease Factor floor of 1.30', () => {
      const lowEaseItem = { repetition_count: 0, interval_days: 1, ease_factor: 1.32 };
      const updated = calculateNextReview(lowEaseItem, 0, new Date('2026-11-11T00:00:00Z'));

      expect(updated.ease_factor).toBeGreaterThanOrEqual(1.30);
    });

    it('promotes items to mastered when interval reaches >=21 days', () => {
      const item = { repetition_count: 3, interval_days: 12, ease_factor: 2.5 };
      const next = calculateNextReview(item, 3, new Date('2026-11-11T00:00:00Z'));

      expect(next.interval_days).toBeGreaterThanOrEqual(21);
      expect(next.status).toBe('mastered');
    });
  });

  describe('Completed-Play Policy & Anti-Inflation Rules', () => {
    it('rejects accidental click-throughs under 15 seconds', () => {
      const res = evaluateCompletedPlay(10, 300);
      expect(res.isCompleted).toBe(false);
      expect(res.reason).toContain('under the 15-second minimum threshold');
    });

    it('qualifies valid listening session when >=75% listened', () => {
      const res = evaluateCompletedPlay(240, 300); // 80%
      expect(res.isCompleted).toBe(true);
      expect(res.completionPercentage).toBe(80);
    });

    it('deducts abnormal forward seeking jumps', () => {
      // User scrubbed ahead by 150 seconds, listened only 100 seconds
      const res = evaluateCompletedPlay(250, 300, 150);
      expect(res.isCompleted).toBe(false);
      expect(res.completionPercentage).toBeLessThan(75);
    });
  });

  describe('Duration Formatting', () => {
    it('formats seconds into mm:ss and hh:mm:ss properly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(45)).toBe('0:45');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(3665)).toBe('1:01:05');
    });
  });
});
