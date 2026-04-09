// Mock expo-secure-store: used by lib/supabase.ts but relies on native keychain
// APIs that do not exist in Jest's Node.js environment.
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
