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

type MovingModeContextValue = {
  isMovingActive: boolean;
  isMovingModeLoaded: boolean;
  startMoving: () => Promise<void>;
  stopMoving: () => Promise<void>;
};

const MovingModeContext = createContext<MovingModeContextValue | null>(null);

export function MovingModeProvider({ children }: { children: ReactNode }) {
  const [isMovingActive, setIsMovingActive] = useState(false);
  const [isMovingModeLoaded, setIsMovingModeLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMovingMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(MOVING_MODE_STORAGE_KEY);

        if (isMounted) {
          setIsMovingActive(stored === "true");
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

  const startMoving = useCallback(async () => {
    setIsMovingActive(true);
    try {
      await AsyncStorage.setItem(MOVING_MODE_STORAGE_KEY, "true");
    } catch (error) {
      setIsMovingActive(false);
      throw error;
    }
  }, []);

  const stopMoving = useCallback(async () => {
    setIsMovingActive(false);
    try {
      await AsyncStorage.setItem(MOVING_MODE_STORAGE_KEY, "false");
    } catch (error) {
      setIsMovingActive(true);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ isMovingActive, isMovingModeLoaded, startMoving, stopMoving }),
    [isMovingActive, isMovingModeLoaded, startMoving, stopMoving],
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
