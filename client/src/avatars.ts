import type { AvatarId } from '@engine/types';
import rangerPortrait from './assets/avatars/ranger-bust.webp';
import maverickPortrait from './assets/avatars/maverick-bust.webp';
import sagePortrait from './assets/avatars/sage-bust.webp';
import prospectorPortrait from './assets/avatars/prospector-bust.webp';
import vaqueraPortrait from './assets/avatars/vaquera-bust.webp';
import outlawPortrait from './assets/avatars/outlaw-bust.webp';
import botanistPortrait from './assets/avatars/botanist-bust.webp';
import drifterPortrait from './assets/avatars/drifter-bust.webp';

export interface AvatarProfile {
  id: AvatarId;
  name: string;
  portrait: string;
  accent: string;
}

export const AVATARS: AvatarProfile[] = [
  { id: 'ranger', name: 'Ranger', portrait: rangerPortrait, accent: '#e4a62c' },
  { id: 'maverick', name: 'Maverick', portrait: maverickPortrait, accent: '#58aee8' },
  { id: 'sage', name: 'Sage', portrait: sagePortrait, accent: '#ef718c' },
  { id: 'prospector', name: 'Prospector', portrait: prospectorPortrait, accent: '#d18c45' },
  { id: 'vaquera', name: 'Vaquera', portrait: vaqueraPortrait, accent: '#a96ad8' },
  { id: 'outlaw', name: 'Outlaw', portrait: outlawPortrait, accent: '#dc5656' },
  { id: 'botanist', name: 'Botanist', portrait: botanistPortrait, accent: '#74b35d' },
  { id: 'drifter', name: 'Drifter', portrait: drifterPortrait, accent: '#d7c068' },
];

export const avatarById = (id: AvatarId) => AVATARS.find((avatar) => avatar.id === id)!;
