import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app_theme_dark_mode';

type AppThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  accent: string;
  danger: string;
};

type AppThemeContextValue = {
  isDarkMode: boolean;
  isThemeReady: boolean;
  colors: AppThemeColors;
  setIsDarkMode: (value: boolean) => void;
};

const lightColors: AppThemeColors = {
  background: '#EEF4FF',
  surface: '#ffffff',
  surfaceMuted: '#F0F7FF',
  text: '#0D1B2A',
  textMuted: '#5A7093',
  border: '#C5D8F0',
  primary: '#1565C0',
  accent: '#F7941D',
  danger: '#D32F2F',
};

const darkColors: AppThemeColors = {
  background: '#0B1630',
  surface: '#132040',
  surfaceMuted: '#1A2E55',
  text: '#E8EFF8',
  textMuted: '#8DACC8',
  border: '#2A3D5C',
  primary: '#64B5F6',
  accent: '#FFAB40',
  danger: '#EF5350',
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: Props) {
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPreference = async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!mounted) {
          return;
        }
        if (raw === 'true' || raw === 'false') {
          setIsDarkModeState(raw === 'true');
        }
      } finally {
        if (mounted) {
          setIsThemeReady(true);
        }
      }
    };

    void loadPreference();
    return () => {
      mounted = false;
    };
  }, []);

  const setIsDarkMode = useCallback((value: boolean) => {
    setIsDarkModeState(value);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, String(value));
  }, []);

  const value = useMemo<AppThemeContextValue>(() => {
    return {
      isDarkMode,
      isThemeReady,
      colors: isDarkMode ? darkColors : lightColors,
      setIsDarkMode,
    };
  }, [isDarkMode, isThemeReady, setIsDarkMode]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}
