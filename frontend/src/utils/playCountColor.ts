/**
 * Four-Tier Play Count & Mastery Color System for Smriti.
 * 
 * Tiers:
 * 1. Less than 20 (< 20): Red ("Not Still Learned")
 * 2. Between 20 and 49 (20..49): Orange ("Building Memory")
 * 3. Between 50 and 70 (50..70): Yellow ("In Memory")
 * 4. Above 70 (> 70): Dark Green ("Learned by Heart")
 */

export type MasteryTier = 1 | 2 | 3 | 4;

export interface PlayCountTheme {
  tier: MasteryTier;
  label: 'Not Still Learned' | 'Building Memory' | 'In Memory' | 'Learned by Heart';
  colorName: 'red' | 'orange' | 'yellow' | 'green';
  hex: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  badgeClass: string;
  progressPercent: number; // 0..100 based on 70 mastery goal
}

export function getPlayCountTheme(playCount: number = 0): PlayCountTheme {
  const count = typeof playCount === 'number' && Number.isFinite(playCount) && playCount > 0
    ? Math.floor(playCount)
    : 0;

  // Percentage toward the 70+ mastery threshold
  const progressPercent = Math.min(100, Math.round((count / 71) * 100));

  if (count < 20) {
    return {
      tier: 1,
      label: 'Not Still Learned',
      colorName: 'red',
      hex: '#DC2626',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      ringColor: '#DC2626',
      badgeClass: 'text-red-600 bg-red-50 border-red-200',
      progressPercent
    };
  }

  if (count < 50) {
    return {
      tier: 2,
      label: 'Building Memory',
      colorName: 'orange',
      hex: '#EA580C',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      ringColor: '#EA580C',
      badgeClass: 'text-orange-600 bg-orange-50 border-orange-200',
      progressPercent
    };
  }

  if (count <= 70) {
    return {
      tier: 3,
      label: 'In Memory',
      colorName: 'yellow',
      hex: '#CA8A04',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      ringColor: '#CA8A04',
      badgeClass: 'text-yellow-600 bg-yellow-50 border-yellow-300',
      progressPercent
    };
  }

  return {
    tier: 4,
    label: 'Learned by Heart',
    colorName: 'green',
    hex: '#166534',
    textColor: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    ringColor: '#166534',
    badgeClass: 'text-green-800 bg-green-50 border-green-300',
    progressPercent: 100
  };
}

export function formatPlayCountBadge(playCount: number = 0): string {
  const count = typeof playCount === 'number' && Number.isFinite(playCount) && playCount > 0
    ? Math.floor(playCount)
    : 0;
  return `${count}×`;
}
