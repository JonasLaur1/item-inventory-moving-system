import { createContext, useCallback, useContext, useState } from "react";

type InventoryFilterContextValue = {
  locationFilter: string;
  roomFilter: string;
  setInventoryFilters: (location: string, room: string) => void;
  previousRoute: string;
  setPreviousRoute: (route: string) => void;
};

const InventoryFilterContext = createContext<InventoryFilterContextValue>({
  locationFilter: "All",
  roomFilter: "All",
  setInventoryFilters: () => undefined,
  previousRoute: "/(tabs)/inventory",
  setPreviousRoute: () => undefined,
});

export function InventoryFilterProvider({ children }: { children: React.ReactNode }) {
  const [locationFilter, setLocationFilter] = useState("All");
  const [roomFilter, setRoomFilter] = useState("All");
  const [previousRoute, setPreviousRoute] = useState("/(tabs)/inventory");

  const setInventoryFilters = useCallback((location: string, room: string) => {
    setLocationFilter(location);
    setRoomFilter(room);
  }, []);

  return (
    <InventoryFilterContext.Provider
      value={{ locationFilter, roomFilter, setInventoryFilters, previousRoute, setPreviousRoute }}
    >
      {children}
    </InventoryFilterContext.Provider>
  );
}

export function useInventoryFilter() {
  return useContext(InventoryFilterContext);
}
