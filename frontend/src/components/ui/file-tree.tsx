import * as React from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
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
  defaultExpanded = true,
}: FileTreeProps) {
  // Group audio items by subject ID
  const audiosBySubject = React.useMemo(() => {
    const map = new Map<string, AudioItem[]>();
    subjects.forEach((s) => map.set(s.id, []));
    audioItems.forEach((item) => {
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
      className={cn('flex w-full flex-col py-2 text-sm select-none', className)}
    >
      <div className="flex flex-col space-y-0.5">
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
// 1. SUBJECT FOLDER NODE
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
  defaultOpen = true,
}: SubjectFolderNodeProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        onClick={() => onSelectSubject?.(subject.id)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-normal text-slate-800 hover:bg-slate-100/70 hover:text-slate-900 transition-colors cursor-pointer text-left"
      >
        <ChevronRight
          size={16}
          className={cn(
            'text-slate-500 transition-transform duration-150 shrink-0',
            isOpen && 'rotate-90'
          )}
        />
        {isOpen ? (
          <FolderOpen size={16} className="text-slate-700 shrink-0" />
        ) : (
          <Folder size={16} className="text-slate-700 shrink-0" />
        )}
        <span className="truncate">{subject.name}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-5 flex flex-col space-y-0.5">
          {audios.length === 0 ? (
            <div className="px-2 py-1 text-xs text-slate-400 italic">
              empty
            </div>
          ) : (
            audios.map((audio) => (
              <AudioTreeNode
                key={audio.id}
                audio={audio}
                onSelectAudio={onSelectAudio}
                onSelectConcept={onSelectConcept}
                isActive={activeAudioId === audio.id}
                defaultExpanded={defaultOpen}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// 2. AUDIO TREE NODE (Folder with concepts OR File if leaf)
// ---------------------------------------------------------------------------
interface AudioTreeNodeProps {
  audio: AudioItem;
  onSelectAudio: (audio: AudioItem) => void;
  onSelectConcept?: (concept: string, audio?: AudioItem) => void;
  isActive: boolean;
  defaultExpanded?: boolean;
}

function AudioTreeNode({
  audio,
  onSelectAudio,
  onSelectConcept,
  isActive,
  defaultExpanded = true,
}: AudioTreeNodeProps) {
  const [isOpen, setIsOpen] = React.useState(defaultExpanded);
  const concepts = audio.key_terms || [];
  const hasConcepts = concepts.length > 0;

  if (hasConcepts) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          onClick={() => onSelectAudio(audio)}
          className={cn(
            'flex w-full items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer text-left',
            isActive
              ? 'bg-slate-100 text-slate-900 font-medium'
              : 'font-normal text-slate-800 hover:bg-slate-100/70 hover:text-slate-900'
          )}
        >
          <ChevronRight
            size={16}
            className={cn(
              'text-slate-500 transition-transform duration-150 shrink-0',
              isOpen && 'rotate-90'
            )}
          />
          {isOpen ? (
            <FolderOpen size={16} className="text-slate-700 shrink-0" />
          ) : (
            <Folder size={16} className="text-slate-700 shrink-0" />
          )}
          <span className="truncate">{audio.title}</span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="ml-5 flex flex-col space-y-0.5">
            {concepts.map((concept) => (
              <button
                key={concept}
                type="button"
                onClick={() => {
                  onSelectConcept?.(concept, audio);
                  onSelectAudio(audio);
                }}
                className="flex w-full items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-normal text-slate-700 hover:bg-slate-100/70 hover:text-slate-900 transition-colors cursor-pointer text-left"
              >
                <File size={16} className="text-slate-600 shrink-0" />
                <span className="truncate">{concept}</span>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Single file leaf node
  return (
    <button
      type="button"
      onClick={() => onSelectAudio(audio)}
      className={cn(
        'flex w-full items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer text-left',
        isActive
          ? 'bg-slate-100 text-slate-900 font-medium'
          : 'font-normal text-slate-800 hover:bg-slate-100/70 hover:text-slate-900'
      )}
    >
      <File size={16} className="text-slate-600 shrink-0" />
      <span className="truncate">{audio.title}</span>
    </button>
  );
}
