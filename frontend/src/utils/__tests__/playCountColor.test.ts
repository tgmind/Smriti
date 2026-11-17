import { describe, it, expect } from 'vitest';
import { getPlayCountTheme, formatPlayCountBadge } from '../playCountColor';

describe('Four-Tier Play Count Color & Mastery Specification', () => {
  it('correctly categorizes Tier 1: Less than 20 (< 20) as Red "Not Still Learned"', () => {
    const counts = [0, 1, 10, 19];
    for (const c of counts) {
      const theme = getPlayCountTheme(c);
      expect(theme.tier).toBe(1);
      expect(theme.colorName).toBe('red');
      expect(theme.hex).toBe('#DC2626');
      expect(theme.textColor).toBe('text-red-600');
      expect(theme.bgColor).toBe('bg-red-50');
      expect(theme.borderColor).toBe('border-red-200');
      expect(theme.label).toBe('Not Still Learned');
    }
  });

  it('correctly categorizes Tier 2: Between 20 and 49 (20..49) as Orange "Building Memory"', () => {
    const counts = [20, 21, 35, 49];
    for (const c of counts) {
      const theme = getPlayCountTheme(c);
      expect(theme.tier).toBe(2);
      expect(theme.colorName).toBe('orange');
      expect(theme.hex).toBe('#EA580C');
      expect(theme.textColor).toBe('text-orange-600');
      expect(theme.bgColor).toBe('bg-orange-50');
      expect(theme.borderColor).toBe('border-orange-200');
      expect(theme.label).toBe('Building Memory');
    }
  });

  it('correctly categorizes Tier 3: Between 50 and 70 (50..70) as Yellow "In Memory"', () => {
    const counts = [50, 51, 60, 70];
    for (const c of counts) {
      const theme = getPlayCountTheme(c);
      expect(theme.tier).toBe(3);
      expect(theme.colorName).toBe('yellow');
      expect(theme.hex).toBe('#CA8A04');
      expect(theme.textColor).toBe('text-yellow-600');
      expect(theme.bgColor).toBe('bg-yellow-50');
      expect(theme.borderColor).toBe('border-yellow-300');
      expect(theme.label).toBe('In Memory');
    }
  });

  it('correctly categorizes Tier 4: Above 70 (> 70) as Dark Green "Learned by Heart"', () => {
    const counts = [71, 72, 100, 250];
    for (const c of counts) {
      const theme = getPlayCountTheme(c);
      expect(theme.tier).toBe(4);
      expect(theme.colorName).toBe('green');
      expect(theme.hex).toBe('#166534');
      expect(theme.textColor).toBe('text-green-800');
      expect(theme.bgColor).toBe('bg-green-50');
      expect(theme.borderColor).toBe('border-green-300');
      expect(theme.label).toBe('Learned by Heart');
      expect(theme.progressPercent).toBe(100);
    }
  });

  it('handles negative, non-finite, and null/undefined values safely as 0', () => {
    expect(getPlayCountTheme(-5).tier).toBe(1);
    expect(getPlayCountTheme(NaN).tier).toBe(1);
    expect(getPlayCountTheme(undefined as any).tier).toBe(1);
  });

  it('formats play count badge with symbol', () => {
    expect(formatPlayCountBadge(0)).toBe('0×');
    expect(formatPlayCountBadge(14)).toBe('14×');
    expect(formatPlayCountBadge(75)).toBe('75×');
  });
});
