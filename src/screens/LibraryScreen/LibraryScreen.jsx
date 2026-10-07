import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ListMusic, Download, Plus, Play, Trash2, HardDrive, Music, ChevronRight, Check, X, FolderPlus, Filter } from 'lucide-react';
import useDownloadsStore from '../../stores/downloadsStore';
import usePlaylistStore from '../../stores/playlistStore';
import usePlayerStore from '../../stores/playerStore';
import scholars from '../../data/scholars.json';
import './LibraryScreen.css';

const MODE_NAMES = {
  1: 'Arabic Only (Surah)',
  2: 'Arabic + Hindi (Para)',
  3: 'Hindi Only (Para)',
  4: 'Arabic + Hindi (Surah)',
  5: 'Hindi Only (Surah)',
};

export default function LibraryScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('playlists'); // 'playlists' | 'downloads'

  // GPU-Accelerated Swipe Gestures between Playlists and Downloads
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isSwipeLocked = useRef(null); // null = undetermined, true = horizontal, false = vertical
  const currentDeltaX = useRef(0);
  const [isSliding, setIsSliding] = useState(false);
  const slidingTimerRef = useRef(null);
  const sliderTrackRef = useRef(null);
  const indicatorRef = useRef(null);
  const viewportRef = useRef(null);

  const handleTabClick = (tab) => {
    if (tab === activeTab) return;
    setIsSliding(true);
    setActiveTab(tab);
    if (slidingTimerRef.current) clearTimeout(slidingTimerRef.current);
    slidingTimerRef.current = setTimeout(() => {
      setIsSliding(false);
    }, 340);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isSwipeLocked.current = null;
    currentDeltaX.current = 0;
    setIsSliding(true);
    if (slidingTimerRef.current) clearTimeout(slidingTimerRef.current);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    if (isSwipeLocked.current === null) {
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
        isSwipeLocked.current = true;
      } else if (Math.abs(dy) > 7) {
        isSwipeLocked.current = false;
      }
    }

    if (isSwipeLocked.current === true) {
      let effectiveDx = dx;
      // Resistance on boundary edges
      if (activeTab === 'playlists' && dx > 0) effectiveDx = dx * 0.22;
      if (activeTab === 'downloads' && dx < 0) effectiveDx = dx * 0.22;
      currentDeltaX.current = effectiveDx;

      const viewportWidth = viewportRef.current ? viewportRef.current.offsetWidth : window.innerWidth;
      const shift = viewportWidth + 24;
      const basePx = activeTab === 'playlists' ? 0 : -shift;
      const currentTrackPx = basePx + effectiveDx;

      if (sliderTrackRef.current) {
        sliderTrackRef.current.style.transition = 'none';
        sliderTrackRef.current.style.transform = `translate3d(${currentTrackPx}px, 0, 0)`;
      }

      if (indicatorRef.current) {
        const baseInd = activeTab === 'playlists' ? 0 : 100;
        const indOffset = -(effectiveDx / viewportWidth) * 100;
        const clampedInd = Math.max(0, Math.min(100, baseInd + indOffset));
        indicatorRef.current.style.transition = 'none';
        indicatorRef.current.style.transform = `translateX(${clampedInd}%)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (isSwipeLocked.current === true) {
      const dx = currentDeltaX.current;
      const elapsed = Date.now() - touchStartTime.current;
      const velocity = Math.abs(dx) / (elapsed || 1);
      const isFlick = velocity > 0.25 && Math.abs(dx) > 20;
      const passThreshold = Math.abs(dx) > 50 || isFlick;

      let targetTab = activeTab;
      if (activeTab === 'playlists' && dx < 0 && passThreshold) {
        targetTab = 'downloads';
      } else if (activeTab === 'downloads' && dx > 0 && passThreshold) {
        targetTab = 'playlists';
      }

      if (sliderTrackRef.current) {
        sliderTrackRef.current.style.transition = 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        const targetTransform = targetTab === 'playlists' ? 'translate3d(0, 0, 0)' : 'translate3d(calc(-50% - 12px), 0, 0)';
        sliderTrackRef.current.style.transform = targetTransform;
      }

      if (indicatorRef.current) {
        indicatorRef.current.style.transition = 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)';
        indicatorRef.current.style.transform = `translateX(${targetTab === 'playlists' ? 0 : 100}%)`;
      }

      setActiveTab(targetTab);
    } else {
      if (sliderTrackRef.current) {
        sliderTrackRef.current.style.transition = 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        const targetTransform = activeTab === 'playlists' ? 'translate3d(0, 0, 0)' : 'translate3d(calc(-50% - 12px), 0, 0)';
        sliderTrackRef.current.style.transform = targetTransform;
      }
      if (indicatorRef.current) {
        indicatorRef.current.style.transition = 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)';
        indicatorRef.current.style.transform = `translateX(${activeTab === 'playlists' ? 0 : 100}%)`;
      }
    }

    touchStartX.current = 0;
    touchStartY.current = 0;
    isSwipeLocked.current = null;
    currentDeltaX.current = 0;

    if (slidingTimerRef.current) clearTimeout(slidingTimerRef.current);
    slidingTimerRef.current = setTimeout(() => {
      setIsSliding(false);
    }, 340);
  };

  useEffect(() => {
    if (sliderTrackRef.current) {
      sliderTrackRef.current.style.transition = 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      const targetTransform = activeTab === 'playlists' ? 'translate3d(0, 0, 0)' : 'translate3d(calc(-50% - 12px), 0, 0)';
      sliderTrackRef.current.style.transform = targetTransform;
    }
    if (indicatorRef.current) {
      indicatorRef.current.style.transition = 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)';
      indicatorRef.current.style.transform = `translateX(${activeTab === 'playlists' ? 0 : 100}%)`;
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (slidingTimerRef.current) clearTimeout(slidingTimerRef.current);
    };
  }, []);

  // Downloads store
  const { downloads, deleteDownload, totalStorageBytes, initDownloads, downloadProgress, downloadingKeys } = useDownloadsStore();
  const [downloadCategory, setDownloadCategory] = useState('modes'); // 'modes' | 'scholars'
  const [selectedModeFilter, setSelectedModeFilter] = useState('ALL');
  const [selectedScholarFilter, setSelectedScholarFilter] = useState('ALL');

  // Playlists store
  const { playlists, createPlaylist, deletePlaylist, removeItemFromPlaylist } = usePlaylistStore();
  const setHideMiniPlayer = usePlayerStore(state => state.setHideMiniPlayer);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  useEffect(() => {
    setHideMiniPlayer(showCreateModal || showFilterModal || !!selectedPlaylist);
    return () => setHideMiniPlayer(false);
  }, [showCreateModal, showFilterModal, selectedPlaylist, setHideMiniPlayer]);

  // Player store
  const { setCurrentSurah, setCurrentJuz, setMode, setCurrentScholar, play, setActiveQueue } = usePlayerStore();

  useEffect(() => {
    initDownloads();
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const handlePlayDownloadedItem = (item) => {
    setMode(item.mode);
    if (item.scholarId) {
      setCurrentScholar(item.scholarId);
    }
    if (item.itemType === 'juz') {
      setCurrentJuz(item.itemId);
    } else {
      setCurrentSurah(item.itemId);
    }
    play();
    if (window.location.pathname !== '/player') {
      navigate('/player');
    }
  };

  const handleCreatePlaylistSubmit = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  const getDownloadScholarName = (item) => {
    if (item.mode === 3 || item.mode === 5) {
      return 'Fateh Muhammed Jalandhary';
    }
    if (item.mode === 2 || item.mode === 4) {
      return 'Mishary Rashid Alafasy & Jalandhary';
    }
    const sch = scholars.find(s => s.id === item.scholarId);
    return sch ? sch.name_transliteration : 'Yasser Al-Dosari';
  };

  const getDownloadModeLabel = (item) => {
    return MODE_NAMES[item.mode] || `Mode ${item.mode}`;
  };

  const allScholars = React.useMemo(() => {
    return [
      ...scholars,
      { id: 'scholar-jalandhary', name_transliteration: 'Fateh Muhammed Jalandhary' }
    ];
  }, []);

  // Group downloads by Mode
  const downloadsByMode = React.useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    downloads.forEach(d => {
      if (map[d.mode]) {
        map[d.mode].push(d);
      } else {
        map[1].push(d);
      }
    });
    return map;
  }, [downloads]);

  // Group downloads by Scholar
  const downloadsByScholar = React.useMemo(() => {
    const map = {};
    allScholars.forEach(s => { map[s.id] = []; });
    downloads.forEach(d => {
      let schId = d.scholarId;
      if (d.mode === 3 || d.mode === 5) {
        schId = 'scholar-jalandhary';
      } else if (d.mode === 2 || d.mode === 4) {
        schId = 'scholar-2'; // Mishary Rashid Alafasy
      }
      if (!schId) schId = 'scholar-1';
      if (!map[schId]) map[schId] = [];
      map[schId].push(d);
    });
    return map;
  }, [downloads, allScholars]);

  const sortedScholarsForFilter = React.useMemo(() => {
    return [...allScholars].sort((a, b) => {
      const countA = (downloadsByScholar[a.id] || []).length;
      const countB = (downloadsByScholar[b.id] || []).length;
      if (countA > 0 && countB === 0) return -1;
      if (countB > 0 && countA === 0) return 1;
      return 0;
    });
  }, [allScholars, downloadsByScholar]);

  return (
    <div className="screen library-screen" id="library-screen">
      {/* Header */}
      <div className="screen-header library-screen-header">
        <h1 className="text-title">Library</h1>
        {activeTab === 'playlists' && (
          <button
            className="library-add-playlist-btn"
            onClick={() => setShowCreateModal(true)}
            aria-label="Create New Playlist"
            title="Create New Playlist"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Main Sub-Tabs (Playlists vs Downloads) */}
      <div className="segmented-control library-segmented-control">
        <div
          ref={indicatorRef}
          className="segmented-control-indicator"
          style={{
            width: 'calc((100% - 6px) / 2)',
            transform: `translateX(calc(${activeTab === 'playlists' ? 0 : 1} * 100%))`,
            transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        />
        <button
          className={`segmented-control-btn ${activeTab === 'playlists' ? 'active' : ''}`}
          onClick={() => handleTabClick('playlists')}
        >
          <ListMusic size={16} style={{ marginRight: 6 }} />
          Playlists
        </button>
        <button
          className={`segmented-control-btn ${activeTab === 'downloads' ? 'active' : ''}`}
          onClick={() => handleTabClick('downloads')}
        >
          <Download size={16} style={{ marginRight: 6 }} />
          Downloads ({downloads.length})
        </button>
      </div>

      {/* GPU-Accelerated Swipe Slider Viewport */}
      <div
        ref={viewportRef}
        className="library-slider-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          ref={sliderTrackRef}
          className="library-slider-track"
          style={{
            transform: activeTab === 'playlists' ? 'translate3d(0, 0, 0)' : 'translate3d(calc(-50% - 12px), 0, 0)',
            transition: 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* SLIDE 1: PLAYLISTS */}
          <div className={`library-slider-slide ${activeTab === 'playlists' || isSliding ? 'active-slide' : 'inactive-slide'}`}>
            <div className="library-section playlists-view">

          <div className="playlists-grid">
            {playlists.map(pl => (
              <div key={pl.id} className="glass-card playlist-card" onClick={() => setSelectedPlaylist(pl)}>
                <div className="playlist-card-icon">
                  <ListMusic size={28} color="white" />
                </div>
                <div className="playlist-card-info">
                  <h3 className="playlist-card-title">{pl.name}</h3>
                  <span className="text-secondary">{pl.items ? pl.items.length : 0} items</span>
                </div>
                <ChevronRight size={18} color="var(--color-muted)" />
              </div>
            ))}
          </div>

          {playlists.length === 0 && (
            <div className="empty-state-card glass-card">
              <FolderPlus size={44} color="rgba(255,255,255,0.3)" />
              <h3>No Playlists Yet</h3>
              <p>Tap the + icon at the top right to create custom playlists.</p>
            </div>
          )}
        </div>
      </div>

        {/* SLIDE 2: DOWNLOADS */}
        <div className={`library-slider-slide ${activeTab === 'downloads' || isSliding ? 'active-slide' : 'inactive-slide'}`}>
          <div className="library-section downloads-view">
          {/* Storage Meter */}
          <div className="glass-card storage-card">
            <div className="storage-card-header">
              <div className="storage-title-row">
                <HardDrive size={18} color="var(--color-white)" />
                <span className="text-label">Offline Downloads Storage</span>
              </div>
              <span className="storage-used-badge">{formatBytes(totalStorageBytes)}</span>
            </div>
            <div className="storage-track">
              <div
                className="storage-fill"
                style={{ width: `${Math.min(100, Math.max(5, (totalStorageBytes / (500 * 1024 * 1024)) * 100))}%` }}
              />
            </div>
          </div>

          {/* In-Progress Downloads */}
          {downloadingKeys && downloadingKeys.size > 0 && (
            <div className="in-progress-downloads-section">
              <span className="text-label" style={{ marginBottom: '8px', display: 'block' }}>Downloading…</span>
              {[...downloadingKeys].map(key => {
                const pct = downloadProgress[key] || 0;
                return (
                  <div key={key} className="glass-card in-progress-item">
                    <div className="in-progress-info">
                      <span className="in-progress-title">{key.replace(/_m\d+_s.*$/, '').replace(/_/g, ' ')}</span>
                      <div className="in-progress-bar-row">
                        <div className="in-progress-bar-track">
                          <div className="in-progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="in-progress-pct">{pct}%</span>
                      </div>
                    </div>
                    <button
                      className="in-progress-cancel-btn"
                      onClick={() => {
                        if (window.confirm('Cancel this download?')) {
                          useDownloadsStore.getState().cancelDownload(key);
                        }
                      }}
                      title="Cancel Download"
                    >
                      <X size={16} color="rgba(255,255,255,0.7)" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Categorized Filter Sub-Controls */}
          <div className="downloads-category-bar">
            <div className="cat-segmented-control">
              <button
                className={`cat-btn ${downloadCategory === 'modes' ? 'active' : ''}`}
                onClick={() => setDownloadCategory('modes')}
              >
                By Modes
              </button>
              <button
                className={`cat-btn ${downloadCategory === 'scholars' ? 'active' : ''}`}
                onClick={() => setDownloadCategory('scholars')}
              >
                By Scholars
              </button>
            </div>
          </div>

          {/* Downloads Filter Trigger Button */}
          {downloads.length > 0 && (
            <div className="downloads-filter-header-row">
              <button
                className={`downloads-filter-btn ${(downloadCategory === 'modes' ? selectedModeFilter !== 'ALL' : selectedScholarFilter !== 'ALL') ? 'is-filtered' : ''}`}
                onClick={() => setShowFilterModal(true)}
              >
                <Filter size={13} className="filter-btn-icon" />
                <span className="filter-btn-label">
                  {downloadCategory === 'modes'
                    ? (selectedModeFilter === 'ALL' ? 'Filter Modes' : `Mode ${selectedModeFilter}`)
                    : (selectedScholarFilter === 'ALL' ? 'Filter Scholars' : (allScholars.find(s => s.id === selectedScholarFilter)?.name_transliteration || 'Scholar'))
                  }
                </span>
                {(downloadCategory === 'modes' ? selectedModeFilter !== 'ALL' : selectedScholarFilter !== 'ALL') && (
                  <span
                    className="filter-btn-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (downloadCategory === 'modes') setSelectedModeFilter('ALL');
                      else setSelectedScholarFilter('ALL');
                    }}
                    title="Clear Filter"
                  >
                    <X size={12} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* BY MODES VIEW */}
          {downloadCategory === 'modes' && (
            <div className="modes-downloads-list">
              {[1, 2, 3, 4, 5]
                .filter(modeNum => selectedModeFilter === 'ALL' || String(modeNum) === String(selectedModeFilter))
                .map(modeNum => {
                  const modeItems = downloadsByMode[modeNum] || [];
                  if (modeItems.length === 0) return null;

                  return (
                    <div key={modeNum} className="mode-download-group">
                      <div className="group-header">
                        <span className="group-title">Mode {modeNum}: {MODE_NAMES[modeNum]}</span>
                        <span className="group-count">{modeItems.length} items</span>
                      </div>

                      <div className="group-items-list">
                        {modeItems.map(item => (
                          <div key={item.key} className="glass-card download-item-row" onClick={() => handlePlayDownloadedItem(item)}>
                            <div className="item-play-icon">
                              <Play size={18} fill="white" color="white" />
                            </div>
                            <div className="item-info">
                              <span className="item-title">{item.title}</span>
                              <span className="item-sub">Mode {item.mode}: {getDownloadModeLabel(item)} · {formatBytes(item.size)}</span>
                            </div>
                            <button
                              className="item-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDownload(item.key);
                              }}
                              title="Delete Download"
                            >
                              <Trash2 size={16} color="rgba(255,255,255,0.6)" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

              {/* Empty state when specific mode has 0 downloads */}
              {selectedModeFilter !== 'ALL' && (downloadsByMode[selectedModeFilter] || []).length === 0 && (
                <div className="empty-filter-state glass-card">
                  <p className="empty-filter-title">No downloads in Mode {selectedModeFilter}</p>
                  <p className="empty-filter-desc">You haven't downloaded any items in Mode {selectedModeFilter}: {MODE_NAMES[selectedModeFilter]}.</p>
                  <button className="reset-filter-btn" onClick={() => setSelectedModeFilter('ALL')}>
                    Show All Modes
                  </button>
                </div>
              )}

              {downloads.length === 0 && (
                <div className="empty-state-card glass-card simple-empty-downloads">
                  <Download size={32} color="rgba(255,255,255,0.25)" />
                  <h3>No Downloads</h3>
                  <p>Downloaded recitations will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* BY SCHOLARS VIEW */}
          {downloadCategory === 'scholars' && (
            <div className="scholars-downloads-list">
              {allScholars
                .filter(sch => selectedScholarFilter === 'ALL' || sch.id === selectedScholarFilter)
                .map(sch => {
                  const schItems = downloadsByScholar[sch.id] || [];
                  if (schItems.length === 0) return null;

                  return (
                    <div key={sch.id} className="scholar-download-group">
                      <div className="group-header">
                        <span className="group-title">{sch.name_transliteration}</span>
                        <span className="group-count">{schItems.length} items</span>
                      </div>

                      <div className="group-items-list">
                        {schItems.map(item => (
                          <div key={item.key} className="glass-card download-item-row" onClick={() => handlePlayDownloadedItem(item)}>
                            <div className="item-play-icon">
                              <Play size={18} fill="white" color="white" />
                            </div>
                            <div className="item-info">
                              <span className="item-title">{item.title}</span>
                              <span className="item-sub">{getDownloadScholarName(item)} · {formatBytes(item.size)}</span>
                            </div>
                            <button
                              className="item-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDownload(item.key);
                              }}
                              title="Delete Download"
                            >
                              <Trash2 size={16} color="rgba(255,255,255,0.6)" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

              {/* Empty state when specific scholar has 0 downloads */}
              {selectedScholarFilter !== 'ALL' && (downloadsByScholar[selectedScholarFilter] || []).length === 0 && (
                <div className="empty-filter-state glass-card">
                  <p className="empty-filter-title">
                    No downloads for {allScholars.find(s => s.id === selectedScholarFilter)?.name_transliteration || 'this scholar'}
                  </p>
                  <p className="empty-filter-desc">You haven't downloaded any items by this reciter.</p>
                  <button className="reset-filter-btn" onClick={() => setSelectedScholarFilter('ALL')}>
                    Show All Scholars
                  </button>
                </div>
              )}

              {downloads.length === 0 && (
                <div className="empty-state-card glass-card simple-empty-downloads">
                  <Download size={32} color="rgba(255,255,255,0.25)" />
                  <h3>No Downloads</h3>
                  <p>Downloaded recitations will appear here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

      {/* =================================================================== */}
      {/* MODAL: CREATE PLAYLIST */}
      {/* =================================================================== */}
      {showCreateModal && ReactDOM.createPortal(
        <div className="library-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="glass-sheet library-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="library-drag-pill" onClick={() => setShowCreateModal(false)} />
            <button className="library-modal-close-btn" onClick={() => setShowCreateModal(false)}>
              <X size={20} />
            </button>
            <form onSubmit={handleCreatePlaylistSubmit} className="playlist-create-form">
              <h3 className="modal-title">Create New Playlist</h3>
              <input
                type="text"
                className="playlist-name-input"
                placeholder="Playlist name (e.g. My Surahs)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
              />
              <div className="form-actions">
                <button type="submit" className="create-submit-btn" disabled={!newPlaylistName.trim()}>
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)}

      {/* =================================================================== */}
      {/* OVERLAY: PLAYLIST DETAILS */}
      {/* =================================================================== */}
      {selectedPlaylist && ReactDOM.createPortal(
        <div className="playlist-detail-overlay">
          {/* Gradient Hero Header */}
          <div className="playlist-detail-hero">
            <button className="playlist-detail-back-btn" onClick={() => setSelectedPlaylist(null)} aria-label="Back">
              <X size={22} color="white" />
            </button>

            <div className="playlist-detail-hero-content">
              <div className="playlist-detail-hero-icon">
                <ListMusic size={40} color="white" />
              </div>
              <h2 className="playlist-detail-hero-title">{selectedPlaylist.name}</h2>
              <span className="playlist-detail-hero-count">
                {selectedPlaylist.items ? selectedPlaylist.items.length : 0} items
              </span>

              {/* Glass Play All Button */}
              {selectedPlaylist.items && selectedPlaylist.items.length > 0 && (
                <button
                  className="playlist-detail-play-btn"
                  onClick={() => {
                    const queueItems = (selectedPlaylist.items || []).map(pi => ({
                      id: pi.itemId,
                      isPara: pi.itemType === 'juz',
                      title: pi.title,
                      name_transliteration: pi.title,
                      name_arabic: '',
                    }));
                    setActiveQueue(queueItems, selectedPlaylist.name);
                    const first = selectedPlaylist.items[0];
                    if (first.itemType === 'juz') {
                      setCurrentJuz(first.itemId);
                    } else {
                      setCurrentSurah(first.itemId);
                    }
                    play();
                    if (window.location.pathname !== '/player') {
                      navigate('/player');
                    }
                  }}
                >
                  <Play size={16} fill="white" color="white" />
                  <span>Play All</span>
                </button>
              )}

              {/* Delete Playlist Button */}
              <button
                className="playlist-detail-delete-btn"
                onClick={() => {
                  if (window.confirm(`Delete playlist "${selectedPlaylist.name}"?`)) {
                    deletePlaylist(selectedPlaylist.id);
                    setSelectedPlaylist(null);
                  }
                }}
              >
                <Trash2 size={15} color="rgba(255,69,58,0.9)" />
                <span>Delete Playlist</span>
              </button>
            </div>
          </div>

          {/* Scrollable Item List */}
          <div className="playlist-detail-list">
            {(selectedPlaylist.items || []).map((item, idx) => (
              <div key={idx} className="playlist-detail-row" onClick={() => {
                const queueItems = (selectedPlaylist.items || []).map(pi => ({
                  id: pi.itemId,
                  isPara: pi.itemType === 'juz',
                  title: pi.title,
                  name_transliteration: pi.title,
                  name_arabic: '',
                }));
                setActiveQueue(queueItems, selectedPlaylist.name);
                if (item.itemType === 'juz') {
                  setCurrentJuz(item.itemId);
                } else {
                  setCurrentSurah(item.itemId);
                }
                play();
                if (window.location.pathname !== '/player') {
                  navigate('/player');
                }
              }}>
                <div className="playlist-detail-badge">{idx + 1}</div>
                <div className="playlist-detail-row-info">
                  <span className="playlist-detail-row-title">{item.title}</span>
                  <span className="playlist-detail-row-sub">{item.itemType === 'juz' ? `Para ${item.itemId}` : `Surah ${item.itemId}`}</span>
                </div>
                <button
                  className="playlist-detail-row-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItemFromPlaylist(selectedPlaylist.id, item.itemType, item.itemId);
                    setSelectedPlaylist({
                      ...selectedPlaylist,
                      items: selectedPlaylist.items.filter(i => !(i.itemType === item.itemType && i.itemId === item.itemId))
                    });
                  }}
                >
                  <X size={16} color="rgba(255,255,255,0.5)" />
                </button>
              </div>
            ))}

            {(!selectedPlaylist.items || selectedPlaylist.items.length === 0) && (
              <div className="playlist-detail-empty">
                <Music size={48} color="rgba(255, 255, 255, 0.15)" style={{ marginBottom: '12px' }} />
                <p>This playlist is empty.</p>
                <p className="text-secondary">Tap the "+" button on the Player Screen to add Surahs and Paras.</p>
              </div>
            )}
          </div>
        </div>
        , document.body)}

      {/* FILTER SELECTION POP-UP MODAL */}
      {showFilterModal && ReactDOM.createPortal(
        <div className="filter-modal-backdrop" onClick={() => setShowFilterModal(false)}>
          <div className="filter-modal-sheet glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <div className="filter-modal-title-group">
                <Filter size={17} color="rgba(255,255,255,0.85)" />
                <h3 className="filter-modal-title">
                  {downloadCategory === 'modes' ? 'Filter by Mode' : 'Filter by Scholar'}
                </h3>
              </div>
              <button className="filter-modal-close-btn" onClick={() => setShowFilterModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="filter-modal-options-list">
              {downloadCategory === 'modes' ? (
                <>
                  <div
                    className={`filter-modal-option ${selectedModeFilter === 'ALL' ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedModeFilter('ALL');
                      setShowFilterModal(false);
                    }}
                  >
                    <div className="option-text">
                      <span className="option-title">All Modes</span>
                      <span className="option-count">{downloads.length} {downloads.length === 1 ? 'item' : 'items'} total</span>
                    </div>
                    {selectedModeFilter === 'ALL' && <Check size={18} color="var(--color-green, #34c759)" strokeWidth={2.5} />}
                  </div>

                  {[1, 2, 3, 4, 5].map(m => {
                    const count = (downloadsByMode[m] || []).length;
                    const isSelected = selectedModeFilter === String(m);
                    return (
                      <div
                        key={m}
                        className={`filter-modal-option ${isSelected ? 'selected' : ''} ${count === 0 ? 'zero-items' : ''}`}
                        onClick={() => {
                          setSelectedModeFilter(String(m));
                          setShowFilterModal(false);
                        }}
                      >
                        <div className="option-text">
                          <span className="option-title">Mode {m}: {MODE_NAMES[m]}</span>
                          <span className="option-count">{count} {count === 1 ? 'item' : 'items'}</span>
                        </div>
                        {isSelected && <Check size={18} color="var(--color-green, #34c759)" strokeWidth={2.5} />}
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <div
                    className={`filter-modal-option ${selectedScholarFilter === 'ALL' ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedScholarFilter('ALL');
                      setShowFilterModal(false);
                    }}
                  >
                    <div className="option-text">
                      <span className="option-title">All Scholars</span>
                      <span className="option-count">{downloads.length} {downloads.length === 1 ? 'item' : 'items'} total</span>
                    </div>
                    {selectedScholarFilter === 'ALL' && <Check size={18} color="var(--color-green, #34c759)" strokeWidth={2.5} />}
                  </div>

                  {sortedScholarsForFilter.map(sch => {
                    const count = (downloadsByScholar[sch.id] || []).length;
                    const isSelected = selectedScholarFilter === sch.id;
                    return (
                      <div
                        key={sch.id}
                        className={`filter-modal-option ${isSelected ? 'selected' : ''} ${count === 0 ? 'zero-items' : ''}`}
                        onClick={() => {
                          setSelectedScholarFilter(sch.id);
                          setShowFilterModal(false);
                        }}
                      >
                        <div className="option-text">
                          <span className="option-title">{sch.name_transliteration}</span>
                          <span className="option-count">{count} {count === 1 ? 'item' : 'items'}</span>
                        </div>
                        {isSelected && <Check size={18} color="var(--color-green, #34c759)" strokeWidth={2.5} />}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
        , document.body)}
    </div>
  );
}
