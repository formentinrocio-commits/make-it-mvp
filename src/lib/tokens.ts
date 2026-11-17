// Tokens del design system Make It (project/ds/make-it/tokens.json)
export const INK = '#11242B';
export const PAPER = '#F5F5F5';
export const PANEL = '#EDEFF0';
export const N = { 700: '#36474D', 600: '#526166', 500: '#657176', 400: '#899397', 200: '#C4C9CB', 100: '#E3E6E7', 50: '#F0F2F2' };
export type GoalColor = 'sky' | 'lime' | 'violet' | 'orange';
export const GOAL: Record<GoalColor, { bg: string; data: string; soft: string }> = {
  sky: { bg: '#8CCDEB', data: '#236689', soft: '#D6EEF9' },
  lime: { bg: '#D9FC62', data: '#658709', soft: '#EEFDC4' },
  violet: { bg: '#BDA8FC', data: '#5A33CE', soft: '#E4DCFC' },
  orange: { bg: '#FF9550', data: '#A84505', soft: '#FFD9C2' },
};
export const COLOR_ORDER: GoalColor[] = ['sky', 'lime', 'violet', 'orange'];
export const SUCCESS = { bg: '#E8F4EC', fg: '#2F6B45' };
export const DANGER = { bg: '#FCE9E6', fg: '#963B33' };
export const stripes = (c = INK, w = 3, p = 7, bg = '#FFFFFF') => `repeating-linear-gradient(150deg, ${c} 0 ${w}px, ${bg} ${w}px ${p}px)`;
export const EASE = { out: 'cubic-bezier(.22,1,.36,1)', inout: 'cubic-bezier(.65,0,.35,1)', spring: 'cubic-bezier(.34,1.4,.64,1)', zoom: 'cubic-bezier(.32,.72,0,1)' };
export const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
