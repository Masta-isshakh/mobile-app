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
  danger: string;
};

type AppThemeContextValue = {
  isDarkMode: boolean;
  isThemeReady: boolean;
  colors: AppThemeColors;
  setIsDarkMode: (value: boolean) => void;
};

const lightColors: AppThemeColors = {
  background: '#efe7ff',
  surface: '#ffffff',
  surfaceMuted: '#f5f1ff',
  text: '#1f2a44',
  textMuted: '#5b6880',
  border: '#d9e2f0',
  primary: '#7c3aed',
  danger: '#dc2626',
};

const darkColors: AppThemeColors = {
  background: '#121326',
  surface: '#1e2138',
  surfaceMuted: '#2b2f4d',
  text: '#f5f7ff',
  textMuted: '#c7cdea',
  border: '#373d63',
  primary: '#a78bfa',
  danger: '#f87171',
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
