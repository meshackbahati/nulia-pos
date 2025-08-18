import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

export interface AppState {
  theme: Theme;
  isOnline: boolean;
  lastSynced: string | null;
  setTheme: (theme: Theme) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setOfflineStatus: (isOffline: boolean) => void;
  updateLastSynced: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      isOnline: true,
      lastSynced: null,
      
      setTheme: (theme) => set({ theme }),
      
      setOnlineStatus: (isOnline) => set({ isOnline }),
      
      setOfflineStatus: (isOffline) => set({ isOnline: !isOffline }),
      
      updateLastSynced: () => 
        set({ lastSynced: new Date().toISOString() }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

// Listen to online/offline events
if (typeof window !== 'undefined') {
  const updateOnlineStatus = () => {
    useAppStore.getState().setOnlineStatus(navigator.onLine);
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initialize online status
  updateOnlineStatus();
}
