import type { AvatarId } from '@engine/types';
import rangerPortrait from './assets/avatars/ranger-bust.webp';
import rangerCutout from './assets/avatars/ranger.webp';
import maverickPortrait from './assets/avatars/maverick-bust.webp';
import maverickCutout from './assets/avatars/maverick.webp';
import sagePortrait from './assets/avatars/sage-bust.webp';
import sageCutout from './assets/avatars/sage.webp';
import prospectorPortrait from './assets/avatars/prospector-bust.webp';
import prospectorCutout from './assets/avatars/prospector.webp';
import vaqueraPortrait from './assets/avatars/vaquera-bust.webp';
import vaqueraCutout from './assets/avatars/vaquera.webp';
import outlawPortrait from './assets/avatars/outlaw-bust.webp';
import outlawCutout from './assets/avatars/outlaw.webp';
import botanistPortrait from './assets/avatars/botanist-bust.webp';
import botanistCutout from './assets/avatars/botanist.webp';
import drifterPortrait from './assets/avatars/drifter-bust.webp';
import drifterCutout from './assets/avatars/drifter.webp';

export interface AvatarProfile {
  id: AvatarId;
  name: string;
  portrait: string;
  cutout: string;
  accent: string;
}

export const AVATARS: AvatarProfile[] = [
  { id: 'ranger', name: 'Ranger', portrait: rangerPortrait, cutout: rangerCutout, accent: '#e4a62c' },
  { id: 'maverick', name: 'Maverick', portrait: maverickPortrait, cutout: maverickCutout, accent: '#58aee8' },
  { id: 'sage', name: 'Sage', portrait: sagePortrait, cutout: sageCutout, accent: '#ef718c' },
  { id: 'prospector', name: 'Prospector', portrait: prospectorPortrait, cutout: prospectorCutout, accent: '#d18c45' },
  { id: 'vaquera', name: 'Vaquera', portrait: vaqueraPortrait, cutout: vaqueraCutout, accent: '#a96ad8' },
  { id: 'outlaw', name: 'Outlaw', portrait: outlawPortrait, cutout: outlawCutout, accent: '#dc5656' },
  { id: 'botanist', name: 'Botanist', portrait: botanistPortrait, cutout: botanistCutout, accent: '#74b35d' },
  { id: 'drifter', name: 'Drifter', portrait: drifterPortrait, cutout: drifterCutout, accent: '#d7c068' },
];

export const avatarById = (id: AvatarId) => AVATARS.find((avatar) => avatar.id === id)!;
