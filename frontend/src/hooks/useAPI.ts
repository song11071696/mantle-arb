'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAPI<T>(endpoint: string | null) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    endpoint ? `/api/v1${endpoint}` : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

export function usePrices(tokenIn?: string, tokenOut?: string) {
  return useAPI<any[]>(
    tokenIn && tokenOut ? `/prices?tokenIn=${tokenIn}&tokenOut=${tokenOut}` : null
  );
}

export function useStrategies() {
  return useAPI<any[]>('/strategies');
}

export function useTrades(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useAPI<any[]>(`/trades${query}`);
}

export function useOpportunities() {
  return useAPI<any[]>('/monitoring/opportunities');
}

export function useSystemStatus() {
  return useAPI<any>('/monitoring/status');
}

export function useAlerts() {
  return useAPI<any[]>('/alerts');
}

export function useContractStats() {
  return useAPI<any>('/contract/stats');
}

export function useRiskParams() {
  return useAPI<any>('/risk/parameters');
}
