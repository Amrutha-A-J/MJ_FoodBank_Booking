import { useCallback, useEffect, useState } from 'react';
import { API_BASE, apiFetch, getApiErrorMessage, handleResponse } from '../api/client';
import type { DeliveryCategory } from '../types';

export function resolveCategoryLimit(category: DeliveryCategory): number {
  const rawLimit =
    category.limit ??
    category.maxItems ??
    category.maxSelections ??
    category.limitPerOrder ??
    0;
  return rawLimit && rawLimit > 0 ? rawLimit : Number.POSITIVE_INFINITY;
}

export function useDeliveryCategories(
  fallbackMessage = "We couldn't load your delivery options. Please try again.",
) {
  const [categories, setCategories] = useState<DeliveryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/delivery/categories`);
      const data = await handleResponse<DeliveryCategory[]>(res);
      setCategories(data);
      setError('');
    } catch (err) {
      const message = getApiErrorMessage(err, fallbackMessage);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fallbackMessage]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const clearError = useCallback(() => setError(''), []);

  return { categories, loading, error, reload: loadCategories, clearError };
}
