import { describe, it, expect } from 'vitest';
import {
  sanitizeAudioTitle,
  generateWaveformPeaks,
  formatFileSize,
  getAudioFileDuration
} from '../audioUtils';

describe('audioUtils', () => {
  describe('sanitizeAudioTitle', () => {
    it('strips extension and cleans underscores and hyphens into clean titles', () => {
      expect(sanitizeAudioTitle('Physics_Lecture_04-Optics.mp3')).toBe('Physics Lecture 04 Optics');
      expect(sanitizeAudioTitle('thermodynamics_chapter_1.m4a')).toBe('thermodynamics chapter 1');
      expect(sanitizeAudioTitle('Organic-Chemistry---Part.1.wav')).toBe('Organic Chemistry Part 1');
    });

    it('handles empty or extension-only input gracefully', () => {
      expect(sanitizeAudioTitle('')).toBe('Audio Note');
      expect(sanitizeAudioTitle('.mp3')).toBe('Audio Note');
    });
  });

  describe('generateWaveformPeaks', () => {
    it('generates the specified count of peaks within 15-95 range', () => {
      const peaks = generateWaveformPeaks(32);
      expect(peaks).toHaveLength(32);
      peaks.forEach(peak => {
        expect(peak).toBeGreaterThanOrEqual(15);
        expect(peak).toBeLessThanOrEqual(95);
      });
    });
  });

  describe('formatFileSize', () => {
    it('formats megabytes and kilobytes accurately', () => {
      expect(formatFileSize(4.2 * 1024 * 1024)).toBe('4.20 MB');
      expect(formatFileSize(15.5 * 1024 * 1024)).toBe('15.5 MB');
      expect(formatFileSize(850 * 1024)).toBe('850 KB');
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('getAudioFileDuration', () => {
    it('returns a fallback duration when Audio API is unavailable or mocked', async () => {
      const mockBlob = new Blob(['fake audio content'], { type: 'audio/mp3' });
      const duration = await getAudioFileDuration(mockBlob);
      expect(duration).toBeGreaterThan(0);
    });
  });
});
