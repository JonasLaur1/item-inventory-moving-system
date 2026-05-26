// Mock expo-secure-store: used by lib/supabase.ts but relies on native keychain
// APIs that do not exist in Jest's Node.js environment.
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Initialize i18n so useTranslation() and i18n.t() resolve to actual strings.
// Resources are provided inline so init is synchronous.
import "@/lib/i18n";
