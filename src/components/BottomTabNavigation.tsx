import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/AppThemeContext';
import type { BottomTabItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_SIZE = SCREEN_WIDTH < 380 ? 20 : 22;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  tabs: BottomTabItem[];
  current: string;
  onChange: (key: string) => void;
};

export function BottomTabNavigation({ tabs, current, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useAppTheme();
  // SafeAreaView in parent layouts excludes the bottom edge, so this component
  // owns the bottom inset. Use a small buffer to sit flush near the screen edge.
  const bottomPadding = Math.max(insets.bottom + 8, 14);

  return (
    <View style={[styles.outerWrap, { paddingBottom: bottomPadding }]}>
      <View style={[styles.tabWrap, isDarkMode ? styles.tabWrapDark : undefined]}>
        {tabs.map((tab) => {
          const active = current === tab.key;
          const baseIcon = tab.icon ?? 'ellipse';
          const iconName = (active ? baseIcon : `${baseIcon}-outline`) as IoniconName;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[styles.tabButton, active ? styles.tabButtonActive : undefined]}
            >
              <View
                style={[
                  styles.iconBubble,
                  isDarkMode ? styles.iconBubbleDark : undefined,
                  active ? styles.iconBubbleActive : undefined,
                  active && isDarkMode ? styles.iconBubbleActiveDark : undefined,
                ]}
              >
                {active ? <View style={styles.activeHalo} /> : null}
                <Ionicons
                  name={iconName}
                  size={ICON_SIZE}
                  color={active ? (isDarkMode ? '#64B5F6' : '#1565C0') : isDarkMode ? '#cbd5e1' : '#6b7280'}
                />
              </View>
              <Text
                style={[
                  styles.tabTitle,
                  isDarkMode ? styles.tabTitleDark : undefined,
                  active ? styles.tabTitleActive : undefined,
                  active && isDarkMode ? styles.tabTitleActiveDark : undefined,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    width: '100%',
    paddingHorizontal: 0,
    paddingTop: 8,
    backgroundColor: 'transparent',
    alignItems: 'stretch',
  },
  tabWrap: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },
  tabWrapDark: {
    backgroundColor: '#161b2f',
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(21, 101, 192, 0.08)',
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginBottom: 4,
    overflow: 'hidden',
  },
  activeHalo: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  iconBubbleDark: {
    backgroundColor: '#303657',
  },
  iconBubbleActive: {
    backgroundColor: '#DCEEFF',
  },
  iconBubbleActiveDark: {
    backgroundColor: '#1A3A6B',
  },
  tabTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textAlign: 'center',
  },
  tabTitleDark: {
    color: '#d0d5ea',
  },
  tabTitleActive: {
    color: '#1565C0',
    fontWeight: '800',
  },
  tabTitleActiveDark: {
    color: '#64B5F6',
  },
});
