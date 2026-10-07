import { create } from 'zustand';

const LOCAL_STORAGE_KEY = 'tarjuma_user_playlists';

const loadPlaylistsFromStorage = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map(p => ({
          ...p,
          items: Array.isArray(p.items) ? p.items : []
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to load playlists from localStorage:', e);
  }
  // Default starter playlist
  return [
    {
      id: 'playlist-default-1',
      name: 'Daily Morning Recitation',
      createdAt: new Date().toISOString(),
      items: [
        { itemType: 'surah', itemId: 1, title: 'Al-Fatihah' },
        { itemType: 'surah', itemId: 36, title: 'Ya-Sin' },
        { itemType: 'surah', itemId: 67, title: 'Al-Mulk' }
      ]
    }
  ];
};

const savePlaylistsToStorage = (playlists) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(playlists));
  } catch (e) {
    console.warn('Failed to save playlists to localStorage:', e);
  }
};

const usePlaylistStore = create((set, get) => ({
  playlists: loadPlaylistsFromStorage(),

  // Create new custom playlist
  createPlaylist: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const newPlaylist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      items: []
    };

    const currentList = Array.isArray(get().playlists) ? get().playlists : [];
    const updated = [newPlaylist, ...currentList];
    savePlaylistsToStorage(updated);
    set({ playlists: updated });
    return newPlaylist;
  },

  // Delete playlist
  deletePlaylist: (playlistId) => {
    const currentList = Array.isArray(get().playlists) ? get().playlists : [];
    const updated = currentList.filter(p => p.id !== playlistId);
    savePlaylistsToStorage(updated);
    set({ playlists: updated });
  },

  // Add Surah or Para item to a playlist
  addItemToPlaylist: (playlistId, item) => {
    // item: { itemType: 'surah' | 'juz', itemId: number, title: string }
    const currentList = Array.isArray(get().playlists) ? get().playlists : [];
    const updated = currentList.map(p => {
      if (p.id === playlistId) {
        const items = Array.isArray(p.items) ? p.items : [];
        // Prevent duplicate items in same playlist
        const exists = items.some(i => i.itemType === item.itemType && i.itemId === item.itemId);
        if (exists) return p;
        return {
          ...p,
          items: [...items, item]
        };
      }
      return p;
    });
    savePlaylistsToStorage(updated);
    set({ playlists: updated });
  },

  // Remove item from a playlist
  removeItemFromPlaylist: (playlistId, itemType, itemId) => {
    const currentList = Array.isArray(get().playlists) ? get().playlists : [];
    const updated = currentList.map(p => {
      if (p.id === playlistId) {
        const items = Array.isArray(p.items) ? p.items : [];
        return {
          ...p,
          items: items.filter(i => !(i.itemType === itemType && i.itemId === itemId))
        };
      }
      return p;
    });
    savePlaylistsToStorage(updated);
    set({ playlists: updated });
  }
}));

export default usePlaylistStore;
