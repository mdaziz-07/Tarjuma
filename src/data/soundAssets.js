import rainMp3 from '../assets/sounds/rain.mp3';
import birdsMp3 from '../assets/sounds/birds.mp3';
import fireMp3 from '../assets/sounds/fire.mp3';
import wavesMp3 from '../assets/sounds/waves.mp3';
import cricketsMp3 from '../assets/sounds/crickets.mp3';
import owlMp3 from '../assets/sounds/owl.mp3';

export const localSoundAssetsMap = {
  rain: rainMp3,
  birds: birdsMp3,
  fire: fireMp3,
  waves: wavesMp3,
  crickets: cricketsMp3,
  owl: owlMp3,
};

export function getSoundUrl(soundOrId) {
  if (!soundOrId) return '';
  const id = typeof soundOrId === 'string' ? soundOrId : soundOrId.id;
  if (localSoundAssetsMap[id]) {
    return localSoundAssetsMap[id];
  }
  if (typeof soundOrId === 'object' && soundOrId.url) {
    return soundOrId.url;
  }
  return '';
}

export default localSoundAssetsMap;
