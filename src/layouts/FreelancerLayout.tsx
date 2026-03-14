import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { FreelancerScreen } from '../screens/freelancer/FreelancerScreen';
import { MyStoreScreen } from '../screens/products/MyStoreScreen';
import { ProductCatalogScreen } from '../screens/products/ProductCatalogScreen';
import type { AuthUserContext, BottomTabItem, PermissionCheck } from '../types';

type Props = {
  can: PermissionCheck;
  authUser: AuthUserContext;
};

export function FreelancerLayout({ can, authUser }: Props) {
  const tabs = useMemo<BottomTabItem[]>(() => {
    return [
      { key: 'home', label: 'Home', icon: 'home' },
      { key: 'products', label: 'Products', icon: 'grid' },
      { key: 'settings', label: 'Settings', icon: 'settings' },
      { key: 'store', label: 'My Store', icon: 'storefront' },
      { key: 'profile', label: 'Profile', icon: 'person' },
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
          <ProductCatalogScreen authUser={authUser} />
        )}

        {tab === 'settings' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardText}>Account and notification settings can be managed here.</Text>
          </View>
        )}

        {tab === 'store' && (
          <MyStoreScreen authUser={authUser} isAdmin={false} />
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
