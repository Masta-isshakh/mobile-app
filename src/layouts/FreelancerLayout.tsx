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
    return [
      { key: 'home', label: 'Home', icon: 'H' },
      { key: 'products', label: 'Products', icon: 'P' },
      { key: 'settings', label: 'Settings', icon: 'S' },
      { key: 'store', label: 'My Store', icon: 'M' },
      { key: 'profile', label: 'Profile', icon: 'U' },
    ];
  }, []);

  const [tab, setTab] = useState<string>('home');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Freelancer Hub</Text>
        <Text style={styles.subtitle}>Your permissions shape what you can access in every section.</Text>
      </View>

      <View style={styles.content}>
        {tab === 'home' && <FreelancerScreen can={can} />}

        {tab === 'products' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Products</Text>
            <Text style={styles.cardText}>Product area placeholder for freelancer-specific catalog data.</Text>
          </View>
        )}

        {tab === 'settings' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardText}>Account and notification settings can be managed here.</Text>
          </View>
        )}

        {tab === 'store' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Store</Text>
            <Text style={styles.cardText}>Store performance and activity summary placeholder.</Text>
          </View>
        )}

        {tab === 'profile' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardText}>Profile details and preferences placeholder.</Text>
          </View>
        )}
      </View>

      <BottomTabNavigation tabs={tabs} current={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efe7ff',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#30125d',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#5b4b7a',
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#ffffffcc',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2a2f52',
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    color: '#515e78',
    lineHeight: 20,
  },
});
