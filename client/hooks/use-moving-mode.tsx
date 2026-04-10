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
const MOVING_MODE_FROM_NAME_KEY = "@boxit/moving-mode-from-name";
const MOVING_MODE_TO_NAME_KEY = "@boxit/moving-mode-to-name";

type MovingModeContextValue = {
  isMovingActive: boolean;
  isMovingModeLoaded: boolean;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromLocationName: string | null;
  toLocationName: string | null;
  startMoving: (fromLocationId: string, fromLocationName: string, toLocationId: string, toLocationName: string) => Promise<void>;
  stopMoving: () => Promise<void>;
};

const MovingModeContext = createContext<MovingModeContextValue | null>(null);

export function MovingModeProvider({ children }: { children: ReactNode }) {
  const [isMovingActive, setIsMovingActive] = useState(false);
  const [isMovingModeLoaded, setIsMovingModeLoaded] = useState(false);
  const [fromLocationId, setFromLocationId] = useState<string | null>(null);
  const [toLocationId, setToLocationId] = useState<string | null>(null);
  const [fromLocationName, setFromLocationName] = useState<string | null>(null);
  const [toLocationName, setToLocationName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMovingMode = async () => {
      try {
        const [stored, from, to, fromName, toName] = await AsyncStorage.multiGet([
          MOVING_MODE_STORAGE_KEY,
          MOVING_MODE_FROM_KEY,
          MOVING_MODE_TO_KEY,
          MOVING_MODE_FROM_NAME_KEY,
          MOVING_MODE_TO_NAME_KEY,
        ]);

        if (isMounted) {
          setIsMovingActive(stored[1] === "true");
          setFromLocationId(from[1] ?? null);
          setToLocationId(to[1] ?? null);
          setFromLocationName(fromName[1] ?? null);
          setToLocationName(toName[1] ?? null);
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

  const startMoving = useCallback(async (from: string, fromName: string, to: string, toName: string) => {
    setIsMovingActive(true);
    setFromLocationId(from);
    setToLocationId(to);
    setFromLocationName(fromName);
    setToLocationName(toName);
    try {
      await AsyncStorage.multiSet([
        [MOVING_MODE_STORAGE_KEY, "true"],
        [MOVING_MODE_FROM_KEY, from],
        [MOVING_MODE_TO_KEY, to],
        [MOVING_MODE_FROM_NAME_KEY, fromName],
        [MOVING_MODE_TO_NAME_KEY, toName],
      ]);
    } catch (error) {
      setIsMovingActive(false);
      setFromLocationId(null);
      setToLocationId(null);
      setFromLocationName(null);
      setToLocationName(null);
      throw error;
    }
  }, []);

  const stopMoving = useCallback(async () => {
    setIsMovingActive(false);
    setFromLocationId(null);
    setToLocationId(null);
    setFromLocationName(null);
    setToLocationName(null);
    try {
      await AsyncStorage.multiSet([
        [MOVING_MODE_STORAGE_KEY, "false"],
        [MOVING_MODE_FROM_KEY, ""],
        [MOVING_MODE_TO_KEY, ""],
        [MOVING_MODE_FROM_NAME_KEY, ""],
        [MOVING_MODE_TO_NAME_KEY, ""],
      ]);
    } catch (error) {
      setIsMovingActive(true);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ isMovingActive, isMovingModeLoaded, fromLocationId, toLocationId, fromLocationName, toLocationName, startMoving, stopMoving }),
    [isMovingActive, isMovingModeLoaded, fromLocationId, toLocationId, fromLocationName, toLocationName, startMoving, stopMoving],
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
