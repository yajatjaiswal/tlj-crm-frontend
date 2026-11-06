import { useState } from 'react';
import { BASE_URL } from '../utils/constants';

export function useSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const searchItems = async (query) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/adminDashboard/global-search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const { data } = await response.json();
      setResults(data);
    } catch (err) {
      setError('Failed to fetch search results');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    results,
    error,
    searchItems,
  };
} 