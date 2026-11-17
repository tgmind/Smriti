import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryTab } from '../LibraryTab';
import { Subject, AudioItem } from '../../types';
import { networkService } from '../../services/networkService';

describe('Subject Folder Three-Dots Menu "Share Public Link" UI & Safeguards', () => {
  const mockSubjectGeneral: Subject = {
    id: 'general',
    name: 'General',
    icon_name: 'BookOpen',
    color_hex: '#38bdf8',
    sort_order: 1
  };

  const mockAudio: AudioItem = {
    id: 'audio-1',
    title: 'Intro to Philosophy',
    subject_id: 'general',
    subject_name: 'General',
    duration_seconds: 120,
    source_type: 'recorded',
    file_format: 'mp3',
    file_size_bytes: 512,
    audio_enhancement_applied: false,
    waveform_peaks: [],
    key_terms: [],
    is_favorite: false,
    created_at: '2026-03-10T10:00:00Z'
  };

  beforeEach(() => {
    networkService.resetMockStatus();
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    networkService.resetMockStatus();
    vi.restoreAllMocks();
  });

  it('omits "Share Public Link" from Subject Folder menu when user is not connected to Google Drive', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={[mockAudio]}
        subjects={[mockSubjectGeneral]}
        isDriveConnected={false}
        initialActiveMenuFolderId="general"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // Verify Rename, Make a Copy, and Delete are present
    expect(html).toContain('Rename');
    expect(html).toContain('Make a Copy');
    expect(html).toContain('Delete');

    // STRICT: Share Public Link must NOT be rendered when disconnected
    expect(html).not.toContain('Share Public Link');
  });

  it('omits "Share Public Link" from Subject Folder menu when device is offline', () => {
    networkService.setMockStatus({
      isOnline: false,
      connectionType: 'none',
      isWifi: false,
      isCellular: false
    });

    const html = renderToString(
      <LibraryTab
        audioItems={[mockAudio]}
        subjects={[mockSubjectGeneral]}
        isDriveConnected={true}
        initialActiveMenuFolderId="general"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // STRICT: Share Public Link must NOT be rendered when offline
    expect(html).not.toContain('Share Public Link');
    expect(html).toContain('Rename');
    expect(html).toContain('Make a Copy');
  });

  it('renders "Share Public Link" in Subject Folder menu when connected to Google Drive and online', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={[mockAudio]}
        subjects={[mockSubjectGeneral]}
        isDriveConnected={true}
        initialActiveMenuFolderId="general"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // Must be rendered when connected & online
    expect(html).toContain('Share Public Link');
    expect(html).toContain('Rename');
    expect(html).toContain('Make a Copy');
    expect(html).toContain('Delete');
  });
});
