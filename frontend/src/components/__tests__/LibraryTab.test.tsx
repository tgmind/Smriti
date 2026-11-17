import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryTab } from '../LibraryTab';
import { Subject, AudioItem } from '@/types';
import { networkService } from '../../services/networkService';

describe('LibraryTab Apple Music Redesign', () => {
  const mockSubjects: Subject[] = [
    {
      id: 'sub-phys',
      name: 'Physics',
      icon_name: 'BookOpen',
      color_hex: '#38bdf8',
      sort_order: 1,
    },
    {
      id: 'sub-chem',
      name: 'Chemistry',
      icon_name: 'BookOpen',
      color_hex: '#f59e0b',
      sort_order: 2,
    },
  ];

  const mockAudioItems: AudioItem[] = [
    {
      id: 'audio-1',
      title: 'Gauss Law & Electric Flux',
      file_format: 'audio/mp3',
      duration_seconds: 180,
      file_size_bytes: 2048000,
      source_type: 'recorded',
      subject_id: 'sub-phys',
      key_terms: ['Flux', 'Gaussian Surface'],
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [30, 60, 45],
      is_favorite: true,
      is_downloaded_offline: true,
    },
  ];

  it('renders minimalist subject cards with Apple Music aesthetic', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // Subject titles
    expect(html).toContain('Physics');
    expect(html).toContain('Chemistry');

    // Clean lesson count in Apple Music subtitle
    expect(html).toContain('1 lesson');
    expect(html).toContain('3:00');

    // Recent lesson note preview
    expect(html).toContain('Gauss Law &amp; Electric Flux');

    // Direct Subject Folders view (Catalog toggle removed)
    expect(html).toContain('Subject Folders');
    expect(html).not.toContain('Catalog');
  });

  it('renders drill-down subject view when initialSubjectId is provided with minimalist playlist rows and eliminates View Note', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    expect(html).toContain('Physics');
    expect(html).toContain('Gauss Law &amp; Electric Flux');
    // Ensure "View Note" is eliminated completely
    expect(html).not.toContain('View Note');
    // Minimalist playlist track layout: track number '1', Play All, duration, and file size
    expect(html).toContain('Play All');
    expect(html).toContain('3:00');
    expect(html).toContain('1.95 MB');
    expect(html).toContain('aria-label="Play Gauss Law &amp; Electric Flux"');
  });

  it('renders New Topic button in root view', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    expect(html).toContain('New Topic');
    expect(html).not.toContain('role="dialog"');
  });

  it('renders shadcn Card modal dialog when creating a new subject folder', () => {
    const handleCreateSubject = vi.fn();
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialCreateFolderOpen={true}
        onCreateSubject={handleCreateSubject}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // Modal dialog
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');

    // shadcn Card structure
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-title"');
    expect(html).toContain('New Subject Folder');
    expect(html).toContain('data-slot="card-description"');
    expect(html).toContain('data-slot="card-action"');
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('Folder Name');
    expect(html).toContain('Theme Color');
    expect(html).toContain('Choose Icon');
    expect(html).toContain('Preview');
    expect(html).toContain('data-slot="card-footer"');
    expect(html).toContain('Cancel');
    expect(html).toContain('Create Folder');
  });

  it('categorizes both downloaded and non-downloaded Drive audio notes subject-wise with minimalist playlist layout and overflow actions', () => {
    const multiAudioItems: AudioItem[] = [
      {
        id: 'audio-downloaded',
        title: 'Gauss Law & Electric Flux',
        file_format: 'audio/mp3',
        duration_seconds: 180,
        file_size_bytes: 2048000,
        source_type: 'recorded',
        subject_id: 'sub-phys',
        key_terms: ['Flux'],
        created_at: new Date().toISOString(),
        audio_enhancement_applied: false,
        waveform_peaks: [30, 60, 45],
        is_favorite: true,
        is_downloaded_offline: true,
        google_drive_file_id: 'drive-phys-1',
      },
      {
        id: 'audio-in-drive',
        title: 'Maxwell Equations in Differential Form',
        file_format: 'audio/mp3',
        duration_seconds: 360,
        file_size_bytes: 4096000,
        source_type: 'recorded',
        subject_id: 'sub-phys',
        key_terms: ['Maxwell'],
        created_at: new Date().toISOString(),
        audio_enhancement_applied: true,
        waveform_peaks: [20, 50, 40],
        is_favorite: false,
        is_downloaded_offline: false,
        google_drive_file_id: 'drive-phys-2',
      },
    ];

    const html = renderToString(
      <LibraryTab
        audioItems={multiAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // 1. Both audio notes are categorized inside the Physics subject folder
    expect(html).toContain('Gauss Law &amp; Electric Flux');
    expect(html).toContain('Maxwell Equations in Differential Form');
    expect(html).toContain('audio notes');

    // 2. Downloaded item shows Offline status
    expect(html).toContain('Offline');

    // 3. Both items provide overflow actions menu and eliminate View Note
    expect(html).not.toContain('View Note');
    expect(html).toContain('aria-label="More actions for Gauss Law &amp; Electric Flux"');
    expect(html).toContain('aria-label="More actions for Maxwell Equations in Differential Form"');
  });

  it('renders delete folder action button on subject cards when onDeleteSubject is provided', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    expect(html).toContain('title="Delete Physics folder"');
    expect(html).toContain('title="Delete Chemistry folder"');
  });

  it('renders delete folder action button for General folder as well, enabling full folder customization', () => {
    const subjectsWithGeneral: Subject[] = [
      ...mockSubjects,
      { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 3 }
    ];

    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={subjectsWithGeneral}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    expect(html).toContain('title="Delete General folder"');
    expect(html).toContain('aria-label="Delete General folder"');
  });

  it('does not display obstructive modal backdrop by default and allows free navigation', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // Modal is not active; UI remains completely unobstructed
    expect(html).not.toContain('Delete Folder &amp; Notes');
    expect(html).not.toContain('Deleting...');
  });

  it('strictly deduplicates subjects by name so duplicate folders are merged and not shown twice', () => {
    const duplicatedSubjects: Subject[] = [
      { id: 'sub-1', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 1 },
      { id: 'sub-2', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 2 },
      { id: 'sub-3', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 3 },
      { id: 'sub-4', name: 'general', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 4 },
    ];

    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={duplicatedSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // Subject count header shows (2) unique subjects: Chemistry & General
    expect(html).toContain('(2)');
  });

  it('renders back button in header and compact header without Switch button when in subfolder', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // 1. Back button to folders is present
    expect(html).toContain('aria-label="Back to folders"');

    // 2. Switch button is completely removed
    expect(html).not.toContain('Switch');

    // 3. Compact header displays subject and stats cleanly
    expect(html).toContain('Physics');
    expect(html).toContain('1 lesson');
    expect(html).toContain('3:00');
    expect(html).toContain('offline');
  });

  it('eliminates View Note screen completely and navigates directly to folder view for initialAudioId', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialAudioId="audio-1"
        onPlayAudio={vi.fn()}
        onSetSpeed={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        playbackState={{
          currentAudio: mockAudioItems[0],
          isPlaying: false,
          positionSeconds: 45,
          durationSeconds: 180,
          playbackSpeed: 1.25,
          isRepeatTrack: false,
          isRepeatQueue: false,
          abLoop: { enabled: false, startSeconds: 0, endSeconds: 0 },
          sleepTimerRemainingSeconds: null,
          learningModeActive: false
        }}
      />
    );

    // 1. Directly navigates into the subject folder without intermediate View Note screen
    expect(html).toContain('Physics');
    expect(html).toContain('Gauss Law &amp; Electric Flux');

    // 2. "View Note" button and old detail page are completely eliminated
    expect(html).not.toContain('View Note');
    expect(html).not.toContain('aria-label="Back to subject folder"');
    expect(html).not.toContain('Concept &amp; Formula Summary');

    // 3. Minimalist playlist rows and Play All action are rendered directly
    expect(html).toContain('Play All');
    expect(html).toContain('aria-label="Play Gauss Law &amp; Electric Flux"');
  });

  it('renders active playing equalizer and highlighted track styling when track is actively playing', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        playbackState={{
          currentAudio: mockAudioItems[0],
          isPlaying: true,
          positionSeconds: 20,
          durationSeconds: 180,
          playbackSpeed: 1.0,
          isRepeatTrack: false,
          isRepeatQueue: false,
          abLoop: { enabled: false, startSeconds: 0, endSeconds: 0 },
          sleepTimerRemainingSeconds: null,
          learningModeActive: false
        }}
      />
    );

    // Active track renders equalizer animation bars and colored accent
    expect(html).toContain('bg-slate-900/[0.04]');
    expect(html).toContain('aria-label="Playing"');
    expect(html).toContain('animate-eq-1');
    expect(html).toContain('aria-label="Pause Gauss Law &amp; Electric Flux"');
  });

  it('renders audio file input and Upload button configured for device audio uploads', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onSaveAudio={vi.fn()}
      />
    );

    // 1. Upload action chip is present
    expect(html).toContain('Upload');
    expect(html).toContain('title="Upload audio notes from device"');

    // 2. Hidden file input for native audio file picker is present
    expect(html).toContain('data-testid="audio-file-input"');
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.webm,.m4b,.opus,.wma,.aiff"');
  });

  it('renders Upload button inside subject folder header and empty state', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={[]} // Empty items to test folder view
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onSaveAudio={vi.fn()}
      />
    );

    // 1. Header has Upload button scoped to Physics
    expect(html).toContain('title="Upload audio to Physics"');

    // 2. Empty state has both Upload Audio and Record Lesson actions
    expect(html).toContain('Upload Audio');
    expect(html).toContain('Record Lesson');
    expect(html).toContain('Upload an audio file or record a new lesson for Physics');
  });

  it('renders cohesive action deck with Upload, New Topic, and real-time Wi-Fi Only sync state indicator', () => {
    const htmlWaiting = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        isDriveConnected={true}
        syncState="waiting_for_wifi"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    expect(htmlWaiting).toContain('Upload');
    expect(htmlWaiting).toContain('New Topic');
    expect(htmlWaiting).toContain('Waiting');
    expect(htmlWaiting).toContain('Wi-Fi Only');

    const htmlSyncing = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        isDriveConnected={true}
        syncState="syncing"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    expect(htmlSyncing).toContain('Syncing...');
    expect(htmlSyncing).toContain('Active');
  });

  it('renders compact morphing Wi-Fi Only sync pill in top header by default', () => {
    networkService.setWifiOnlyMode(true);
    const handleUpdateSettings = vi.fn();
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        userSettings={{
          daily_listening_goal_minutes: 30,
          default_playback_speed: 1.0,
          auto_rewind_seconds: 5,
          cache_limit_mb: 250,
          theme_mode: 'light',
          offline_sync_wifi_only: true
        }}
        onUpdateSettings={handleUpdateSettings}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // 1. Wi-Fi pill in top header bar with morphing state
    expect(html).toContain('Wi-Fi Sync');
    expect(html).toContain('All files auto-sync');
    expect(html).toContain('lucide-wifi');
    expect(html).toContain('border-emerald-200/90');
    expect(html).toContain('bg-emerald-50/90');
    expect(html).toContain('role="button"');
  });

  it('renders Mobile Data active pill when offline_sync_wifi_only is false', () => {
    networkService.setWifiOnlyMode(false);
    const handleUpdateSettings = vi.fn();
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        userSettings={{
          daily_listening_goal_minutes: 30,
          default_playback_speed: 1.0,
          auto_rewind_seconds: 5,
          cache_limit_mb: 250,
          theme_mode: 'light',
          offline_sync_wifi_only: false
        }}
        onUpdateSettings={handleUpdateSettings}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // 1. Wi-Fi + Data dynamic mode indicator
    expect(html).toContain('Wi-Fi + Data');
    expect(html).toContain('Syncing all files');
    expect(html).toContain('lucide-signal');
    expect(html).toContain('border-sky-200/90');
    expect(html).toContain('bg-sky-50/90');
  });

  it('renders sleek compact folder header with Search Lens icon, symbol micro-stats, and minimal sort tabs', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onPlayQueue={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // 1. Top bar: Back button + Library breadcrumb (no duplicate Physics in breadcrumb link)
    expect(html).toContain('aria-label="Back to folders"');
    expect(html).toContain('Library');

    // 2. Top-right actions: Search Lens button and Delete folder button
    expect(html).toContain('aria-label="Search folder"');
    expect(html).toContain('title="Search Physics"');
    expect(html).toContain('aria-label="Delete Physics folder"');

    // 3. Compact symbol-driven folder hero
    expect(html).toContain('Physics');
    expect(html).toContain('1 lesson');
    expect(html).toContain('3:00');
    expect(html).toContain('1 offline');

    // 4. Action toolbar buttons (Play All, Upload, Record) remain untouched
    expect(html).toContain('Play All');
    expect(html).toContain('Upload');
    expect(html).toContain('Record');

    // 5. Card header with borderless sort tabs
    expect(html).toContain('Folder Tracks');
    expect(html).toContain('Hold to select');
    expect(html).toContain('Recent');
    expect(html).toContain('Length');
    expect(html).toContain('A–Z');
  });
});
