// API client that routes through Next.js API proxy

const API_BASE = '/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Prices
export const getPrices = (tokenIn: string, tokenOut: string) =>
  fetchAPI<any[]>(`/prices?tokenIn=${tokenIn}&tokenOut=${tokenOut}`);

export const getBestPrice = (tokenIn: string, tokenOut: string, amount: string) =>
  fetchAPI<any>(`/prices/best?tokenIn=${tokenIn}&tokenOut=${tokenOut}&amount=${amount}`);

// Strategies
export const getStrategies = () => fetchAPI<any[]>('/strategies');
export const getStrategy = (id: string) => fetchAPI<any>(`/strategies/${id}`);
export const createStrategy = (data: any) =>
  fetchAPI<any>('/strategies', { method: 'POST', body: JSON.stringify(data) });
export const updateStrategy = (id: string, data: any) =>
  fetchAPI<any>(`/strategies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStrategy = (id: string) =>
  fetchAPI<void>(`/strategies/${id}`, { method: 'DELETE' });
export const toggleStrategy = (id: string) =>
  fetchAPI<any>(`/strategies/${id}/toggle`, { method: 'POST' });

// Trades
export const getTrades = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI<any[]>(`/trades${query}`);
};
export const getTrade = (id: string) => fetchAPI<any>(`/trades/${id}`);
export const executeTrade = (data: any) =>
  fetchAPI<any>('/trades/execute', { method: 'POST', body: JSON.stringify(data) });

// Backtesting
export const runBacktest = (config: any) =>
  fetchAPI<any>('/backtesting/run', { method: 'POST', body: JSON.stringify(config) });
export const getBacktestResults = () => fetchAPI<any[]>('/backtesting/run');
export const getBacktestResult = (id: string) =>
  fetchAPI<any>(`/backtesting/results/${id}`);

// Monitoring
export const getSystemStatus = () => fetchAPI<any>('/monitoring/status');
export const getOpportunities = () => fetchAPI<any[]>('/monitoring/opportunities');
export const getAlerts = () => fetchAPI<any[]>('/alerts');
export const markAlertRead = (id: string) =>
  fetchAPI<void>(`/alerts/${id}/read`, { method: 'POST' });

// Risk
export const getRiskParams = () => fetchAPI<any>('/risk/parameters');
export const updateRiskParams = (params: any) =>
  fetchAPI<any>('/risk/parameters', { method: 'PUT', body: JSON.stringify(params) });

// Contract
export const getContractStats = () => fetchAPI<any>('/contract/stats');
export const getContractAddress = () =>
  fetchAPI<{ address: string }>('/contract/address');
