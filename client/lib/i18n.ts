import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import lt from "@/locales/lt.json";

export type AppLanguage = "en" | "lt";

export const SUPPORTED_LANGUAGES: { value: AppLanguage; labelEn: string; labelNative: string }[] = [
  { value: "en", labelEn: "English", labelNative: "English" },
  { value: "lt", labelEn: "Lithuanian", labelNative: "Lietuvių" },
];

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    lt: { translation: lt },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
