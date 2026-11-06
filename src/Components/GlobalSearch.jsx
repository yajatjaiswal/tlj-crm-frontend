import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSearch } from '../hooks/useSearch';
import debounce from 'lodash/debounce';
import { getLeadStageMeaning, leadStageMapping } from '../utils/leadStageMapping';

function GlobalSearch({ isOpen, onClose, initialSearchValue = '' }) {
  const [searchQuery, setSearchQuery] = useState(initialSearchValue);
  const { isLoading, results, error, searchItems } = useSearch();

  // Update search query when initialSearchValue changes
  useEffect(() => {
    if (initialSearchValue) {
      setSearchQuery(initialSearchValue);
      searchItems(initialSearchValue);
    }
  }, [initialSearchValue]);

  // Debounce the search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      searchItems(query);
    }, 300),
    []
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSearch = async (e) => {
    e.preventDefault();
    searchItems(searchQuery);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-3xl transform rounded-lg bg-white shadow-xl transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          <div className="p-6">
            {/* Search form */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    if (value === '') {
                      searchItems('');
                    } else {
                      debouncedSearch(value);
                    }
                  }}
                  placeholder="Search by phone number or PAN..."
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand text-gray-900"
                  autoFocus
                />
                <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </form>

            {/* Loading state */}
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="text-center text-red-500 py-4">
                {error}
              </div>
            )}

            {/* No results */}
            {!isLoading && !error && results.length === 0 && searchQuery && (
              <div className="text-center text-gray-500 py-4">
                No matching records found.
              </div>
            )}

            {/* Results table */}
            {!isLoading && !error && results.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Full Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PAN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead Stage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result) => (
                      <tr 
                        key={result.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          // Handle row click - navigate to detail page or show more info
                          onClose();
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">{result.lead_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">{result.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">{result.pan}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">{result.mobile}</td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-gray-900"
                          title={getLeadStageMeaning(result.lead_stage)}
                        >
                          {leadStageMapping[result.lead_stage] || result.lead_stage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default GlobalSearch; 