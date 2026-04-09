/** @type {import('jest-expo').JestExpoConfig} */
module.exports = {
  preset: 'jest-expo',

  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{spec,test}.{ts,tsx}',
  ],

  collectCoverageFrom: [
    'utils/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],

  setupFilesAfterEnv: [
    '@testing-library/react-native/extend-expect',
    'react-native-gesture-handler/jestSetup',
    './jest.setup.ts',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^nativewind$': 'nativewind/dist/index',
    '^react-native-reanimated$': 'react-native-reanimated/mock',
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '\\.(png|jpg|jpeg|gif|webp|svg|ttf|otf|woff|woff2)$':
      '<rootDir>/__mocks__/fileMock.js',
  },

  transformIgnorePatterns: [
    'node_modules/(?!(' + [
      'expo',
      'expo-router',
      'expo-modules-core',
      'expo-constants',
      'expo-secure-store',
      'expo-font',
      'expo-asset',
      'expo-linking',
      'expo-web-browser',
      'expo-status-bar',
      'expo-haptics',
      'expo-splash-screen',
      'expo-system-ui',
      'expo-camera',
      'expo-image',
      'expo-print',
      '@expo',
      '@expo/vector-icons',
      '@react-native',
      'react-native',
      'react-native-gesture-handler',
      'react-native-reanimated',
      'react-native-safe-area-context',
      'react-native-screens',
      'react-native-svg',
      'react-native-url-polyfill',
      'react-native-worklets',
      'nativewind',
      'react-native-css-interop',
      '@react-navigation',
    ].join('|') + ')/)',
  ],

  moduleDirectories: ['node_modules', '<rootDir>'],
};
