import { RatingScore, RevisionItem } from '../types';

/**
 * Calculates updated spaced repetition parameters using the transparent SM-2 algorithm.
 * 
 * Ratings:
 * 0 = Again (Failed recall; reset interval to 1 day)
 * 1 = Hard (Struggled recall; reset interval to 1 day)
 * 2 = Good (Successful recall; advance interval based on ease factor)
 * 3 = Easy (Immediate confident recall; bonus interval progression)
 */
export function calculateNextReview(
  item: Pick<RevisionItem, 'repetition_count' | 'interval_days' | 'ease_factor'>,
  rating: RatingScore,
  reviewDate: Date = new Date()
): {
  repetition_count: number;
  interval_days: number;
  ease_factor: number;
  next_review_due: string;
  status: 'learning' | 'review' | 'mastered';
} {
  let { repetition_count, interval_days, ease_factor } = item;

  // Ensure minimum valid baseline
  ease_factor = Math.max(1.3, ease_factor || 2.5);

  let nextInterval: number;
  let nextRepetitionCount: number;

  if (rating < 2) {
    // Again (0) or Hard (1) - Recall failed or lapsed
    nextRepetitionCount = 0;
    nextInterval = 1;
  } else {
    // Good (2) or Easy (3) - Recall successful
    if (repetition_count === 0) {
      nextInterval = rating === 3 ? 2 : 1;
    } else if (repetition_count === 1) {
      nextInterval = rating === 3 ? 4 : 3;
    } else {
      const bonus = rating === 3 ? 1.3 : 1.0;
      nextInterval = Math.max(1, Math.round(interval_days * ease_factor * bonus));
    }
    nextRepetitionCount = repetition_count + 1;
  }

  // Update Ease Factor: EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
  const delta = 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02);
  const nextEaseFactor = Math.max(1.3, Number((ease_factor + delta).toFixed(2)));

  // Calculate next review due date (YYYY-MM-DD)
  const dueDate = new Date(reviewDate);
  dueDate.setDate(dueDate.getDate() + nextInterval);
  const nextReviewDue = dueDate.toISOString().split('T')[0];

  // Determine educational status
  let status: 'learning' | 'review' | 'mastered' = 'learning';
  if (nextInterval >= 21) {
    status = 'mastered';
  } else if (nextRepetitionCount >= 2) {
    status = 'review';
  }

  return {
    repetition_count: nextRepetitionCount,
    interval_days: nextInterval,
    ease_factor: nextEaseFactor,
    next_review_due: nextReviewDue,
    status
  };
}

/**
 * Transparent completed-play rule evaluator.
 * Prevents gaming listening stats by requiring meaningful exposure.
 */
export function evaluateCompletedPlay(
  actualListeningSeconds: number,
  totalAudioSeconds: number,
  abnormalForwardSeeks: number = 0
): {
  isCompleted: boolean;
  completionPercentage: number;
  reason: string;
} {
  if (totalAudioSeconds <= 0) {
    return { isCompleted: false, completionPercentage: 0, reason: 'Invalid audio duration' };
  }

  // Deduct excessively large forward skips
  const netEffectiveSeconds = Math.max(0, actualListeningSeconds - abnormalForwardSeeks);
  const rawPercentage = (netEffectiveSeconds / totalAudioSeconds) * 100;
  const completionPercentage = Math.min(100, Number(rawPercentage.toFixed(1)));

  // Completed play requirements:
  // 1. Minimum 15 seconds listened (filters accidental clicks)
  // 2. Minimum 75% completion or total listening >= 90% of duration
  if (netEffectiveSeconds < 15 && totalAudioSeconds >= 20) {
    return {
      isCompleted: false,
      completionPercentage,
      reason: 'Listening duration was under the 15-second minimum threshold'
    };
  }

  if (completionPercentage >= 75 || netEffectiveSeconds >= totalAudioSeconds * 0.9) {
    return {
      isCompleted: true,
      completionPercentage,
      reason: 'Criteria met (>=75% listened)'
    };
  }

  return {
    isCompleted: false,
    completionPercentage,
    reason: `Incomplete: listened to ${completionPercentage}% (minimum 75% required)`
  };
}

/**
 * Format seconds into mm:ss or hh:mm:ss safely.
 * Strictly guards against non-finite values (Infinity, NaN) and negative numbers.
 */
export function formatDuration(seconds: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || isNaN(seconds) || seconds <= 0) {
    return '0:00';
  }
  const totalSecs = Math.round(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
