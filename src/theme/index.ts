export interface ThemeColors {
  background: string;
  card: string;
  primary: string;
  primaryDark: string;
  primaryMuted: string;
  matcha: string;
  matchaDark: string;
  cream: string;
  blush: string;
  text: string;
  textMuted: string;
  border: string;
  gold: string;
  goldMuted: string;
  success: string;
  successMuted: string;
  danger: string;
  dangerMuted: string;
  overlay: string;
  dark: string;
}

export const lightColors: ThemeColors = {
  background: '#FFFBF5',
  card: '#FFFFFF',
  primary: '#EE4C6A',
  primaryDark: '#D63A57',
  primaryMuted: '#FBE4E8',
  matcha: '#8CAA7B',
  matchaDark: '#5F7A52',
  cream: '#F6E9D8',
  blush: '#F3D6D0',
  text: '#241F1B',
  textMuted: '#8A8078',
  border: '#EDE4D6',
  gold: '#F5A623',
  goldMuted: '#FCEFD4',
  success: '#2E9E5B',
  successMuted: '#E3F2E9',
  danger: '#C0392B',
  dangerMuted: '#F8D9D4',
  overlay: 'rgba(0,0,0,0.45)',
  dark: '#141110',
};

export const darkColors: ThemeColors = {
  background: '#0B0A0C',
  card: '#1C191B',
  primary: '#EE4C6A',
  primaryDark: '#D63A57',
  primaryMuted: 'rgba(238,76,106,0.16)',
  matcha: '#8CAA7B',
  matchaDark: '#5F7A52',
  cream: '#2A2521',
  blush: 'rgba(238,76,106,0.12)',
  text: '#F7F4F2',
  textMuted: '#9C948E',
  border: '#2B2729',
  gold: '#F5A623',
  goldMuted: 'rgba(245,166,35,0.18)',
  success: '#2E9E5B',
  successMuted: 'rgba(46,158,91,0.18)',
  danger: '#FF6B6B',
  dangerMuted: 'rgba(255,107,107,0.18)',
  overlay: 'rgba(0,0,0,0.55)',
  dark: '#000000',
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
