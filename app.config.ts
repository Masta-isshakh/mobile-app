import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'my_amplify_app',
  slug: 'my_amplify_app',
  version: '1.0.0',
  orientation: 'portrait',
  // Required for expo-updates / EAS Update (OTA bundles)
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/5f63c698-d3e8-4166-86c7-224708732653',
    enabled: true,
    fallbackToCacheTimeout: 0,
  },
  extra: {
    eas: {
      projectId: '5f63c698-d3e8-4166-86c7-224708732653',
    },
  },
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
  plugins: ['expo-sharing', 'expo-mail-composer'],
};

export default config;
