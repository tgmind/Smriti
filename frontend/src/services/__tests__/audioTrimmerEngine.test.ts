import { describe, it, expect, beforeEach } from 'vitest';
import { extractPeaks, audioBufferToWavBlob, trimAudioBlob } from '../audioTrimmerEngine';

describe('audioTrimmerEngine', () => {
  it('extractPeaks calculates normalized values between 10 and 95', () => {
    const sampleRate = 44100;
    const length = 44100; // 1 second
    const channelData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
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

  it('extractPeaks handles silent and empty buffers safely', () => {
    const emptyBuffer = {
      numberOfChannels: 1,
      sampleRate: 44100,
      length: 0,
      duration: 0,
      getChannelData: () => new Float32Array(0),
    } as unknown as AudioBuffer;

    const emptyPeaks = extractPeaks(emptyBuffer, 8);
    expect(emptyPeaks).toHaveLength(8);
    emptyPeaks.forEach(p => expect(p).toBe(20));

    const silentBuffer = {
      numberOfChannels: 1,
      sampleRate: 44100,
      length: 1000,
      duration: 1000 / 44100,
      getChannelData: () => new Float32Array(1000),
    } as unknown as AudioBuffer;

    const silentPeaks = extractPeaks(silentBuffer, 10);
    expect(silentPeaks).toHaveLength(10);
    silentPeaks.forEach(p => expect(p).toBe(10)); // Scaled floor
  });

  it('audioBufferToWavBlob encodes valid mono 16-bit PCM WAV', async () => {
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
    // Header size (44) + 800 samples * 1 channel * 2 bytes = 1644 bytes
    expect(wavBlob.size).toBe(1644);

    const buffer = await wavBlob.arrayBuffer();
    const view = new DataView(buffer);

    // Check 'RIFF'
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');

    // Check 'WAVE'
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');

    // Check 'fmt '
    const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
    expect(fmt).toBe('fmt ');

    // Check PCM format = 1
    expect(view.getUint16(20, true)).toBe(1);
    // Channels = 1
    expect(view.getUint16(22, true)).toBe(1);
    // Sample Rate = 8000
    expect(view.getUint32(24, true)).toBe(8000);
    // Byte Rate = 16000 (8000 * 1 * 2)
    expect(view.getUint32(28, true)).toBe(16000);
    // Block Align = 2 (1 * 2)
    expect(view.getUint16(32, true)).toBe(2);
    // Bits per sample = 16
    expect(view.getUint16(34, true)).toBe(16);

    // Check 'data'
    const data = String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39));
    expect(data).toBe('data');
    // Data length = 1600 bytes
    expect(view.getUint32(40, true)).toBe(1600);
  });

  it('audioBufferToWavBlob encodes valid stereo 16-bit PCM WAV with correct channel interleaving', async () => {
    const sampleRate = 44100;
    const length = 100; // 100 sample frames
    const leftData = new Float32Array(length).fill(0.25);
    const rightData = new Float32Array(length).fill(-0.25);

    const mockBuffer = {
      numberOfChannels: 2,
      sampleRate,
      length,
      duration: length / sampleRate,
      getChannelData: (ch: number) => ch === 0 ? leftData : rightData,
    } as unknown as AudioBuffer;

    const wavBlob = audioBufferToWavBlob(mockBuffer);
    // Header (44) + 100 samples * 2 channels * 2 bytes = 444 bytes
    expect(wavBlob.size).toBe(444);

    const buffer = await wavBlob.arrayBuffer();
    const view = new DataView(buffer);

    // Channels = 2
    expect(view.getUint16(22, true)).toBe(2);
    // Block Align = 4 (2 * 2)
    expect(view.getUint16(32, true)).toBe(4);

    // Check interleaved samples: First sample Left should be positive, Right should be negative
    const firstLeft = view.getInt16(44, true);
    const firstRight = view.getInt16(46, true);
    expect(firstLeft).toBeGreaterThan(0);
    expect(firstRight).toBeLessThan(0);
  });

  describe('trimAudioBlob with Web Audio API mock', () => {
    beforeEach(() => {
      // Mock AudioContext in global window
      const sampleRate = 44100;
      const duration = 2.0; // 2 seconds
      const totalSamples = sampleRate * duration;
      const channelData = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i++) {
        channelData[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 0.7;
      }

      class MockAudioContext {
        sampleRate = sampleRate;
        state = 'running';

        createBuffer(channels: number, length: number, sRate: number): AudioBuffer {
          const buffers = Array.from({ length: channels }, () => new Float32Array(length));
          return {
            numberOfChannels: channels,
            length,
            sampleRate: sRate,
            duration: length / sRate,
            getChannelData: (ch: number) => buffers[ch]
          } as unknown as AudioBuffer;
        }

        async decodeAudioData(_ab: ArrayBuffer): Promise<AudioBuffer> {
          return {
            numberOfChannels: 1,
            length: totalSamples,
            sampleRate,
            duration,
            getChannelData: () => channelData
          } as unknown as AudioBuffer;
        }

        async close() {
          this.state = 'closed';
        }
      }

      (globalThis as any).AudioContext = MockAudioContext;
    });

    it('slices audio precisely between 0.5s and 1.5s with equal-power anti-click fades', async () => {
      const dummyBlob = new Blob(['mock-audio-payload'], { type: 'audio/wav' });
      const result = await trimAudioBlob(dummyBlob, 0.5, 1.5, {
        fadeIn: true,
        fadeOut: true,
        fadeDurationSeconds: 0.05
      });

      expect(result).toBeDefined();
      expect(result.durationSeconds).toBeCloseTo(1.0, 1);
      expect(result.sampleRate).toBe(44100);
      expect(result.numberOfChannels).toBe(1);
      expect(result.peaks).toHaveLength(32);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('audio/wav');
    });

    it('gracefully handles boundary clamping when start >= end or out-of-range', async () => {
      const dummyBlob = new Blob(['mock-audio-payload'], { type: 'audio/wav' });

      // Out of bounds: start is larger than end
      const resultInverted = await trimAudioBlob(dummyBlob, 1.8, 0.4);
      expect(resultInverted).toBeDefined();
      expect(resultInverted.durationSeconds).toBeGreaterThan(0);

      // Start is beyond duration
      const resultBeyond = await trimAudioBlob(dummyBlob, 5.0, 6.0);
      expect(resultBeyond).toBeDefined();
      expect(resultBeyond.durationSeconds).toBeGreaterThan(0);
    });
  });
});
