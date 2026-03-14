import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_SIZE = SCREEN_WIDTH < 380 ? 20 : 22;
const TAB_MAX_WIDTH = SCREEN_WIDTH > 760 ? 720 : SCREEN_WIDTH > 520 ? 560 : 440;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  tabs: BottomTabItem[];
  current: string;
  onChange: (key: string) => void;
};

export function BottomTabNavigation({ tabs, current, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom + (Platform.OS === 'android' ? 18 : 10), 22);

  return (
    <View style={[styles.outerWrap, { paddingBottom: bottomPadding }]}>
      <View style={[styles.tabWrap, { maxWidth: TAB_MAX_WIDTH }]}> 
        {tabs.map((tab) => {
          const active = current === tab.key;
          const baseIcon = tab.icon ?? 'ellipse';
          const iconName = (active ? baseIcon : `${baseIcon}-outline`) as IoniconName;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={styles.tabButton}
            >
              <View style={[styles.iconBubble, active ? styles.iconBubbleActive : undefined]}>
                <Ionicons
                  name={iconName}
                  size={ICON_SIZE}
                  color={active ? '#8b3cf6' : '#6b7280'}
                />
              </View>
              <Text style={[styles.tabTitle, active ? styles.tabTitleActive : undefined]}>{tab.label}</Text>
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
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tabWrap: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginBottom: 4,
  },
  iconBubbleActive: {
    backgroundColor: '#efe4ff',
  },
  tabTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTitleActive: {
    color: '#7c3aed',
    fontWeight: '800',
  },
});
