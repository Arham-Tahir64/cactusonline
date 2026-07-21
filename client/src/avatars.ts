import type { AvatarId } from '@engine/types';

export interface AvatarProfile {
  id: AvatarId;
  name: string;
  glyph: string;
  accent: string;
}

export const AVATARS: AvatarProfile[] = [
  { id: 'ranger', name: 'Ranger', glyph: '🤠', accent: '#e4a62c' },
  { id: 'maverick', name: 'Maverick', glyph: '🧔', accent: '#58aee8' },
  { id: 'sage', name: 'Sage', glyph: '👩🏽', accent: '#ef718c' },
  { id: 'prospector', name: 'Prospector', glyph: '🧓', accent: '#d18c45' },
  { id: 'vaquera', name: 'Vaquera', glyph: '👩🏻', accent: '#a96ad8' },
  { id: 'outlaw', name: 'Outlaw', glyph: '🥷', accent: '#dc5656' },
  { id: 'botanist', name: 'Botanist', glyph: '👩🏾‍🦱', accent: '#74b35d' },
  { id: 'drifter', name: 'Drifter', glyph: '🧑🏼', accent: '#d7c068' },
];

export const avatarById = (id: AvatarId) => AVATARS.find((avatar) => avatar.id === id)!;
