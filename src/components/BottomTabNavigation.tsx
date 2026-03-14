import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabItem } from '../types';

type Props = {
  tabs: BottomTabItem[];
  current: string;
  onChange: (key: string) => void;
};

export function BottomTabNavigation({ tabs, current, onChange }: Props) {
  return (
    <View style={styles.outerWrap}>
      <View style={styles.tabWrap}>
        {tabs.map((tab) => {
          const active = current === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={styles.tabButton}
            >
              <View style={[styles.iconBubble, active ? styles.iconBubbleActive : undefined]}>
                <Text style={[styles.iconText, active ? styles.iconTextActive : undefined]}>{tab.icon ?? 'o'}</Text>
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
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  tabWrap: {
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
  iconText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '700',
  },
  iconTextActive: {
    color: '#8b3cf6',
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
