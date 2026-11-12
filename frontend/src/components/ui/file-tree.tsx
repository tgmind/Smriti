import * as React from 'react';
import {
  ChevronRight,
  Play,
  Pause,
  Atom,
  FlaskConical,
  Dna,
  Binary,
  BookOpen,
  Music2,
  CheckCircle2
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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

  const totalAudios = audioItems.length;

  return (
    <div
      data-slot="file-tree"
      className={cn(
        'w-full space-y-2.5 rounded-3xl bg-white border border-slate-200/80 p-3 sm:p-4 shadow-2xs select-none',
        className
      )}
    >
      {/* Apple Music Style Catalog Header */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Music2 size={13} className="text-slate-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Catalog By Subject
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {totalAudios} {totalAudios === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      {/* Subject Sections */}
      <div className="space-y-2">
        {subjects.map((subject) => {
          const subjectAudios = audiosBySubject.get(subject.id) || [];
          return (
            <SubjectSection
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
// SUBJECT SECTION (Apple Music Artist / Album Style Group)
// ---------------------------------------------------------------------------
interface SubjectSectionProps {
  subject: Subject;
  audios: AudioItem[];
  onSelectAudio: (audio: AudioItem) => void;
  onSelectSubject?: (subjectId: string) => void;
  onSelectConcept?: (concept: string, audio?: AudioItem) => void;
  activeAudioId?: string | null;
  defaultOpen?: boolean;
}

function SubjectSection({
  subject,
  audios,
  onSelectAudio,
  onSelectSubject,
  onSelectConcept,
  activeAudioId,
  defaultOpen = true
}: SubjectSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Atom': return Atom;
      case 'FlaskConical': return FlaskConical;
      case 'Dna': return Dna;
      case 'Binary': return Binary;
      default: return BookOpen;
    }
  };

  const getSubjectBadge = (colorHex: string) => {
    switch (colorHex) {
      case '#38bdf8':
      case '#3b82f6':
        return {
          icon: 'bg-sky-50 text-sky-600 border-sky-200/80',
          count: 'bg-sky-50 text-sky-700 border-sky-200/60'
        };
      case '#f59e0b':
        return {
          icon: 'bg-amber-50 text-amber-600 border-amber-200/80',
          count: 'bg-amber-50 text-amber-700 border-amber-200/60'
        };
      case '#10b981':
        return {
          icon: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
          count: 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
        };
      case '#a855f7':
        return {
          icon: 'bg-purple-50 text-purple-600 border-purple-200/80',
          count: 'bg-purple-50 text-purple-700 border-purple-200/60'
        };
      default:
        return {
          icon: 'bg-slate-100 text-slate-700 border-slate-200',
          count: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const SubjectIcon = getSubjectIcon(subject.icon_name);
  const subjectTheme = getSubjectBadge(subject.color_hex);
  const totalDuration = audios.reduce((acc, curr) => acc + curr.duration_seconds, 0);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/section rounded-2xl border border-slate-200/70 bg-white overflow-hidden transition-all shadow-2xs hover:border-slate-300"
    >
      {/* Subject Header Row */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <CollapsibleTrigger
          className="flex-1 flex items-center gap-2.5 text-left cursor-pointer min-w-0"
        >
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover/section:scale-105', subjectTheme.icon)}>
            <SubjectIcon size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 truncate">
                {subject.name}
              </span>
              <span className={cn('text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full border shrink-0', subjectTheme.count)}>
                {audios.length} {audios.length === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              {formatDuration(totalDuration)} total
            </span>
          </div>

          <ChevronRight
            size={14}
            className={cn(
              'text-slate-400 transition-transform duration-200 shrink-0 mr-1',
              isOpen && 'rotate-90 text-slate-700'
            )}
          />
        </CollapsibleTrigger>

        {onSelectSubject && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSubject(subject.id);
            }}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ml-1.5"
          >
            Open
          </button>
        )}
      </div>

      {/* Apple Music Style Tracklist */}
      <CollapsibleContent>
        <div className="border-t border-slate-100 divide-y divide-slate-100/90 bg-white">
          {audios.length === 0 ? (
            <div className="py-3 px-4 text-center text-xs text-slate-400 italic">
              No audio lessons recorded in {subject.name} yet.
            </div>
          ) : (
            audios.map((audio, index) => {
              const isActive = activeAudioId === audio.id;
              const trackNum = String(index + 1).padStart(2, '0');
              const concepts: string[] = audio.key_terms || [];

              return (
                <div
                  key={audio.id}
                  onClick={() => onSelectAudio(audio)}
                  className={cn(
                    'group/track flex items-center justify-between gap-3 px-3 py-2.5 transition-colors cursor-pointer',
                    isActive ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'
                  )}
                >
                  {/* Left: Track Index or Playing Indicator */}
                  <div className="w-5 text-center shrink-0">
                    {isActive ? (
                      <span className="flex items-center justify-center text-blue-600 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400 font-medium group-hover/track:text-slate-700">
                        {trackNum}
                      </span>
                    )}
                  </div>

                  {/* Middle: Title, Offline Badge & Concepts */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4
                        className={cn(
                          'text-xs font-semibold truncate',
                          isActive
                            ? 'text-blue-900 font-bold'
                            : 'text-slate-900 group-hover/track:text-blue-600 transition-colors'
                        )}
                      >
                        {audio.title}
                      </h4>
                      {audio.is_downloaded_offline && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 size={8} /> OFFLINE
                        </span>
                      )}
                    </div>

                    {/* Apple Music Style Subtitle: Duration + Concepts */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      <span className="shrink-0">{formatDuration(audio.duration_seconds)}</span>
                      {concepts.length > 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate text-slate-500 font-sans">
                            {concepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                onClick={(e) => {
                                  if (onSelectConcept) {
                                    e.stopPropagation();
                                    onSelectConcept(concept, audio);
                                  }
                                }}
                                className="hover:text-blue-600 hover:underline cursor-pointer"
                              >
                                {cIdx > 0 ? ' · ' : ''}
                                {concept}
                              </span>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Circular Apple Music Play Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAudio(audio);
                    }}
                    aria-label={`Play ${audio.title}`}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 shadow-2xs cursor-pointer',
                      isActive
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/30'
                        : 'bg-slate-950 hover:bg-slate-800 text-white'
                    )}
                  >
                    {isActive ? (
                      <Pause size={10} fill="currentColor" />
                    ) : (
                      <Play size={10} fill="currentColor" className="translate-x-0.5" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
