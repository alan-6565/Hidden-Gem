import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_SEARCH_FILTERS, SearchFilterState } from '../utils/searchFilters';

interface SearchFilterContextValue {
  filters: SearchFilterState;
  setFilters: (filters: SearchFilterState) => void;
  resetFilters: () => void;
}

const SearchFilterContext = createContext<SearchFilterContextValue | undefined>(undefined);

export function SearchFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<SearchFilterState>(DEFAULT_SEARCH_FILTERS);
  const resetFilters = () => setFilters(DEFAULT_SEARCH_FILTERS);

  return (
    <SearchFilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </SearchFilterContext.Provider>
  );
}

export function useSearchFilters(): SearchFilterContextValue {
  const ctx = useContext(SearchFilterContext);
  if (!ctx) throw new Error('useSearchFilters must be used within a SearchFilterProvider');
  return ctx;
}
