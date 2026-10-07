import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info, Heart, Play, ArrowLeft, MoreHorizontal, X } from 'lucide-react';
import SurahRow from '../../components/SurahRow/SurahRow';
import ProgressArc from '../../components/ProgressArc/ProgressArc';
import DailyTadabburCard from '../../components/DailyTadabbur/DailyTadabburCard';
import usePlayerStore from '../../stores/playerStore';
import usePreferencesStore from '../../stores/preferencesStore';
import useInsightsStore from '../../stores/insightsStore';
import surahs from '../../data/surahs.json';
import paras from '../../data/paras.json';
import scholars from '../../data/scholars.json';
import { getScholarPhotoUrl } from '../../data/scholarImages';
import CachedImage from '../../components/CachedImage/CachedImage';
import { getCuratedPlaylists, getActiveHeroBanner } from '../../services/adminService';
import './HomeScreen.css';

const DEFAULT_MIXES = [
  {
    id: 'favourites',
    title: 'Favourites Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Your bookmarked Surahs and Paras, compiled in one mix.',
    gradient: 'linear-gradient(135deg, #e0245e 0%, #f65288 100%)',
    shadowColor: 'rgba(224, 36, 94, 0.3)',
    isDynamic: true,
  },
  {
    id: 'focus',
    title: 'For Focus & Work Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Immersive audio crafted to help you enter a deep, uninterrupted flow.',
    gradient: 'linear-gradient(135deg, #d82e1b 0%, #f6941b 100%)',
    shadowColor: 'rgba(216, 46, 27, 0.3)',
    surahIds: [2, 3, 4, 5, 23, 25],
  },
  {
    id: 'sleep',
    title: 'For Sleep Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Soft recitations to calm your mind and drift into peaceful sleep.',
    gradient: 'linear-gradient(135deg, #1b68d6 0%, #a824e8 100%)',
    shadowColor: 'rgba(27, 104, 214, 0.3)',
    surahIds: [1, 32, 36, 55, 56, 67],
  },
  {
    id: 'study',
    title: 'For Study Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Recitations and ambient tones to help you stay clear, focused, and engaged.',
    gradient: 'linear-gradient(135deg, #0f864e 0%, #15c8a4 100%)',
    shadowColor: 'rgba(15, 134, 78, 0.3)',
    surahIds: [10, 18, 19, 20, 24, 31, 39],
  }
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const currentSurahId = usePlayerStore((state) => state.currentSurahId);
  const currentMode = usePlayerStore((state) => state.currentMode);
  const setCurrentSurah = usePlayerStore((state) => state.setCurrentSurah);
  const play = usePlayerStore((state) => state.play);
  const setMode = usePlayerStore((state) => state.setMode);
  const setCurrentJuz = usePlayerStore((state) => state.setCurrentJuz);
  const setActiveQueue = usePlayerStore((state) => state.setActiveQueue);
  const { lastSelectedScholarId, dailyGoalMinutes, setDailyGoalMinutes, favoriteSurahIds = [], favoriteJuzIds = [], toggleFavoriteSurah, toggleFavoriteJuz, madeForYouOrder = [] } = usePreferencesStore();
  const { getTodayTotal, seedMockData, sessions } = useInsightsStore();

  const [showFavouritesSheet, setShowFavouritesSheet] = useState(false);
  const [selectedMix, setSelectedMix] = useState(null);
  const [curatedMixes, setCuratedMixes] = useState(DEFAULT_MIXES);
  const [heroBanner, setHeroBanner] = useState(null);

  // Sort mixes according to saved madeForYouOrder
  const orderedMixes = useMemo(() => {
    if (!madeForYouOrder || madeForYouOrder.length === 0) return curatedMixes;
    const orderMap = new Map(madeForYouOrder.map((id, idx) => [id, idx]));
    return [...curatedMixes].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : (a.order !== undefined ? a.order : 999);
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : (b.order !== undefined ? b.order : 999);
      return idxA - idxB;
    });
  }, [curatedMixes, madeForYouOrder]);

  // Fetch dynamic playlists and active hero announcement banner
  useEffect(() => {
    const fetchRemoteHomeData = async () => {
      try {
        const [remotePlaylists, activeBanner] = await Promise.all([
          getCuratedPlaylists(),
          getActiveHeroBanner()
        ]);
        if (remotePlaylists && remotePlaylists.length > 0) {
          setCuratedMixes(remotePlaylists);
        }
        if (activeBanner) {
          setHeroBanner(activeBanner);
        }
      } catch (e) {
        console.warn('Failed to load remote home data:', e);
      }
    };
    fetchRemoteHomeData();
  }, []);

  const handleHeroBannerClick = (banner) => {
    if (!banner) return;
    if (banner.ctaAction === 'open_scholar') {
      navigate('/scholar-picker');
    } else if (banner.ctaAction === 'play_surah') {
      handleSurahClick(Number(banner.ctaTarget) || 18);
    } else if (banner.ctaAction === 'open_library') {
      navigate('/library');
    } else if (banner.ctaAction === 'external_url' && banner.ctaTarget) {
      window.open(banner.ctaTarget, '_blank');
    } else {
      navigate('/scholar-picker');
    }
  };


  const getMixItems = (mix) => {
    if (!mix) return [];
    if (mix.isDynamic) {
      const favSurahs = (favoriteSurahIds || []).map(id => {
        const s = surahs.find(item => item.id === id);
        return s ? {
          ...s,
          isPara: false,
          badge: String(s.id),
          meaning: s.name_english,
          key: `fav-surah-${s.id}`
        } : null;
      }).filter(Boolean);

      const favParas = (favoriteJuzIds || []).map(id => {
        const p = paras.find(item => item.id === id);
        return p ? {
          id: p.id,
          name_transliteration: p.name_transliteration,
          name_arabic: p.name_arabic,
          isPara: true,
          badge: `P${p.id}`,
          meaning: p.surah_range,
          key: `fav-para-${p.id}`
        } : null;
      }).filter(Boolean);

      return [...favSurahs, ...favParas];
    }

    return (mix.surahIds || []).map(id => {
      const s = surahs.find(item => item.id === id);
      return s ? {
        ...s,
        isPara: false,
        badge: String(s.id),
        meaning: s.name_english,
        key: `mix-surah-${id}`
      } : null;
    }).filter(Boolean);
  };

  const handlePlayMixItem = (item) => {
    if (item.isPara) {
      handleParaClick(item.id);
    } else {
      handleSurahClick(item.id);
    }
  };

  const handlePlayMix = (mix) => {
    const items = getMixItems(mix);
    if (items.length > 0) {
      // Set the active queue so QueueSheet shows only this mix's items
      const queueItems = items.map(item => ({
        id: item.id,
        isPara: !!item.isPara,
        title: item.name_transliteration,
        badge: item.badge,
        name_transliteration: item.name_transliteration,
        name_arabic: item.name_arabic,
      }));
      setActiveQueue(queueItems, mix.title);
      handlePlayMixItem(items[0]);
    }
  };

  const favSurahNames = favoriteSurahIds.map(id => {
    const s = surahs.find(item => item.id === id);
    return s ? s.name_transliteration : '';
  }).filter(Boolean);

  const favParaNames = favoriteJuzIds.map(id => {
    const p = paras.find(item => item.id === id);
    return p ? p.name_transliteration : '';
  }).filter(Boolean);

  const favoriteNames = [...favSurahNames, ...favParaNames];

  const scholar = scholars.find(s => s.id === lastSelectedScholarId) || scholars[0];
  const todaySeconds = getTodayTotal();
  const todayMinutes = Math.round(todaySeconds / 60);




  // Seed mock data on first load - Disabled to prevent random playback numbers on fresh installs
  // useEffect(() => {
  //   if (sessions.length === 0) {
  //     seedMockData();
  //   }
  // }, []);

  const handleSurahClick = (surahOrId) => {
    const id = typeof surahOrId === 'object' ? surahOrId.id : surahOrId;
    if (currentMode === 2 || currentMode === 3) {
      setMode(4);
    }
    setCurrentSurah(id);
    play();
    if (window.location.pathname !== '/player') {
      navigate('/player');
    }
  };

  const handleParaClick = (juzId) => {
    if (currentMode !== 2 && currentMode !== 3) {
      setMode(2);
    }
    setCurrentJuz(juzId);
    play();
    if (window.location.pathname !== '/player') {
      navigate('/player');
    }
  };

  // Split surahs into columns of 4 for horizontal scroll
  const col1 = surahs.slice(0, 4);
  const col2 = surahs.slice(4, 8);
  const col3 = surahs.slice(8, 12);
  const col4 = surahs.slice(12, 16);

  return (
    <div className="screen home-screen" id="home-screen">
      {/* Header */}
      <div className="screen-header home-header">
        <h1 className="text-title">Home</h1>
      </div>

      {/* Dynamic Remote Hero Announcement Banner */}
      {heroBanner && (
        <section className="section hero-banner-section" style={{ margin: '0 0 var(--space-md)' }}>
          <div
            className="home-hero-banner"
            style={{
              background: heroBanner.gradient || heroBanner.bgColor || '#1e3a8a',
              color: heroBanner.textColor || '#ffffff',
              borderRadius: '16px',
              padding: '18px 20px',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={() => handleHeroBannerClick(heroBanner)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}
              >
                {heroBanner.badge || 'ANNOUNCEMENT'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', opacity: 0.9 }}>
                {heroBanner.ctaText || 'Learn More'} →
              </span>
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: '700' }}>{heroBanner.title}</h3>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9, lineHeight: 1.4 }}>{heroBanner.subtitle}</p>
          </div>
        </section>
      )}

      {/* Scholar Card */}
      <section className="section scholar-section" onClick={() => navigate('/scholar-picker')}>
        <div className="scholar-home-card">
          <div className="scholar-home-photo">
            {getScholarPhotoUrl(scholar) ? (
              <CachedImage
                src={getScholarPhotoUrl(scholar)}
                alt={scholar.name_transliteration}
                className="scholar-home-photo-img"
                style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }}
              />
            ) : (
              <div className="scholar-photo-placeholder large">
                {scholar.name_transliteration.charAt(0)}
              </div>
            )}
          </div>
          <div className="scholar-home-info">
            <span className="text-label">Last Selected</span>
            <div className="scholar-home-name">
              <span className="text-card-title">{scholar.name_transliteration}</span>
              <ChevronRight size={20} color="var(--color-muted)" />
            </div>
            <div className="scholar-home-meta">
              <Info size={14} color="var(--color-muted)" />
              <span className="text-secondary">{scholar.recording_type === 'FULL_QURAN' ? 'Full Quran' : 'Selected Surahs'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Browse Surahs */}
      <section className="section">
        <h2 className="section-title" onClick={() => navigate('/queue')} style={{ cursor: 'pointer' }}>
          Browse All Surahs <ChevronRight size={18} className="chevron" />
        </h2>
        <div className="h-scroll surah-scroll">
          <div className="surah-column">
            {col1.map(surah => (
              <SurahRow
                key={surah.id}
                surah={surah}
                isPlaying={surah.id === currentSurahId}
                isFavorite={favoriteSurahIds.includes(surah.id)}
                onToggleFavorite={toggleFavoriteSurah}
                onClick={handleSurahClick}
              />
            ))}
          </div>
          <div className="surah-column">
            {col2.map(surah => (
              <SurahRow
                key={surah.id}
                surah={surah}
                isPlaying={surah.id === currentSurahId}
                isFavorite={favoriteSurahIds.includes(surah.id)}
                onToggleFavorite={toggleFavoriteSurah}
                onClick={handleSurahClick}
              />
            ))}
          </div>
          <div className="surah-column">
            {col3.map(surah => (
              <SurahRow
                key={surah.id}
                surah={surah}
                isPlaying={surah.id === currentSurahId}
                isFavorite={favoriteSurahIds.includes(surah.id)}
                onToggleFavorite={toggleFavoriteSurah}
                onClick={handleSurahClick}
              />
            ))}
          </div>
          <div className="surah-column">
            {col4.map(surah => (
              <SurahRow
                key={surah.id}
                surah={surah}
                isPlaying={surah.id === currentSurahId}
                isFavorite={favoriteSurahIds.includes(surah.id)}
                onToggleFavorite={toggleFavoriteSurah}
                onClick={handleSurahClick}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Made For You - Dynamic Curated Playlists */}
      <section className="section">
        <div className="mfy-section-header">
          <h2 className="section-title" style={{ margin: 0 }}>Made For You</h2>
          <button
            className="mfy-show-all-btn glass-pill"
            onClick={() => navigate('/made-for-you')}
            aria-label="Show all Made For You cards"
          >
            <span>Show all</span>
            <ChevronRight size={13} />
          </button>
        </div>
        <div className="h-scroll">
          {orderedMixes.map((mix) => {
            const mixSurahNames = mix.isDynamic
              ? (favoriteNames.length > 0 ? favoriteNames.join(', ') : 'No bookmarks yet')
              : (mix.surahIds || []).map(id => {
                const s = surahs.find(item => item.id === id);
                return s ? s.name_transliteration : '';
              }).filter(Boolean).slice(0, 4).join(', ');

            const cardClass = `made-for-you-card ${mix.id ? `${mix.id}-card` : ''}`;
            const cardBg = mix.gradient || (
              mix.id === 'favourites' ? 'linear-gradient(135deg, #e0245e 0%, #f65288 100%)' :
                mix.id === 'focus' ? 'linear-gradient(135deg, #d82e1b 0%, #f6941b 100%)' :
                  mix.id === 'sleep' ? 'linear-gradient(135deg, #1b68d6 0%, #a824e8 100%)' :
                    mix.id === 'study' ? 'linear-gradient(135deg, #0f864e 0%, #15c8a4 100%)' :
                      mix.solidColor || 'linear-gradient(135deg, #2C2C2E 0%, #1C1C1E 100%)'
            );

            return (
              <div
                key={mix.id}
                className={cardClass}
                style={{
                  background: cardBg
                }}
                onClick={() => setSelectedMix(mix)}
              >
                <div className="mfy-content">
                  <h3 className="mfy-title">{mix.title}</h3>
                </div>
                <div className="mfy-footer">
                  <span>{mix.isDynamic ? 'Your Bookmarks' : (mix.subtitle || scholar.name_transliteration)}</span>
                  <span className="mfy-surahs">
                    {mixSurahNames}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mix Detail Overlay - portal so it escapes the scrollable/transformed home screen */}
      {selectedMix && ReactDOM.createPortal(
        <div className="mix-detail-overlay">
          {/* Header area with custom gradient */}
          <div
            className="mix-detail-header"
            style={{
              background: selectedMix.gradient || (
                selectedMix.id === 'favourites' ? 'linear-gradient(135deg, #e0245e 0%, #f65288 100%)' :
                  selectedMix.id === 'focus' ? 'linear-gradient(135deg, #d82e1b 0%, #f6941b 100%)' :
                    selectedMix.id === 'sleep' ? 'linear-gradient(135deg, #1b68d6 0%, #a824e8 100%)' :
                      selectedMix.id === 'study' ? 'linear-gradient(135deg, #0f864e 0%, #15c8a4 100%)' :
                        selectedMix.solidColor || 'linear-gradient(135deg, #2C2C2E 0%, #1C1C1E 100%)'
              )
            }}
          >
            <button className="mix-detail-back-btn" onClick={() => setSelectedMix(null)} aria-label="Back">
              <ArrowLeft size={24} strokeWidth={2.4} color="white" />
            </button>

            <div className="mix-detail-header-content">
              <h2 className="mix-detail-title">{selectedMix.title}</h2>
              <p className="mix-detail-subtitle">
                {selectedMix.subtitle} <span className="mix-detail-creator">{selectedMix.creator}</span>
              </p>

              {/* Liquid Glass Play Button */}
              <button className="mix-detail-play-btn" onClick={() => handlePlayMix(selectedMix)}>
                <Play size={18} fill="white" color="white" />
                <span>Play</span>
              </button>

              <p className="mix-detail-description">{selectedMix.description}</p>
            </div>
          </div>

          {/* List of items */}
          <div className="mix-detail-list">
            {getMixItems(selectedMix).map((item) => (
              <div key={item.key || item.id} className="mix-detail-row" onClick={() => {
                // Set active queue to all items in this mix
                const allItems = getMixItems(selectedMix);
                const queueItems = allItems.map(i => ({
                  id: i.id,
                  isPara: !!i.isPara,
                  title: i.name_transliteration,
                  badge: i.badge,
                  name_transliteration: i.name_transliteration,
                  name_arabic: i.name_arabic,
                }));
                setActiveQueue(queueItems, selectedMix.title);
                handlePlayMixItem(item);
                setSelectedMix(null);
              }}>
                <div className="mix-detail-badge">
                  {item.badge}
                </div>
                <div className="mix-detail-row-info">
                  <span className="mix-detail-row-title">
                    {item.name_transliteration} <span className="mix-detail-row-arabic">({item.name_arabic})</span>
                  </span>
                  <span className="mix-detail-row-meaning">{item.meaning}</span>
                </div>
                <button className="mix-detail-more-btn" onClick={(e) => { e.stopPropagation(); }}>
                  <MoreHorizontal size={20} color="var(--color-muted)" />
                </button>
              </div>
            ))}

            {getMixItems(selectedMix).length === 0 && (
              <div className="mix-detail-empty">
                <Heart size={48} color="rgba(255, 255, 255, 0.15)" style={{ marginBottom: '12px' }} />
                <p>No bookmarked Surahs or Paras yet.</p>
              </div>
            )}
          </div>
        </div>
        , document.body)}

      {/* Recitation Goals */}
      <section className="section goals-section">
        <h2 className="section-title" style={{ justifyContent: 'center' }}>Recitation Goals</h2>
        <p className="goals-subtitle">Set a daily goal and make listening to Quran a habit.</p>
        <ProgressArc currentMinutes={todayMinutes} goalMinutes={dailyGoalMinutes} />
      </section>

      {/* Daily Tadabbur (Audio Reflection) */}
      <section className="section tadabbur-section">
        <h2 className="section-title" style={{ justifyContent: 'center' }}>Daily Tadabbur</h2>
        <p className="tadabbur-section-subtitle">A daily verse with translation and reflection to deepen your connection with the Quran.</p>
        <DailyTadabburCard />
      </section>
    </div>
  );
}
