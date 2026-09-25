/** UI component tests: React Native Testing Library + Jest (jest-expo), per docs/11 §7. */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-svg|react-native-reanimated|react-native-worklets|phosphor-react-native|@toli/.*))',
  ],
};
