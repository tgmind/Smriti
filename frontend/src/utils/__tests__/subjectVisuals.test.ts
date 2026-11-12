import { describe, it, expect } from 'vitest';
import {
  resolveSubjectIcon,
  resolveSubjectVisual,
  getSubjectMonogram,
  getThemeByHex,
} from '../subjectVisuals';
import {
  Code,
  Landmark,
  Scale,
  TrendingUp,
  Globe,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Subject } from '../../types';

describe('Subject Visuals Utility - Generalization beyond PCMB', () => {
  it('removes special symbol and icon for PCMB subjects (uses universal BookOpen instead of Atom/Flask/Dna/Binary)', () => {
    // Semantic name resolution for PCMB subjects returns universal BookOpen
    expect(resolveSubjectIcon(undefined, 'Physics').icon).toBe(BookOpen);
    expect(resolveSubjectIcon(undefined, 'Chemistry').icon).toBe(BookOpen);
    expect(resolveSubjectIcon(undefined, 'Biology').icon).toBe(BookOpen);
    expect(resolveSubjectIcon(undefined, 'Mathematics').icon).toBe(BookOpen);

    // Legacy icon_name identifiers ('Atom', 'FlaskConical', 'Dna', 'Binary') are normalized to BookOpen
    expect(resolveSubjectIcon('Atom', 'Physics').icon).toBe(BookOpen);
    expect(resolveSubjectIcon('FlaskConical', 'Chemistry').icon).toBe(BookOpen);
    expect(resolveSubjectIcon('Dna', 'Biology').icon).toBe(BookOpen);
    expect(resolveSubjectIcon('Binary', 'Mathematics').icon).toBe(BookOpen);
  });

  it('correctly resolves icons for non-PCMB generalized subjects', () => {
    // Humanities & Social Sciences
    expect(resolveSubjectIcon(undefined, 'World History').icon).toBe(Landmark);
    expect(resolveSubjectIcon(undefined, 'Constitutional Law').icon).toBe(Scale);
    expect(resolveSubjectIcon(undefined, 'Microeconomics').icon).toBe(TrendingUp);
    expect(resolveSubjectIcon(undefined, 'Physical Geography').icon).toBe(Globe);
    expect(resolveSubjectIcon(undefined, 'English Literature').icon).toBe(BookOpen);

    // Tech & Engineering
    expect(resolveSubjectIcon(undefined, 'Computer Science').icon).toBe(Code);
    expect(resolveSubjectIcon(undefined, 'Python Programming').icon).toBe(Code);

    // Fallback for unknown / generic subjects
    expect(resolveSubjectIcon(undefined, 'Random Miscellaneous Notes').icon).toBe(GraduationCap);
  });

  it('prioritizes explicit iconName when provided', () => {
    expect(resolveSubjectIcon('Sparkles', 'Physics').icon).toBe(Sparkles);
    expect(resolveSubjectIcon('Landmark', 'Chemistry').icon).toBe(Landmark);
  });

  it('generates aesthetic 1-2 letter monograms', () => {
    expect(getSubjectMonogram('Physics')).toBe('PH');
    expect(getSubjectMonogram('Computer Science')).toBe('CS');
    expect(getSubjectMonogram('World History')).toBe('WH');
    expect(getSubjectMonogram('Economics')).toBe('EC');
    expect(getSubjectMonogram('Law')).toBe('LA');
    expect(getSubjectMonogram('')).toBe('SM');
  });

  it('resolves theme from color hex with graceful fallback', () => {
    const skyTheme = getThemeByHex('#38bdf8');
    expect(skyTheme.key).toBe('sky');

    const emeraldTheme = getThemeByHex('#10b981');
    expect(emeraldTheme.key).toBe('emerald');

    const amberTheme = getThemeByHex('#f59e0b');
    expect(amberTheme.key).toBe('amber');

    const purpleTheme = getThemeByHex('#a855f7');
    expect(purpleTheme.key).toBe('violet');
  });

  it('resolves subject visual from subjects collection', () => {
    const customSubjects: Subject[] = [
      {
        id: 'sub-law',
        name: 'Constitutional Law',
        icon_name: 'Scale',
        color_hex: '#6366f1',
        sort_order: 5,
      },
      {
        id: 'sub-econ',
        name: 'Macroeconomics',
        icon_name: 'TrendingUp',
        color_hex: '#10b981',
        sort_order: 6,
      },
    ];

    const lawVisual = resolveSubjectVisual({
      subjectId: 'sub-law',
      subjects: customSubjects,
    });

    expect(lawVisual.label).toBe('Constitutional Law');
    expect(lawVisual.icon).toBe(Scale);
    expect(lawVisual.monogram).toBe('CL');
    expect(lawVisual.colorHex).toBe('#4f46e5'); // Indigo hex

    const econVisual = resolveSubjectVisual({
      subjectName: 'Macroeconomics',
      subjects: customSubjects,
    });

    expect(econVisual.label).toBe('Macroeconomics');
    expect(econVisual.icon).toBe(TrendingUp);
    expect(econVisual.monogram).toBe('MA');
    expect(econVisual.colorHex).toBe('#10b981'); // Emerald hex
  });
});
