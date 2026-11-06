import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import useDebounce from '../../Pages/screener/useDebounce';

const SearchField = ({ onSearch, defaultValue = '' }) => {
  const [input, setInput] = useState(defaultValue);
  const debouncedInput = useDebounce(input, 500);

  useEffect(() => {
    onSearch && onSearch(debouncedInput.trim());
    // eslint-disable-next-line
  }, [debouncedInput]);

  const handleClear = () => {
    setInput("");
    // Ensure clearing immediately updates results (no debounce delay)
    onSearch && onSearch("");
  };

  return (
    <div className="p-2 w-full">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search in any field..."
          value={input}
          onChange={e => setInput(e.target.value.trim())}
          className="w-full text-gray-900 pl-10 pr-10 py-1.5 h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand/15 focus:border-brand"
        />
        {input && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchField;
