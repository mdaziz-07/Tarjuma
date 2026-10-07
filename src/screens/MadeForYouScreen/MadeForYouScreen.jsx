import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GripVertical, Play, Pause, Heart, RotateCcw, MoreHorizontal } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import usePreferencesStore from '../../stores/preferencesStore';
import surahs from '../../data/surahs.json';
import paras from '../../data/paras.json';
import scholars from '../../data/scholars.json';
import WaveformBars from '../../components/WaveformBars/WaveformBars';
import { getCuratedPlaylists, DEFAULT_CURATED_PLAYLISTS } from '../../services/adminService';
import './MadeForYouScreen.css';

export default function MadeForYouScreen() {
  const navigate = useNavigate();
  const { 
    currentSurahId, 
    currentJuzId, 
    isPlaying, 
    play, 
    togglePlay, 
    setActiveQueue, 
    activeQueueSource, 
    currentScholarId 
  } = usePlayerStore();

  const { 
    madeForYouOrder = [], 
    setMadeForYouOrder, 
    favoriteSurahIds = [], 
    favoriteJuzIds = [],
    lastSelectedScholarId 
  } = usePreferencesStore();

  const [mixes, setMixes] = useState(DEFAULT_CURATED_PLAYLISTS);
  const [selectedMix, setSelectedMix] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // ─── Drag State ────────────────────────────────────────────────
  const [dragState, setDragState] = useState({
    active: false,
    dragIndex: -1,       // index of the card being dragged
    overIndex: -1,       // index the dragged card is currently hovering over
    startY: 0,           // pointer Y at drag start
    currentY: 0,         // current pointer Y
    cardHeight: 0,       // measured card height + gap
  });
  const cardRefs = useRef([]);
  const listRef = useRef(null);
  const dragCloneRef = useRef(null);
  const scrollAnimRef = useRef(null);

  // Active scholar for display fallback
  const scholar = scholars.find(s => s.id === (currentScholarId || lastSelectedScholarId || 'scholar-1')) || scholars[0];

  // Fetch remote playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const remote = await getCuratedPlaylists();
        if (remote && Array.isArray(remote) && remote.length > 0) {
          setMixes(remote);
        }
      } catch (e) {
        console.warn('Failed to load curated playlists:', e);
      }
    };
    fetchPlaylists();
  }, []);

  // Sort mixes according to saved madeForYouOrder
  const orderedMixes = useMemo(() => {
    if (!madeForYouOrder || madeForYouOrder.length === 0) return mixes;
    const orderMap = new Map(madeForYouOrder.map((id, idx) => [id, idx]));
    return [...mixes].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : (a.order !== undefined ? a.order : 999);
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : (b.order !== undefined ? b.order : 999);
      return idxA - idxB;
    });
  }, [mixes, madeForYouOrder]);

  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2000);
  }, []);

  // Reorder helper
  const updateOrder = (newItems) => {
    const newOrderIds = newItems.map(item => item.id);
    setMadeForYouOrder(newOrderIds);
    setMixes(newItems);
  };

  const handleResetOrder = () => {
    setMadeForYouOrder([]);
    showToast('Order reset to default');
  };

  // Cleanup any lingering drag clones or body locks when unmounting
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      document.querySelectorAll('.mfy-drag-clone').forEach(el => el.remove());
      if (dragCloneRef.current) {
        try { dragCloneRef.current.remove(); } catch (e) { }
        dragCloneRef.current = null;
      }
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // ─── Touch / Pointer Drag-and-Drop System ──────────────────────
  const handleDragStart = useCallback((index, e) => {
    // Only start drag from the grip handle and avoid duplicate drag sessions
    if (dragState.active) return;

    e.preventDefault();
    e.stopPropagation();

    // Clean up any existing clones first before spawning a new one
    document.querySelectorAll('.mfy-drag-clone').forEach(el => el.remove());
    if (dragCloneRef.current) {
      try { dragCloneRef.current.remove(); } catch (e) { }
      dragCloneRef.current = null;
    }

    const card = cardRefs.current[index];
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const listRect = listRef.current?.getBoundingClientRect();
    const gap = 14; // matches CSS gap
    const cardH = rect.height + gap;

    // Create a floating clone of the card
    const clone = card.cloneNode(true);
    clone.classList.add('mfy-drag-clone');
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    document.body.appendChild(clone);
    dragCloneRef.current = clone;

    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setDragState({
      active: true,
      dragIndex: index,
      overIndex: index,
      startY: clientY,
      currentY: clientY,
      cardHeight: cardH,
      offsetY: clientY - rect.top,
      listTop: listRect?.top || 0,
    });

    // Lock body scroll on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [dragState.active]);

  const handleDragMove = useCallback((e) => {
    if (!dragState.active) return;
    e.preventDefault();

    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const clone = dragCloneRef.current;

    if (clone) {
      clone.style.top = `${clientY - dragState.offsetY}px`;
    }

    // Calculate which index the dragged card is over
    const cards = cardRefs.current;
    let newOverIndex = dragState.dragIndex;

    for (let i = 0; i < cards.length; i++) {
      if (i === dragState.dragIndex || !cards[i]) continue;
      const rect = cards[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY && i < dragState.dragIndex) {
        newOverIndex = i;
        break;
      }
      if (clientY > midY && i > dragState.dragIndex) {
        newOverIndex = i;
      }
    }

    // Auto-scroll near edges
    const scrollContainer = listRef.current?.closest('.screen') || window;
    const scrollEl = scrollContainer === window ? document.documentElement : scrollContainer;
    const viewH = window.innerHeight;
    const edgeZone = 60;

    if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);

    if (clientY < edgeZone) {
      const speed = Math.max(2, (edgeZone - clientY) * 0.3);
      scrollEl.scrollTop -= speed;
    } else if (clientY > viewH - edgeZone) {
      const speed = Math.max(2, (clientY - (viewH - edgeZone)) * 0.3);
      scrollEl.scrollTop += speed;
    }

    setDragState(prev => ({
      ...prev,
      currentY: clientY,
      overIndex: newOverIndex,
    }));
  }, [dragState.active, dragState.dragIndex, dragState.offsetY]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.active) return;

    // Clean up all clones unconditionally
    document.querySelectorAll('.mfy-drag-clone').forEach(el => el.remove());
    if (dragCloneRef.current) {
      try { dragCloneRef.current.remove(); } catch (e) { }
      dragCloneRef.current = null;
    }

    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }

    // Perform the reorder
    const { dragIndex, overIndex } = dragState;
    if (dragIndex !== overIndex && dragIndex >= 0 && overIndex >= 0) {
      const updated = [...orderedMixes];
      const [draggedItem] = updated.splice(dragIndex, 1);
      updated.splice(overIndex, 0, draggedItem);
      updateOrder(updated);
      showToast('Card position updated');
    }

    // Unlock body scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    setDragState({
      active: false,
      dragIndex: -1,
      overIndex: -1,
      startY: 0,
      currentY: 0,
      cardHeight: 0,
    });
  }, [dragState, orderedMixes]);

  // Attach global pointer move and end listeners when dragging
  useEffect(() => {
    if (!dragState.active) return;

    const onMove = (e) => handleDragMove(e);
    const onEnd = () => handleDragEnd();

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [dragState.active, handleDragMove, handleDragEnd]);

  // Calculate per-card translate offset for the shift animation
  const getCardTransformStyle = (index) => {
    if (!dragState.active) return {};
    const { dragIndex, overIndex, cardHeight } = dragState;
    if (index === dragIndex) {
      // Hide the original card in place (clone is floating)
      return { opacity: 0, pointerEvents: 'none' };
    }

    let translateY = 0;
    if (dragIndex < overIndex) {
      // Dragging down: cards between dragIndex+1..overIndex shift UP
      if (index > dragIndex && index <= overIndex) {
        translateY = -cardHeight;
      }
    } else if (dragIndex > overIndex) {
      // Dragging up: cards between overIndex..dragIndex-1 shift DOWN
      if (index >= overIndex && index < dragIndex) {
        translateY = cardHeight;
      }
    }

    return {
      transform: `translateY(${translateY}px)`,
      transition: 'transform 300ms cubic-bezier(0.2, 0, 0, 1)',
    };
  };

  // Favorite items for dynamic playlist
  const favoriteNames = useMemo(() => {
    const sNames = (favoriteSurahIds || []).map(id => {
      const s = surahs.find(item => item.id === id);
      return s ? s.name_transliteration : null;
    }).filter(Boolean);

    const jNames = (favoriteJuzIds || []).map(id => {
      const p = paras.find(item => item.id === id);
      return p ? p.name_transliteration : null;
    }).filter(Boolean);

    return [...sNames, ...jNames];
  }, [favoriteSurahIds, favoriteJuzIds]);

  const getMixItems = (mix) => {
    if (!mix) return [];
    if (mix.isDynamic) {
      const favSurahs = (favoriteSurahIds || []).map(id => {
        const s = surahs.find(item => item.id === id);
        return s ? { ...s, badge: `${s.id}`, isPara: false } : null;
      }).filter(Boolean);

      const favParas = (favoriteJuzIds || []).map(id => {
        const p = paras.find(item => item.id === id);
        return p ? { ...p, badge: `Juz ${p.id}`, isPara: true, key: `juz-${p.id}` } : null;
      }).filter(Boolean);

      return [...favSurahs, ...favParas];
    }

    return (mix.surahIds || []).map(id => {
      const s = surahs.find(item => item.id === id);
      return s ? { ...s, badge: `${s.id}`, isPara: false } : null;
    }).filter(Boolean);
  };

  const handlePlayMix = (mix) => {
    const items = getMixItems(mix);
    if (!items || items.length === 0) return;

    const queueItems = items.map(i => ({
      id: i.id,
      isPara: !!i.isPara,
      title: i.name_transliteration,
      badge: i.badge,
      name_transliteration: i.name_transliteration,
      name_arabic: i.name_arabic,
    }));

    setActiveQueue(queueItems, mix.title);
    const firstItem = items[0];
    if (firstItem.isPara) {
      usePlayerStore.getState().setCurrentJuz(firstItem.id);
    } else {
      usePlayerStore.getState().setCurrentSurah(firstItem.id);
    }
    play();
  };

  const handleCardPlayToggle = (mix, e) => {
    e.stopPropagation();
    if (activeQueueSource === mix.title) {
      togglePlay();
    } else {
      handlePlayMix(mix);
    }
  };

  const handlePlayMixItem = (item) => {
    if (item.isPara) {
      usePlayerStore.getState().setCurrentJuz(item.id);
    } else {
      usePlayerStore.getState().setCurrentSurah(item.id);
    }
    play();
  };

  return (
    <div className="screen made-for-you-screen" id="made-for-you-screen">
      {/* Header with clear, prominent back arrow */}
      <div className="mfy-screen-header">
        <button 
          className="mfy-back-btn" 
          onClick={() => navigate(-1)} 
          aria-label="Back to Home"
          title="Back to Home"
        >
          <ArrowLeft size={24} strokeWidth={2.4} />
        </button>
        <div className="mfy-header-titles">
          <h1 className="text-section">Made For You</h1>
          <span className="mfy-header-subtitle">Hold & drag to rearrange your mixes</span>
        </div>
        {madeForYouOrder.length > 0 && (
          <button 
            className="mfy-reset-btn glass-pill"
            onClick={handleResetOrder}
            title="Reset to default order"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Card List */}
      <div className="mfy-cards-list" ref={listRef}>
        {orderedMixes.map((mix, index) => {
          const items = getMixItems(mix);
          const isThisMixActive = activeQueueSource === mix.title;
          const isThisMixPlaying = isThisMixActive && isPlaying;

          const mixSurahNames = mix.isDynamic
            ? (favoriteNames.length > 0 ? favoriteNames.join(', ') : 'No bookmarks yet')
            : (mix.surahIds || []).map(id => {
                const s = surahs.find(item => item.id === id);
                return s ? s.name_transliteration : '';
              }).filter(Boolean).slice(0, 5).join(', ');

          const cardBg = mix.gradient || (
            mix.id === 'favourites' ? 'linear-gradient(135deg, #e0245e 0%, #f65288 100%)' :
            mix.id === 'focus' ? 'linear-gradient(135deg, #d82e1b 0%, #f6941b 100%)' :
            mix.id === 'sleep' ? 'linear-gradient(135deg, #1b68d6 0%, #a824e8 100%)' :
            mix.id === 'study' ? 'linear-gradient(135deg, #0f864e 0%, #15c8a4 100%)' :
            mix.solidColor || 'linear-gradient(135deg, #2C2C2E 0%, #1C1C1E 100%)'
          );

          const transformStyle = getCardTransformStyle(index);

          return (
            <div
              key={mix.id}
              ref={el => cardRefs.current[index] = el}
              className={`mfy-reorder-card ${dragState.active && dragState.dragIndex === index ? 'dragging' : ''} ${isThisMixPlaying ? 'is-active-playing' : ''} ${dragState.active && dragState.overIndex === index && dragState.dragIndex !== index ? 'drag-over-target' : ''}`}
              style={{ background: cardBg, ...transformStyle }}
              onClick={() => { if (!dragState.active) setSelectedMix(mix); }}
            >
              {/* Left Grip Handle for reordering */}
              <div
                className="mfy-card-drag-handle"
                title="Drag to reorder"
                onPointerDown={(e) => handleDragStart(index, e)}
              >
                <GripVertical size={20} color="rgba(255, 255, 255, 0.7)" />
              </div>

              {/* Center Info */}
              <div className="mfy-card-details">
                <div className="mfy-card-top-row">
                  <span className="mfy-card-order-badge">#{index + 1}</span>
                  <span className="mfy-card-count-badge">
                    {mix.isDynamic ? `${items.length} Saved` : `${(mix.surahIds || []).length} Surahs`}
                  </span>
                  {isThisMixPlaying && (
                    <div className="mfy-playing-badge">
                      <WaveformBars color="#ffffff" size="small" />
                      <span>Playing</span>
                    </div>
                  )}
                </div>
                <h3 className="mfy-card-title">{mix.title}</h3>
                <p className="mfy-card-sub">{mix.subtitle || 'Specially made for You'}</p>
                <p className="mfy-card-surahs-preview">{mixSurahNames}</p>
              </div>

              {/* Right Play / Pause Control Button */}
              <div className="mfy-card-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`mfy-play-icon-btn ${isThisMixPlaying ? 'is-playing' : ''}`}
                  onClick={(e) => handleCardPlayToggle(mix, e)}
                  title={isThisMixPlaying ? `Pause ${mix.title}` : `Play ${mix.title}`}
                  aria-label={isThisMixPlaying ? `Pause ${mix.title}` : `Play ${mix.title}`}
                >
                  {isThisMixPlaying ? (
                    <Pause size={18} fill="white" color="white" />
                  ) : (
                    <Play size={18} fill="white" color="white" style={{ marginLeft: 2 }} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reorder Toast Notification */}
      {toastMessage && (
        <div className="mfy-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mix Detail Overlay Portal */}
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
            <button 
              className="mix-detail-back-btn" 
              onClick={() => setSelectedMix(null)} 
              aria-label="Back"
            >
              <ArrowLeft size={24} strokeWidth={2.4} color="white" />
            </button>

            <div className="mix-detail-header-content">
              <h2 className="mix-detail-title">{selectedMix.title}</h2>
              <p className="mix-detail-subtitle">
                {selectedMix.subtitle} <span className="mix-detail-creator">{selectedMix.creator}</span>
              </p>

              {/* Play / Pause Toggle Button */}
              {(() => {
                const isSelectedMixActive = activeQueueSource === selectedMix.title;
                const isSelectedMixPlaying = isSelectedMixActive && isPlaying;
                return (
                  <button 
                    className="mix-detail-play-btn" 
                    onClick={() => {
                      if (isSelectedMixActive) {
                        togglePlay();
                      } else {
                        handlePlayMix(selectedMix);
                      }
                    }}
                  >
                    {isSelectedMixPlaying ? (
                      <>
                        <Pause size={18} fill="white" color="white" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play size={18} fill="white" color="white" />
                        <span>Play Mix</span>
                      </>
                    )}
                  </button>
                );
              })()}

              <p className="mix-detail-description">{selectedMix.description}</p>
            </div>
          </div>

          {/* List of items */}
          <div className="mix-detail-list">
            {getMixItems(selectedMix).map((item) => {
              const isSelectedMixActive = activeQueueSource === selectedMix.title;
              const isItemCurrentlyPlaying = isSelectedMixActive && (
                item.isPara ? currentJuzId === item.id : currentSurahId === item.id
              ) && isPlaying;

              return (
                <div 
                  key={item.key || item.id} 
                  className={`mix-detail-row ${isItemCurrentlyPlaying ? 'active-track-playing' : ''}`} 
                  onClick={() => {
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
                  }}
                >
                  <div className="mix-detail-badge">
                    {isItemCurrentlyPlaying ? (
                      <WaveformBars color="var(--color-accent, #ff7a00)" size="small" />
                    ) : (
                      item.badge
                    )}
                  </div>
                  <div className="mix-detail-row-info">
                    <span className={`mix-detail-row-title ${isItemCurrentlyPlaying ? 'text-accent-highlight' : ''}`}>
                      {item.name_transliteration} <span className="mix-detail-row-arabic">({item.name_arabic})</span>
                    </span>
                    <span className="mix-detail-row-meaning">{item.meaning}</span>
                  </div>
                  <button className="mix-detail-more-btn" onClick={(e) => { e.stopPropagation(); }}>
                    <MoreHorizontal size={20} color="var(--color-muted)" />
                  </button>
                </div>
              );
            })}

            {getMixItems(selectedMix).length === 0 && (
              <div className="mix-detail-empty">
                <Heart size={48} color="rgba(255, 255, 255, 0.15)" style={{ marginBottom: '12px' }} />
                <p>No bookmarked Surahs or Paras yet.</p>
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </div>
  );
}
