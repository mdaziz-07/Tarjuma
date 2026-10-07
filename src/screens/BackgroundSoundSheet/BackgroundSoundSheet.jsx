import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Check, Search, CircleOff, CloudRain, Bird, Flame, Waves, Wind, Cat, Moon, 
  Droplets, Fish, Download, Bug, Palmtree, CloudLightning 
} from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import backgroundSounds from '../../data/backgroundSounds.json';
import './BackgroundSoundSheet.css';

const ICON_MAP = {
  'circle-off': CircleOff,
  'cloud-rain': CloudRain,
  'bird': Bird,
  'flame': Flame,
  'waves': Waves,
  'wind': Wind,
  'cat': Cat,
  'moon': Moon,
  'droplets': Droplets,
  'fish': Fish,
  'cricket': Bug,             // Use Bug for Crickets
  'wave-cove': Palmtree,      // Use Palmtree for Beach
  'cloud-lightning': CloudLightning,
};

export default function BackgroundSoundSheet() {
  const navigate = useNavigate();
  const { selectedBackgroundSound, setBackgroundSound } = usePlayerStore();
  const [selected, setSelected] = useState(selectedBackgroundSound);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadedIds, setDownloadedIds] = useState(['none']);
  const [downloadingId, setDownloadingId] = useState(null);

  // Check already cached sounds on mount
  useEffect(() => {
    async function checkCachedSounds() {
      try {
        const cache = await caches.open('background-sounds-cache');
        const list = ['none'];
        for (const s of backgroundSounds) {
          if (s.url) {
            const match = await cache.match(s.url);
            if (match && !list.includes(s.id)) {
              list.push(s.id);
            }
          }
        }
        setDownloadedIds(list);
      } catch (e) {
        console.warn('Failed to check Cache API:', e);
      }
    }
    checkCachedSounds();
  }, []);

  const filtered = searchQuery 
    ? backgroundSounds.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : backgroundSounds;
  
  const handleSelectSound = async (sound) => {
    if (sound.id === 'none' || sound.isPreinstalled || downloadedIds.includes(sound.id)) {
      setSelected(sound.id);
      return;
    }
    
    setDownloadingId(sound.id);
    try {
      const cache = await caches.open('background-sounds-cache');
      
      const isDev = import.meta.env.DEV;
      const isWeb = window.location.protocol.startsWith('http');
      const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform();
      
      let fetchUrl = sound.url;
      if (isDev && isWeb && !isCapacitor) {
        const r2Base = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-b64cd295d2a14b879e8858c441be6748.r2.dev';
        fetchUrl = sound.url.replace(`${r2Base}/background_sounds`, '/background-sounds-proxy');
      }
      
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Fetch failed');
      
      // Store in cache under the original sound.url key so the audio player can match it
      await cache.put(sound.url, response.clone());
      setDownloadedIds(prev => [...prev, sound.id]);
      setSelected(sound.id);
    } catch (err) {
      console.error('Failed to download sound:', err);
      alert('Failed to download background sound. Please check your internet connection.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirm = () => {
    setBackgroundSound(selected);
    navigate(-1);
  };
  
  return (
    <div className="bg-sound-screen" id="bg-sound-screen">
      {/* Header */}
      <div className="bg-sound-header">
        <button className="glass-pill bg-sound-close" onClick={() => navigate(-1)} style={{ padding: '10px' }}>
          <X size={18} />
        </button>
        <h2 className="bg-sound-title">Background sound</h2>
        <button className="glass-pill bg-sound-confirm" onClick={handleConfirm} style={{ padding: '10px' }}>
          <Check size={18} />
        </button>
      </div>
      
      {/* Search */}
      <div className="search-bar" style={{ margin: '0 20px 20px' }}>
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Search sounds..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* Sound Grid */}
      <div className="bg-sound-grid">
        {filtered.map(sound => {
          const Icon = ICON_MAP[sound.icon] || CircleOff;
          const isSelected = selected === sound.id;
          
          return (
            <button 
              key={sound.id}
              className={`bg-sound-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectSound(sound)}
              disabled={downloadingId !== null}
            >
              <div className="bg-sound-icon-wrap">
                <Icon size={28} />
                {isSelected && (
                  <div className="bg-sound-check">
                    <Check size={12} />
                  </div>
                )}
                {sound.isFree && sound.id !== 'none' && (
                  <div className="bg-sound-free-badge">Free</div>
                )}
                {downloadingId === sound.id ? (
                  <div className="bg-sound-download-badge downloading">
                    <span className="spinner-loader" />
                  </div>
                ) : (!sound.isPreinstalled && !downloadedIds.includes(sound.id)) && (
                  <div className="bg-sound-download-badge">
                    <Download size={12} />
                  </div>
                )}
              </div>
              <span className="bg-sound-label">{sound.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
