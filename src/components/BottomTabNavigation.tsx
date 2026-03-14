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
              style={[styles.tabButton, active ? styles.tabButtonActive : undefined]}
            >
              <Text style={[styles.tabTitle, active ? styles.tabTitleActive : undefined]}>{tab.label}</Text>
              {!!tab.subtitle && (
                <Text style={[styles.tabSubtitle, active ? styles.tabSubtitleActive : undefined]}>
                  {tab.subtitle}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
    backgroundColor: '#f4f7fb',
  },
  tabWrap: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#38bdf8',
  },
  tabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  tabTitleActive: {
    color: '#082f49',
  },
  tabSubtitle: {
    fontSize: 10,
    marginTop: 2,
    color: '#94a3b8',
  },
  tabSubtitleActive: {
    color: '#0c4a6e',
  },
});
