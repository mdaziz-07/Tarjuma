import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, Repeat, Search, Pause, Play } from 'lucide-react';
import SurahRow from '../../components/SurahRow/SurahRow';
import usePlayerStore from '../../stores/playerStore';
import usePreferencesStore from '../../stores/preferencesStore';
import surahs from '../../data/surahs.json';
import paras from '../../data/paras.json';
import './QueueSheet.css';

export default function QueueSheet() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    isPlaying,
    togglePlay,
    currentSurahId, 
    currentJuzId, 
    currentMode, 
    setCurrentSurah, 
    setCurrentJuz, 
    play, 
    isShuffled, 
    toggleShuffle, 
    repeatMode, 
    cycleRepeat,
    activeQueue,
    activeQueueSource,
    clearActiveQueue,
  } = usePlayerStore();

  const {
    favoriteSurahIds = [],
    favoriteJuzIds = [],
    toggleFavoriteSurah,
    toggleFavoriteJuz
  } = usePreferencesStore();

  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = React.useRef(0);
  const touchStartX = React.useRef(0);
  const isSwipeDown = React.useRef(false);

  const handleTouchStart = (e) => {
    const queueList = document.querySelector('.queue-list');
    if (queueList && queueList.scrollTop > 0) {
      return;
    }
    
    const target = e.target;
    if (target.closest('input') || target.closest('button')) {
      return;
    }
    
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
    isSwipeDown.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - touchStartY.current;
    const diffX = currentX - touchStartX.current;
    
    if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX)) {
      setDragY(diffY);
      isSwipeDown.current = true;
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (isSwipeDown.current && dragY > 100) {
      navigate(-1);
    } else {
      setDragY(0);
    }
    setIsDragging(false);
    touchStartY.current = 0;
    touchStartX.current = 0;
    isSwipeDown.current = false;
  };
  
  const isJuzMode = currentMode === 2 || currentMode === 3;
  
  // Use the active queue (mix/playlist subset) if set, otherwise full list
  const hasActiveQueue = activeQueue && activeQueue.length > 0;
  
  const filteredSurahs = searchQuery 
    ? surahs.filter(s => 
        s.name_transliteration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name_english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name_arabic.includes(searchQuery)
      )
    : surahs;

  const filteredParas = searchQuery
    ? paras.filter(p =>
        p.name_transliteration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.surah_range.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name_arabic.includes(searchQuery)
      )
    : paras;
  
  // Active queue items filtered by search
  const filteredActiveQueue = hasActiveQueue
    ? activeQueue.filter(item =>
        !searchQuery ||
        (item.name_transliteration || item.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  const handleSurahClick = (surah) => {
    setCurrentSurah(surah.id);
    play();
  };

  const handleParaClick = (para) => {
    setCurrentJuz(para.id);
    play();
  };
  
  const handleActiveQueueItemClick = (item) => {
    if (item.isPara) {
      setCurrentJuz(item.id);
    } else {
      setCurrentSurah(item.id);
    }
    play();
  };
  
  return (
    <div 
      className="queue-screen" 
      id="queue-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : 'none',
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform'
      }}
    >
      <div className="drag-handle" onClick={() => navigate(-1)} />
      
      {/* Header */}
      <div className="queue-header">
        <h2 className="queue-title">Continue playing</h2>
        <div className="queue-controls">
          <button 
            className={`queue-ctrl-btn ${isShuffled ? 'active' : ''}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle size={20} />
          </button>
          <button 
            className={`queue-ctrl-btn ${repeatMode !== 'none' ? 'active' : ''}`}
            onClick={cycleRepeat}
            aria-label="Repeat"
          >
            <Repeat size={20} />
            {repeatMode === 'one' && <span className="repeat-one-badge">1</span>}
          </button>
        </div>
      </div>
      
      {/* Search */}
      <div className="search-bar" style={{ margin: '0 0 12px' }}>
        <Search size={18} />
        <input 
          type="text" 
          placeholder={hasActiveQueue ? `Search in ${activeQueueSource || 'Queue'}` : (isJuzMode ? "Search Para" : "Search Surah")} 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* Active queue source header (shown when playing from mix/playlist) */}
      {hasActiveQueue && (
        <div className="queue-source-bar">
          <span className="queue-source-label">▶ {activeQueueSource || 'Queue'}</span>
          <button className="queue-source-clear-btn" onClick={clearActiveQueue}>
            Show All
          </button>
        </div>
      )}
      
      {/* List */}
      <div className="queue-list">
        {hasActiveQueue ? (
          // Show only the mix/playlist items
          filteredActiveQueue.map((item, idx) => {
            const isCurrentlyPlaying = item.isPara
              ? item.id === currentJuzId
              : item.id === currentSurahId;
            return (
              <div key={`aq-${idx}-${item.id}`} className="queue-row-wrap">
                <SurahRow 
                  surah={{
                    id: item.id,
                    name_transliteration: item.name_transliteration || item.title,
                    name_arabic: item.name_arabic || '',
                    name_english: item.isPara ? `Para ${item.id}` : `Surah ${item.id}`,
                  }}
                  isPlaying={isCurrentlyPlaying}
                  isFavorite={item.isPara ? favoriteJuzIds.includes(item.id) : favoriteSurahIds.includes(item.id)}
                  onToggleFavorite={item.isPara ? toggleFavoriteJuz : toggleFavoriteSurah}
                  onClick={() => handleActiveQueueItemClick(item)}
                  compact
                />
                {isCurrentlyPlaying && (
                  <button 
                    className="queue-pause-btn glass-pill" 
                    style={{ padding: '8px', borderRadius: '50%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                  >
                    {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                  </button>
                )}
              </div>
            );
          })
        ) : isJuzMode ? (
          filteredParas.map(para => (
            <div key={para.id} className="queue-row-wrap">
              <SurahRow 
                surah={{
                  id: para.id,
                  name_transliteration: para.name_transliteration,
                  name_arabic: para.name_arabic,
                  name_english: para.surah_range
                }}
                isPlaying={para.id === currentJuzId}
                isFavorite={favoriteJuzIds.includes(para.id)}
                onToggleFavorite={toggleFavoriteJuz}
                onClick={() => handleParaClick(para)}
                compact
              />
              {para.id === currentJuzId && (
                <button 
                  className="queue-pause-btn glass-pill" 
                  style={{ padding: '8px', borderRadius: '50%' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                </button>
              )}
            </div>
          ))
        ) : (
          filteredSurahs.map(surah => (
            <div key={surah.id} className="queue-row-wrap">
              <SurahRow 
                surah={surah}
                isPlaying={surah.id === currentSurahId}
                isFavorite={favoriteSurahIds.includes(surah.id)}
                onToggleFavorite={toggleFavoriteSurah}
                onClick={handleSurahClick}
                compact
              />
              {surah.id === currentSurahId && (
                <button 
                  className="queue-pause-btn glass-pill" 
                  style={{ padding: '8px', borderRadius: '50%' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
