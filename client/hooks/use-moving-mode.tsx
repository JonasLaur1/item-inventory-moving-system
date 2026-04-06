import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const MOVING_MODE_STORAGE_KEY = "@boxit/moving-mode-active";
const MOVING_MODE_FROM_KEY = "@boxit/moving-mode-from";
const MOVING_MODE_TO_KEY = "@boxit/moving-mode-to";

type MovingModeContextValue = {
  isMovingActive: boolean;
  isMovingModeLoaded: boolean;
  fromLocationId: string | null;
  toLocationId: string | null;
  startMoving: (fromLocationId: string, toLocationId: string) => Promise<void>;
  stopMoving: () => Promise<void>;
};

const MovingModeContext = createContext<MovingModeContextValue | null>(null);

export function MovingModeProvider({ children }: { children: ReactNode }) {
  const [isMovingActive, setIsMovingActive] = useState(false);
  const [isMovingModeLoaded, setIsMovingModeLoaded] = useState(false);
  const [fromLocationId, setFromLocationId] = useState<string | null>(null);
  const [toLocationId, setToLocationId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMovingMode = async () => {
      try {
        const [stored, from, to] = await AsyncStorage.multiGet([
          MOVING_MODE_STORAGE_KEY,
          MOVING_MODE_FROM_KEY,
          MOVING_MODE_TO_KEY,
        ]);

        if (isMounted) {
          setIsMovingActive(stored[1] === "true");
          setFromLocationId(from[1] ?? null);
          setToLocationId(to[1] ?? null);
        }
      } finally {
        if (isMounted) {
          setIsMovingModeLoaded(true);
        }
      }
    };

    void loadMovingMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const startMoving = useCallback(async (from: string, to: string) => {
    setIsMovingActive(true);
    setFromLocationId(from);
    setToLocationId(to);
    try {
      await AsyncStorage.multiSet([
        [MOVING_MODE_STORAGE_KEY, "true"],
        [MOVING_MODE_FROM_KEY, from],
        [MOVING_MODE_TO_KEY, to],
      ]);
    } catch (error) {
      setIsMovingActive(false);
      setFromLocationId(null);
      setToLocationId(null);
      throw error;
    }
  }, []);

  const stopMoving = useCallback(async () => {
    setIsMovingActive(false);
    setFromLocationId(null);
    setToLocationId(null);
    try {
      await AsyncStorage.multiSet([
        [MOVING_MODE_STORAGE_KEY, "false"],
        [MOVING_MODE_FROM_KEY, ""],
        [MOVING_MODE_TO_KEY, ""],
      ]);
    } catch (error) {
      setIsMovingActive(true);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ isMovingActive, isMovingModeLoaded, fromLocationId, toLocationId, startMoving, stopMoving }),
    [isMovingActive, isMovingModeLoaded, fromLocationId, toLocationId, startMoving, stopMoving],
  );

  return <MovingModeContext.Provider value={value}>{children}</MovingModeContext.Provider>;
}

export function useMovingMode() {
  const context = useContext(MovingModeContext);

  if (!context) {
    throw new Error("useMovingMode must be used within MovingModeProvider");
  }

  return context;
}
