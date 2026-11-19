import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc
  })
}));

let syncStudentProfileWithSupabase: any;
let checkStudentStatus: any;

beforeAll(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-test-anon-key');
  const mod = await import('../supabase');
  syncStudentProfileWithSupabase = mod.syncStudentProfileWithSupabase;
  checkStudentStatus = mod.checkStudentStatus;
});

describe('Supabase Student Profile Telemetry & Admin Blocking Governance', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
  });

  it('safely handles empty email by returning fallback status', async () => {
    const status = await syncStudentProfileWithSupabase({ email: '' });
    expect(status.isBlocked).toBe(false);
    expect(status.role).toBe('student');
  });

  it('detects locally cached blocked status immediately without network call', async () => {
    localStorage.setItem('smriti_blocked_user', 'true');
    localStorage.setItem('smriti_blocked_reason', 'Cheating during examination');

    const status = await syncStudentProfileWithSupabase({ email: 'test@student.edu' });
    expect(status.isBlocked).toBe(true);
    expect(status.blockedReason).toBe('Cheating during examination');
  });

  it('clears blocked status when server confirms account is active', async () => {
    localStorage.setItem('smriti_blocked_user', 'true');

    mockRpc.mockResolvedValueOnce({
      data: {
        is_blocked: false,
        role: 'student',
        profile_id: '123'
      },
      error: null
    } as any);

    const status = await syncStudentProfileWithSupabase({ email: 'reinstated@student.edu' });
    expect(status.isBlocked).toBe(false);
    expect(localStorage.getItem('smriti_blocked_user')).toBeNull();
  });

  it('caches blocked status and reason when server returns is_blocked: true', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        is_blocked: true,
        blocked_reason: 'Account suspended for policy violations',
        role: 'student'
      },
      error: null
    } as any);

    const status = await syncStudentProfileWithSupabase({ email: 'banned@student.edu' });
    expect(status.isBlocked).toBe(true);
    expect(status.blockedReason).toBe('Account suspended for policy violations');
    expect(localStorage.getItem('smriti_blocked_user')).toBe('true');
    expect(localStorage.getItem('smriti_blocked_reason')).toBe('Account suspended for policy violations');
  });

  it('checkStudentStatus falls back gracefully when offline or network fails', async () => {
    mockRpc.mockRejectedValueOnce(new Error('Network offline'));

    const status = await checkStudentStatus('offline@student.edu');
    expect(status.isBlocked).toBe(false);
    expect(status.role).toBe('student');
  });
});
