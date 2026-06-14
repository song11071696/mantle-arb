import { create } from 'zustand';

interface AppState {
  // Connection
  walletAddress: string | null;
  chainId: number | null;
  isConnected: boolean;
  
  // UI
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  // Data
  prices: Record<string, number>;
  strategies: any[];
  trades: any[];
  alerts: any[];
  
  // Actions
  setWallet: (address: string | null, chainId: number | null) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updatePrice: (token: string, price: number) => void;
  addTrade: (trade: any) => void;
  addAlert: (alert: any) => void;
  markAlertRead: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  walletAddress: null,
  chainId: null,
  isConnected: false,
  sidebarCollapsed: false,
  theme: 'light',
  prices: {},
  strategies: [],
  trades: [],
  alerts: [],

  // Actions
  setWallet: (address, chainId) => set({ walletAddress: address, chainId, isConnected: !!address }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
  updatePrice: (token, price) => set((state) => ({ prices: { ...state.prices, [token]: price } })),
  addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades].slice(0, 100) })),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  markAlertRead: (id) => set((state) => ({
    alerts: state.alerts.map((a: any) => a.id === id ? { ...a, read: true } : a),
  })),
}));
