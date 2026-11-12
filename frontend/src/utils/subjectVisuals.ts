import {
  Calculator,
  BookOpen,
  Globe,
  Music,
  Flame,
  Sparkles,
  Zap,
  Folder,
  GraduationCap,
  Landmark,
  Scale,
  Code,
  TrendingUp,
  Lightbulb,
  Compass,
  Languages,
  PenTool,
  Cpu,
  Layers,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { Subject } from '../types';

export interface SubjectVisualTheme {
  icon: LucideIcon;
  iconName: string;
  label: string;
  monogram: string;
  colorHex: string;
  bg: string;          // Icon container background and text color
  badgeBg: string;     // Pill badge background, text, and border
  border: string;      // Border color
  cardBg: string;      // Card light background tint
  activeRing: string;  // Ring hover state
  gradient: string;    // Gradient for players / banners
  discShadow: string;  // Glow shadow
  glow: string;        // Accent glow
}

export const ACADEMIC_ICON_MAP: Record<string, LucideIcon> = {
  // Legacy PCMB icon identifiers are unified to universal BookOpen
  Atom: BookOpen,
  FlaskConical: BookOpen,
  Dna: BookOpen,
  Binary: BookOpen,
  Calculator,
  BookOpen,
  Globe,
  Music,
  Flame,
  Sparkles,
  Zap,
  Folder,
  GraduationCap,
  Landmark,
  Scale,
  Code,
  TrendingUp,
  Lightbulb,
  Compass,
  Languages,
  PenTool,
  Cpu,
  Layers,
  FileText,
};

export const COLOR_THEMES = [
  {
    key: 'violet',
    hex: '#8b5cf6',
    bg: 'bg-violet-100 text-violet-700',
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-200/80',
    border: 'border-violet-200',
    cardBg: 'bg-violet-50/70',
    activeRing: 'hover:ring-violet-300',
    gradient: 'from-violet-500 via-indigo-600 to-purple-700',
    discShadow: 'shadow-[0_20px_50px_rgba(139,92,246,0.3)]',
    glow: 'rgba(139, 92, 246, 0.15)',
  },
  {
    key: 'rose',
    hex: '#f43f5e',
    bg: 'bg-rose-100 text-rose-700',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    border: 'border-rose-200',
    cardBg: 'bg-rose-50/70',
    activeRing: 'hover:ring-rose-300',
    gradient: 'from-rose-500 via-pink-600 to-rose-700',
    discShadow: 'shadow-[0_20px_50px_rgba(244,63,94,0.3)]',
    glow: 'rgba(244, 63, 94, 0.15)',
  },
  {
    key: 'emerald',
    hex: '#10b981',
    bg: 'bg-emerald-100 text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    border: 'border-emerald-200',
    cardBg: 'bg-emerald-50/70',
    activeRing: 'hover:ring-emerald-300',
    gradient: 'from-emerald-500 via-teal-600 to-emerald-700',
    discShadow: 'shadow-[0_20px_50px_rgba(16,185,129,0.3)]',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  {
    key: 'amber',
    hex: '#f59e0b',
    bg: 'bg-amber-100 text-amber-800',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    border: 'border-amber-200',
    cardBg: 'bg-amber-50/70',
    activeRing: 'hover:ring-amber-300',
    gradient: 'from-amber-400 via-orange-500 to-amber-600',
    discShadow: 'shadow-[0_20px_50px_rgba(245,158,11,0.3)]',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  {
    key: 'sky',
    hex: '#0284c7',
    bg: 'bg-sky-100 text-sky-700',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
    border: 'border-sky-200',
    cardBg: 'bg-sky-50/70',
    activeRing: 'hover:ring-sky-300',
    gradient: 'from-sky-500 via-blue-600 to-cyan-700',
    discShadow: 'shadow-[0_20px_50px_rgba(2,132,199,0.3)]',
    glow: 'rgba(2, 132, 199, 0.15)',
  },
  {
    key: 'indigo',
    hex: '#4f46e5',
    bg: 'bg-indigo-100 text-indigo-700',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    border: 'border-indigo-200',
    cardBg: 'bg-indigo-50/70',
    activeRing: 'hover:ring-indigo-300',
    gradient: 'from-indigo-500 via-purple-600 to-indigo-700',
    discShadow: 'shadow-[0_20px_50px_rgba(79,70,229,0.3)]',
    glow: 'rgba(79, 70, 229, 0.15)',
  },
  {
    key: 'teal',
    hex: '#0d9488',
    bg: 'bg-teal-100 text-teal-700',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
    border: 'border-teal-200',
    cardBg: 'bg-teal-50/70',
    activeRing: 'hover:ring-teal-300',
    gradient: 'from-teal-500 via-emerald-600 to-teal-700',
    discShadow: 'shadow-[0_20px_50px_rgba(13,148,136,0.3)]',
    glow: 'rgba(13, 148, 136, 0.15)',
  },
  {
    key: 'fuchsia',
    hex: '#c026d3',
    bg: 'bg-fuchsia-100 text-fuchsia-700',
    badgeBg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80',
    border: 'border-fuchsia-200',
    cardBg: 'bg-fuchsia-50/70',
    activeRing: 'hover:ring-fuchsia-300',
    gradient: 'from-fuchsia-500 via-pink-600 to-purple-700',
    discShadow: 'shadow-[0_20px_50px_rgba(192,38,211,0.3)]',
    glow: 'rgba(192, 38, 211, 0.15)',
  },
  {
    key: 'orange',
    hex: '#ea580c',
    bg: 'bg-orange-100 text-orange-800',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200/80',
    border: 'border-orange-200',
    cardBg: 'bg-orange-50/70',
    activeRing: 'hover:ring-orange-300',
    gradient: 'from-orange-500 via-amber-600 to-red-600',
    discShadow: 'shadow-[0_20px_50px_rgba(234,88,12,0.3)]',
    glow: 'rgba(234, 88, 12, 0.15)',
  },
  {
    key: 'slate',
    hex: '#475569',
    bg: 'bg-slate-200/80 text-slate-800',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200/80',
    border: 'border-slate-300',
    cardBg: 'bg-slate-50/70',
    activeRing: 'hover:ring-slate-300',
    gradient: 'from-slate-700 via-slate-800 to-slate-900',
    discShadow: 'shadow-[0_20px_50px_rgba(71,85,105,0.3)]',
    glow: 'rgba(71, 85, 105, 0.15)',
  },
];

/**
 * Generate a clean 1-2 character monogram for any subject name.
 * e.g., "Economics" -> "EC", "Computer Science" -> "CS", "Law" -> "LW"
 */
export function getSubjectMonogram(name: string): string {
  if (!name || !name.trim()) return 'SM';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase();
}

/**
 * Deterministic hash to map any string to a palette index.
 */
function hashStringToIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

/**
 * Find the closest color theme from a given hex code.
 */
export function getThemeByHex(hex?: string): typeof COLOR_THEMES[number] {
  if (!hex) return COLOR_THEMES[0];
  const h = hex.toLowerCase().trim();

  if (h.includes('sky') || h === '#38bdf8' || h === '#0284c7' || h === '#0ea5e9') {
    return COLOR_THEMES.find(t => t.key === 'sky') || COLOR_THEMES[4];
  }
  if (h.includes('amber') || h === '#f59e0b' || h === '#d97706' || h === '#b45309') {
    return COLOR_THEMES.find(t => t.key === 'amber') || COLOR_THEMES[3];
  }
  if (h.includes('emerald') || h === '#10b981' || h === '#059669' || h === '#047857') {
    return COLOR_THEMES.find(t => t.key === 'emerald') || COLOR_THEMES[2];
  }
  if (h.includes('rose') || h === '#f43f5e' || h === '#e11d48' || h === '#be123c') {
    return COLOR_THEMES.find(t => t.key === 'rose') || COLOR_THEMES[1];
  }
  if (h.includes('indigo') || h === '#6366f1' || h === '#4f46e5' || h === '#4338ca') {
    return COLOR_THEMES.find(t => t.key === 'indigo') || COLOR_THEMES[5];
  }
  if (h.includes('violet') || h.includes('purple') || h === '#a855f7' || h === '#8b5cf6') {
    return COLOR_THEMES.find(t => t.key === 'violet') || COLOR_THEMES[0];
  }

  // Fallback to deterministic index from hex string
  const idx = hashStringToIndex(h, COLOR_THEMES.length);
  return COLOR_THEMES[idx];
}

/**
 * Intelligent icon resolver based on icon_name or semantic subject keywords.
 * Generalizes beyond PCMB to cover all academic, professional, and personal disciplines.
 */
export function resolveSubjectIcon(
  iconName?: string,
  subjectName?: string
): { icon: LucideIcon; name: string } {
  // Normalize deprecated special PCMB icon names to universal BookOpen
  if (
    iconName === 'Atom' ||
    iconName === 'FlaskConical' ||
    iconName === 'Dna' ||
    iconName === 'Binary'
  ) {
    return { icon: BookOpen, name: 'BookOpen' };
  }

  // 1. Direct Lucide icon name matching
  if (iconName && ACADEMIC_ICON_MAP[iconName]) {
    return { icon: ACADEMIC_ICON_MAP[iconName], name: iconName };
  }

  const s = (subjectName || '').toLowerCase().trim();

  // 2. Earth, Geography & Global Studies (check before physics to prevent "physical geography" matching "physic")
  if (s.includes('geograph') || s.includes('geo ') || s.includes('geology') || s.includes('earth') || s.includes('environ') || s.includes('climate') || s.includes('planet')) {
    return { icon: Globe, name: 'Globe' };
  }

  // 3. PCMB subjects (Physics, Chemistry, Mathematics, Biology) do not use special symbols;
  // they use the standard universal academic BookOpen icon.
  if (
    s.includes('physic') ||
    s.includes('chem') ||
    s.includes('bio') ||
    s.includes('math')
  ) {
    return { icon: BookOpen, name: 'BookOpen' };
  }

  // 5. Technology, Coding & Computer Science
  if (s.includes('code') || s.includes('program') || s.includes('comput') || s.includes('software') || s.includes('python') || s.includes('web') || s.includes('algo') || s.includes('data struct')) {
    return { icon: Code, name: 'Code' };
  }
  if (s.includes('tech') || s.includes('electr') || s.includes('hardware') || s.includes('cpu') || s.includes('chip')) {
    return { icon: Cpu, name: 'Cpu' };
  }

  // 6. History, Polity & Law
  if (s.includes('histor') || s.includes('civiliz') || s.includes('ancient') || s.includes('polity') || s.includes('civic') || s.includes('govern')) {
    return { icon: Landmark, name: 'Landmark' };
  }
  if (s.includes('law') || s.includes('legal') || s.includes('constitut') || s.includes('justice') || s.includes('juris') || s.includes('court') || s.includes('ethic')) {
    return { icon: Scale, name: 'Scale' };
  }

  // 7. Commerce, Economics & Business
  if (s.includes('econ') || s.includes('financ') || s.includes('commerc') || s.includes('account') || s.includes('trade') || s.includes('market') || s.includes('busi')) {
    return { icon: TrendingUp, name: 'TrendingUp' };
  }

  // 8. Literature, Reading & Humanities
  if (s.includes('lit') || s.includes('book') || s.includes('essay') || s.includes('poet') || s.includes('novel') || s.includes('read')) {
    return { icon: BookOpen, name: 'BookOpen' };
  }

  // 9. Languages & Linguistics
  if (s.includes('lang') || s.includes('english') || s.includes('hindi') || s.includes('french') || s.includes('german') || s.includes('spanish') || s.includes('sanskrit') || s.includes('linguist')) {
    return { icon: Languages, name: 'Languages' };
  }

  // 10. Philosophy, Logic & Psychology
  if (s.includes('philos') || s.includes('psych') || s.includes('logic') || s.includes('think') || s.includes('mind') || s.includes('reason')) {
    return { icon: Lightbulb, name: 'Lightbulb' };
  }

  // 11. Arts, Music & Creative
  if (s.includes('music') || s.includes('sound') || s.includes('audio') || s.includes('song') || s.includes('harmon')) {
    return { icon: Music, name: 'Music' };
  }
  if (s.includes('art') || s.includes('design') || s.includes('paint') || s.includes('draw')) {
    return { icon: PenTool, name: 'PenTool' };
  }

  // 12. Exam Preparation & Rapid Recall
  if (s.includes('exam') || s.includes('sprint') || s.includes('rapid') || s.includes('quick') || s.includes('test')) {
    return { icon: Zap, name: 'Zap' };
  }
  if (s.includes('high yield') || s.includes('summary') || s.includes('key')) {
    return { icon: Sparkles, name: 'Sparkles' };
  }

  // 13. Universal Academic / Scholar Fallback
  // GraduationCap represents all scholarship, universal learning, and study notes
  return { icon: GraduationCap, name: 'GraduationCap' };
}

/**
 * Master visual resolver for any subject or audio note item.
 * Seamlessly handles user-defined custom subjects, system defaults, or arbitrary names.
 */
export function resolveSubjectVisual(options: {
  subjectId?: string;
  subjectName?: string;
  iconName?: string;
  colorHex?: string;
  subjects?: Subject[];
}): SubjectVisualTheme {
  const { subjectId, subjectName, iconName, colorHex, subjects } = options;

  // 1. Look up existing subject object if available
  let matchedSubject: Subject | undefined;
  if (subjects && subjects.length > 0) {
    if (subjectId) {
      matchedSubject = subjects.find(s => s.id === subjectId);
    }
    if (!matchedSubject && subjectName) {
      const lower = subjectName.toLowerCase().trim();
      matchedSubject = subjects.find(
        s => s.name.toLowerCase().trim() === lower ||
             lower.includes(s.name.toLowerCase().trim()) ||
             s.name.toLowerCase().trim().includes(lower)
      );
    }
  }

  const effectiveName = matchedSubject?.name || subjectName || 'General';
  const effectiveIconName = iconName || matchedSubject?.icon_name;
  const effectiveHex = colorHex || matchedSubject?.color_hex;

  // 2. Resolve Icon
  const { icon, name: resolvedIconName } = resolveSubjectIcon(effectiveIconName, effectiveName);

  // 3. Resolve Theme (by hex or deterministic hash from name)
  let theme: typeof COLOR_THEMES[number];
  if (effectiveHex) {
    theme = getThemeByHex(effectiveHex);
  } else {
    const idx = hashStringToIndex(effectiveName, COLOR_THEMES.length);
    theme = COLOR_THEMES[idx];
  }

  // 4. Generate Monogram
  const monogram = getSubjectMonogram(effectiveName);

  return {
    icon,
    iconName: resolvedIconName,
    label: effectiveName,
    monogram,
    colorHex: theme.hex,
    bg: theme.bg,
    badgeBg: theme.badgeBg,
    border: theme.border,
    cardBg: theme.cardBg,
    activeRing: theme.activeRing,
    gradient: theme.gradient,
    discShadow: theme.discShadow,
    glow: theme.glow,
  };
}
