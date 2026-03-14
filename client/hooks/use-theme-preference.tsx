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
import { useColorScheme } from "@/hooks/use-color-scheme";
import { setActiveTheme } from "@/constants/theme";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemePreferenceContextValue = {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  isThemePreferenceLoaded: boolean;
};

const THEME_PREFERENCE_STORAGE_KEY = "@boxit/theme-preference";

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [isThemePreferenceLoaded, setIsThemePreferenceLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadThemePreference = async () => {
      try {
        const storedThemePreference = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);

        if (isMounted && isThemePreference(storedThemePreference)) {
          setThemePreferenceState(storedThemePreference);
        }
      } finally {
        if (isMounted) {
          setIsThemePreferenceLoaded(true);
        }
      }
    };

    void loadThemePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = useCallback(
    async (preference: ThemePreference) => {
      const previousPreference = themePreference;
      setThemePreferenceState(preference);

      try {
        await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
      } catch (error) {
        setThemePreferenceState(previousPreference);
        throw error;
      }
    },
    [themePreference],
  );

  const resolvedTheme: ResolvedTheme =
    themePreference === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : themePreference;

  useEffect(() => {
    setActiveTheme(resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      themePreference,
      resolvedTheme,
      setThemePreference,
      isThemePreferenceLoaded,
    }),
    [isThemePreferenceLoaded, resolvedTheme, setThemePreference, themePreference],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error("useThemePreference must be used within ThemePreferenceProvider");
  }

  return context;
}
