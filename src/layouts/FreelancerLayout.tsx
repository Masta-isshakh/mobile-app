import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { FreelancerScreen } from '../screens/freelancer/FreelancerScreen';
import type { BottomTabItem, PermissionCheck } from '../types';

type Props = {
  can: PermissionCheck;
};

export function FreelancerLayout({ can }: Props) {
  const tabs = useMemo<BottomTabItem[]>(() => {
    return [{ key: 'workspace', label: 'Workspace', subtitle: 'My Access' }];
  }, []);

  const [tab, setTab] = useState<string>('workspace');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Freelancer Workspace</Text>
        <Text style={styles.subtitle}>Navigation and actions are governed by role policies</Text>
      </View>

      <View style={styles.content}>{tab === 'workspace' && <FreelancerScreen can={can} />}</View>

      <BottomTabNavigation tabs={tabs} current={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#12263a',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#4f5d75',
  },
  content: {
    flex: 1,
  },
});
