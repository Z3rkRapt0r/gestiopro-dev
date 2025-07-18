
// Utility functions for punctuality color management

export interface PunctualityThresholds {
  excellent: number; // >= 90%
  good: number; // >= 70%
}

export const PUNCTUALITY_THRESHOLDS: PunctualityThresholds = {
  excellent: 90,
  good: 70,
};

export const PUNCTUALITY_COLORS = {
  excellent: {
    primary: '#10b981', // emerald-500
    light: '#d1fae5', // emerald-100
    gradient: 'from-emerald-400 to-emerald-600',
  },
  good: {
    primary: '#f59e0b', // amber-500
    light: '#fef3c7', // amber-100
    gradient: 'from-amber-400 to-amber-600',
  },
  critical: {
    primary: '#ef4444', // red-500
    light: '#fee2e2', // red-100
    gradient: 'from-red-400 to-red-600',
  },
} as const;

export type PunctualityLevel = 'excellent' | 'good' | 'critical';

export const getPunctualityLevel = (percentage: number): PunctualityLevel => {
  if (percentage >= PUNCTUALITY_THRESHOLDS.excellent) {
    return 'excellent';
  } else if (percentage >= PUNCTUALITY_THRESHOLDS.good) {
    return 'good';
  } else {
    return 'critical';
  }
};

export const getPunctualityColor = (percentage: number): string => {
  const level = getPunctualityLevel(percentage);
  return PUNCTUALITY_COLORS[level].primary;
};

export const getPunctualityStatus = (percentage: number): string => {
  const level = getPunctualityLevel(percentage);
  
  switch (level) {
    case 'excellent':
      return 'Eccellente';
    case 'good':
      return 'Buono';
    case 'critical':
      return 'Critico';
    default:
      return 'Non definito';
  }
};

export const getPunctualityGradientId = (percentage: number): string => {
  const level = getPunctualityLevel(percentage);
  return `punctualityGradient-${level}`;
};
