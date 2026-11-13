import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { BackgroundSyncBanner, ActiveSyncTask } from '../BackgroundSyncBanner';

describe('BackgroundSyncBanner', () => {
  it('renders nothing when tasks array is empty', () => {
    const html = renderToString(
      <BackgroundSyncBanner tasks={[]} onDismissTask={() => {}} />
    );
    expect(html).toBe('');
  });

  it('renders active folder deletion task with progress bar and stage message', () => {
    const mockTask: ActiveSyncTask = {
      id: 'task-1',
      type: 'delete_folder',
      title: 'Deleting "Physics"',
      targetName: 'Physics',
      stageMessage: 'Removing folder from Google Drive...',
      progressPercent: 65,
      status: 'running',
      timestamp: Date.now()
    };

    const html = renderToString(
      <BackgroundSyncBanner tasks={[mockTask]} onDismissTask={() => {}} />
    );

    expect(html).toContain('Deleting');
    expect(html).toContain('Physics');
    expect(html).toContain('65');
    expect(html).toContain('Removing folder from Google Drive...');
    expect(html).toContain('role="status"');
    expect(html).toContain('width:65%');
  });

  it('renders completed state with emerald checkmark and 100%', () => {
    const completedTask: ActiveSyncTask = {
      id: 'task-2',
      type: 'delete_folder',
      title: 'Deleting "Chemistry"',
      targetName: 'Chemistry',
      stageMessage: 'Folder deleted and Drive synchronized',
      progressPercent: 100,
      status: 'completed',
      timestamp: Date.now()
    };

    const html = renderToString(
      <BackgroundSyncBanner tasks={[completedTask]} onDismissTask={() => {}} />
    );

    expect(html).toContain('100');
    expect(html).toContain('lucide-check-circle-2');
    expect(html).toContain('Folder deleted and Drive synchronized');
    expect(html).toContain('border-emerald-200');
  });

  it('renders error state with retry button', () => {
    const errorTask: ActiveSyncTask = {
      id: 'task-4',
      type: 'delete_folder',
      title: 'Deleting "Math"',
      targetName: 'Math',
      stageMessage: 'Drive deletion error: Network disconnected',
      progressPercent: 100,
      status: 'error',
      errorMessage: 'Network disconnected',
      timestamp: Date.now()
    };

    const html = renderToString(
      <BackgroundSyncBanner
        tasks={[errorTask]}
        onDismissTask={() => {}}
        onRetryTask={() => {}}
      />
    );

    expect(html).toContain('border-rose-200');
    expect(html).toContain('Drive deletion error: Network disconnected');
    expect(html).toContain('Retry');
  });

  it('displays pending background tasks badge when multiple tasks are queued', () => {
    const task1: ActiveSyncTask = {
      id: 'task-1',
      type: 'delete_folder',
      title: 'Deleting "Physics"',
      targetName: 'Physics',
      stageMessage: 'Removing folder...',
      progressPercent: 40,
      status: 'running',
      timestamp: Date.now()
    };

    const task2: ActiveSyncTask = {
      id: 'task-2',
      type: 'delete_audio',
      title: 'Deleting Note',
      targetName: 'Electromagnetism Lecture',
      stageMessage: 'Removing audio...',
      progressPercent: 10,
      status: 'running',
      timestamp: Date.now()
    };

    const html = renderToString(
      <BackgroundSyncBanner tasks={[task1, task2]} onDismissTask={() => {}} />
    );

    expect(html).toContain('+');
    expect(html).toContain('1');
    expect(html).toContain('Deleting');
  });
});
