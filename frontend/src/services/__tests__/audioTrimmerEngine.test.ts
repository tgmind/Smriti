import { describe, it, expect } from 'vitest';
import { extractPeaks, audioBufferToWavBlob } from '../audioTrimmerEngine';

describe('audioTrimmerEngine', () => {
  it('extractPeaks calculates normalized values between 10 and 95', () => {
    // Mock an AudioBuffer
    const sampleRate = 44100;
    const length = 44100; // 1 second
    const channelData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Sine wave with amplitude 0.8
      channelData[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 0.8;
    }

    const mockBuffer = {
      numberOfChannels: 1,
      sampleRate,
      length,
      duration: 1,
      getChannelData: () => channelData,
    } as unknown as AudioBuffer;

    const peaks = extractPeaks(mockBuffer, 16);
    expect(peaks).toHaveLength(16);
    peaks.forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(10);
      expect(peak).toBeLessThanOrEqual(95);
    });
  });

  it('audioBufferToWavBlob encodes valid PCM WAV header and data', async () => {
    const sampleRate = 8000;
    const length = 800; // 0.1 second
    const channelData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      channelData[i] = (i % 2 === 0 ? 0.5 : -0.5);
    }

    const mockBuffer = {
      numberOfChannels: 1,
      sampleRate,
      length,
      duration: 0.1,
      getChannelData: () => channelData,
    } as unknown as AudioBuffer;

    const wavBlob = audioBufferToWavBlob(mockBuffer);
    expect(wavBlob).toBeDefined();
    expect(wavBlob.type).toBe('audio/wav');
    // Header size (44) + 800 samples * 2 bytes = 1644 bytes
    expect(wavBlob.size).toBe(1644);

    const buffer = await wavBlob.arrayBuffer();
    const view = new DataView(buffer);
    // Check 'RIFF'
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');
    // Check 'WAVE'
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');
  });
});
