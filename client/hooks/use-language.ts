import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { type AppLanguage } from "@/lib/i18n";

const LANGUAGE_KEY = "@app_language";

export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<AppLanguage>(i18n.language as AppLanguage);

  useEffect(() => {
    setLanguage(i18n.language as AppLanguage);
  }, [i18n.language]);

  const changeLanguage = useCallback(
    async (lang: AppLanguage) => {
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguage(lang);
    },
    [i18n],
  );

  return { language, changeLanguage };
}

export async function loadSavedLanguage(): Promise<AppLanguage | null> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    return saved === "en" || saved === "lt" ? saved : null;
  } catch {
    return null;
  }
}
