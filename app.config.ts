import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'my_amplify_app',
  slug: 'my_amplify_app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.anonymous.my_amplify_app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-sharing'],
};

export default config;
