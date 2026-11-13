import React from 'react';
import { Trash2, CheckCircle2, AlertCircle, X, Cloud } from 'lucide-react';

export interface ActiveSyncTask {
  id: string;
  type: 'delete_folder' | 'delete_audio' | 'sync' | 'upload_audio';
  title: string;
  targetName: string;
  stageMessage: string;
  progressPercent: number; // 0 to 100
  status: 'running' | 'completed' | 'error';
  errorMessage?: string;
  timestamp: number;
}

interface BackgroundSyncBannerProps {
  tasks: ActiveSyncTask[];
  onDismissTask: (taskId: string) => void;
  onRetryTask?: (task: ActiveSyncTask) => void;
}

export const BackgroundSyncBanner: React.FC<BackgroundSyncBannerProps> = ({
  tasks,
  onDismissTask,
  onRetryTask
}) => {
  if (!tasks || tasks.length === 0) return null;

  // Render top active task (and count of additional background tasks if multiple)
  const currentTask = tasks[0];
  const pendingCount = tasks.length - 1;

  const isCompleted = currentTask.status === 'completed';
  const isError = currentTask.status === 'error';

  return (
    <div
      className="fixed top-3 left-0 right-0 z-50 px-3.5 sm:px-4 max-w-md mx-auto pointer-events-none safe-top animate-in fade-in slide-in-from-top-2 duration-300"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto bg-white/95 backdrop-blur-xl border rounded-2xl p-3 shadow-lg shadow-slate-900/8 transition-all duration-300 ${
          isCompleted
            ? 'border-emerald-200/90 shadow-emerald-900/5'
            : isError
            ? 'border-rose-200/90 shadow-rose-900/5'
            : 'border-slate-200/90'
        }`}
      >
        <div className="flex items-start justify-between gap-2.5">
          {/* Status Icon */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : isError
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : currentTask.type === 'delete_folder' || currentTask.type === 'delete_audio'
                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                  : 'bg-blue-50 border-blue-100 text-blue-600'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 size={16} className="text-emerald-600 animate-in zoom-in-75 duration-200" />
              ) : isError ? (
                <AlertCircle size={16} />
              ) : currentTask.type === 'delete_folder' ? (
                <Trash2 size={15} className="animate-pulse" />
              ) : currentTask.type === 'delete_audio' ? (
                <Trash2 size={15} className="animate-pulse" />
              ) : (
                <Cloud size={15} className="animate-pulse" />
              )}
            </div>

            {/* Task Info & Stage */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {currentTask.title}
                </span>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 shrink-0 font-mono">
                    +{pendingCount}
                  </span>
                )}
                <span
                  className={`text-[10px] font-mono font-bold shrink-0 ml-auto mr-1 ${
                    isCompleted
                      ? 'text-emerald-600'
                      : isError
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {currentTask.progressPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {currentTask.stageMessage}
              </p>
            </div>
          </div>

          {/* Actions: Retry or Dismiss */}
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {isError && onRetryTask && (
              <button
                type="button"
                onClick={() => onRetryTask(currentTask)}
                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition-colors cursor-pointer"
                title="Retry task"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismissTask(currentTask.id)}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Sleek Progress Track */}
        <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isCompleted
                ? 'bg-emerald-500'
                : isError
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500'
            }`}
            style={{ width: `${Math.max(currentTask.progressPercent, 5)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
