import { useEffect, useState } from "react";

import { itemService, type ItemSearchResult } from "@/lib/item.service";

type UseSearchResult = {
  itemResults: ItemSearchResult[];
  isSearching: boolean;
};

export function useSearch(query: string): UseSearchResult {
  const [itemResults, setItemResults] = useState<ItemSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setItemResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timeout = setTimeout(() => {
      void itemService.searchItems(trimmed).then((results) => {
        setItemResults(results);
        setIsSearching(false);
      }).catch(() => {
        setItemResults([]);
        setIsSearching(false);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return { itemResults, isSearching };
}
