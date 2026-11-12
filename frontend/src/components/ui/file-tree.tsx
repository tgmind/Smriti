import * as React from 'react';
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  FileAudio,
  Hash,
  Play
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/services/learningEngine';
import { Subject, AudioItem } from '@/types';

export interface FileTreeProps {
  subjects: Subject[];
  audioItems: AudioItem[];
  onSelectAudio: (audio: AudioItem) => void;
  onSelectSubject?: (subjectId: string) => void;
  onSelectConcept?: (concept: string, audio?: AudioItem) => void;
  activeAudioId?: string | null;
  className?: string;
  defaultExpanded?: boolean;
}

export function FileTree({
  subjects,
  audioItems,
  onSelectAudio,
  onSelectSubject,
  onSelectConcept,
  activeAudioId,
  className,
  defaultExpanded = true
}: FileTreeProps) {
  // Group audio items by subject
  const audiosBySubject = React.useMemo(() => {
    const map = new Map<string, AudioItem[]>();
    subjects.forEach(s => map.set(s.id, []));
    audioItems.forEach(item => {
      const subId = item.subject_id || 'general';
      const list = map.get(subId) || [];
      list.push(item);
      map.set(subId, list);
    });
    return map;
  }, [subjects, audioItems]);

  return (
    <div
      data-slot="file-tree"
      className={cn(
        'w-full space-y-1.5 rounded-3xl bg-white border border-slate-200/80 p-3 shadow-2xs text-xs select-none',
        className
      )}
    >
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
        <span>Study Catalog Tree</span>
        <span>Subject / Lesson / Concept</span>
      </div>

      <div className="space-y-1">
        {subjects.map((subject) => {
          const subjectAudios = audiosBySubject.get(subject.id) || [];
          return (
            <SubjectFolderNode
              key={subject.id}
              subject={subject}
              audios={subjectAudios}
              onSelectAudio={onSelectAudio}
              onSelectSubject={onSelectSubject}
              onSelectConcept={onSelectConcept}
              activeAudioId={activeAudioId}
              defaultOpen={defaultExpanded}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. SUBJECT FOLDER (Collapsible)
// ---------------------------------------------------------------------------
interface SubjectFolderNodeProps {
  subject: Subject;
  audios: AudioItem[];
  onSelectAudio: (audio: AudioItem) => void;
  onSelectSubject?: (subjectId: string) => void;
  onSelectConcept?: (concept: string, audio?: AudioItem) => void;
  activeAudioId?: string | null;
  defaultOpen?: boolean;
}

function SubjectFolderNode({
  subject,
  audios,
  onSelectAudio,
  onSelectSubject,
  onSelectConcept,
  activeAudioId,
  defaultOpen = true
}: SubjectFolderNodeProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/folder rounded-2xl transition-colors hover:bg-slate-50/70"
    >
      <div className="flex items-center justify-between pr-2">
        <CollapsibleTrigger
          className="flex-1 flex items-center gap-2 py-2 px-2.5 rounded-xl text-left font-bold text-slate-900 transition-colors hover:text-blue-700 cursor-pointer"
        >
          <ChevronRight
            size={14}
            className={cn(
              'text-slate-400 transition-transform duration-200 shrink-0',
              isOpen && 'rotate-90 text-blue-600'
            )}
          />
          {isOpen ? (
            <FolderOpenIcon size={16} className="text-amber-500 shrink-0" />
          ) : (
            <FolderIcon size={16} className="text-amber-500 shrink-0" />
          )}
          <span className="truncate">{subject.name}</span>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full shrink-0">
            {audios.length}
          </span>
        </CollapsibleTrigger>

        {onSelectSubject && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSubject(subject.id);
            }}
            className="text-[10px] font-mono text-slate-400 hover:text-slate-900 h-6 px-1.5 rounded-md"
          >
            Open
          </Button>
        )}
      </div>

      <CollapsibleContent className="pl-6 pr-1 pb-1 space-y-1">
        {audios.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic py-1 pl-4">
            No audio lessons in this subject.
          </p>
        ) : (
          audios.map((audio) => (
            <LessonNode
              key={audio.id}
              audio={audio}
              onSelectAudio={onSelectAudio}
              onSelectConcept={onSelectConcept}
              isActive={activeAudioId === audio.id}
              defaultExpanded={defaultOpen}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// 2. LESSON / AUDIO NODE (Collapsible or Button)
// ---------------------------------------------------------------------------
interface LessonNodeProps {
  audio: AudioItem;
  onSelectAudio: (audio: AudioItem) => void;
  onSelectConcept?: (concept: string, audio?: AudioItem) => void;
  isActive?: boolean;
  defaultExpanded?: boolean;
}

function LessonNode({
  audio,
  onSelectAudio,
  onSelectConcept,
  isActive = false,
  defaultExpanded = true
}: LessonNodeProps) {
  const [isOpen, setIsOpen] = React.useState(defaultExpanded || isActive);
  const concepts: string[] = audio.key_terms || [];
  const hasConcepts = concepts.length > 0;

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-150',
        isActive
          ? 'bg-blue-50/70 border-blue-200 text-blue-950 shadow-2xs'
          : 'bg-white border-slate-100 hover:border-slate-200 text-slate-800'
      )}
    >
      <div className="flex items-center justify-between p-1.5 pl-2 gap-2">
        {/* Toggle concepts trigger if has concepts */}
        {hasConcepts ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-700 transition-transform cursor-pointer shrink-0"
            title="Expand concepts"
          >
            <ChevronRight
              size={12}
              className={cn(
                'transition-transform duration-150',
                isOpen && 'rotate-90 text-blue-600'
              )}
            />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <FileAudio
          size={14}
          className={cn(
            'shrink-0',
            isActive ? 'text-blue-600' : 'text-slate-400'
          )}
        />

        {/* Title click -> select/open audio */}
        <div
          onClick={() => onSelectAudio(audio)}
          className="flex-1 min-w-0 cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4
              className={cn(
                'text-xs font-semibold truncate',
                isActive
                  ? 'text-blue-900 font-bold'
                  : 'text-slate-900 group-hover:text-blue-600 transition-colors'
              )}
            >
              {audio.title}
            </h4>
            {audio.is_downloaded_offline && (
              <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                OFFLINE
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
            {formatDuration(audio.duration_seconds)}
          </span>
        </div>

        {/* Action Button: Play */}
        <button
          type="button"
          onClick={() => onSelectAudio(audio)}
          aria-label={`Play ${audio.title}`}
          className="w-7 h-7 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-2xs cursor-pointer"
        >
          <Play size={10} fill="currentColor" className="translate-x-0.5" />
        </button>
      </div>

      {/* 3. CONCEPTS LIST (Nested Under Lesson) */}
      {hasConcepts && isOpen && (
        <div className="pl-7 pr-2 pb-2 pt-1 border-t border-slate-100 flex flex-wrap gap-1 bg-slate-50/50 rounded-b-xl animate-in fade-in duration-100">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block w-full mb-0.5">
            Concepts Covered:
          </span>
          {concepts.map((concept, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectConcept?.(concept, audio)}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-[10px] font-mono text-slate-700 hover:text-blue-800 transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <Hash size={10} className="text-slate-400" />
              <span>{concept}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
