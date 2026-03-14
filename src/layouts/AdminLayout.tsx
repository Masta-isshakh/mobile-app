import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { DepartmentManagementScreen } from '../screens/admin/DepartmentManagementScreen';
import { RolePolicyScreen } from '../screens/admin/RolePolicyScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { MyStoreScreen } from '../screens/products/MyStoreScreen';
import { ProductCatalogScreen } from '../screens/products/ProductCatalogScreen';
import type { AuthUserContext, BottomTabItem, PermissionCheck } from '../types';

type Props = {
  can: PermissionCheck;
  authUser: AuthUserContext;
};

export function AdminLayout({ can, authUser }: Props) {
  const tabs = useMemo<BottomTabItem[]>(() => {
    return [
      { key: 'home', label: 'Home', icon: 'home' },
      { key: 'products', label: 'Products', icon: 'grid' },
      { key: 'settings', label: 'Settings', icon: 'settings' },
      { key: 'store', label: 'My Store', icon: 'storefront' },
      { key: 'profile', label: 'Profile', icon: 'person' },
    ];
  }, [can]);

  const [tab, setTab] = useState<string>('home');
  const [settingsTab, setSettingsTab] = useState<'users' | 'departments' | 'roles'>('users');

  const currentTab = tabs.some((item) => item.key === tab) ? tab : 'home';

  const settingsItems = [
    { key: 'users', label: 'User Management' },
    { key: 'departments', label: 'Department Management' },
    { key: 'roles', label: 'Role Management' },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>


      <View style={styles.content}>
        {currentTab === 'home' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Welcome Back</Text>
            <Text style={styles.paragraph}>Use Settings to manage users, departments, and role policies.</Text>
          </View>
        )}

        {currentTab === 'products' && (
          <ProductCatalogScreen authUser={authUser} />
        )}

        {currentTab === 'store' && (
          <MyStoreScreen authUser={authUser} isAdmin />
        )}

        {currentTab === 'profile' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.paragraph}>Profile preferences placeholder. Add profile controls here.</Text>
          </View>
        )}

        {currentTab === 'settings' && (
          <>
            <View style={styles.settingsTabBar}>
              {settingsItems.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setSettingsTab(item.key)}
                  style={[
                    styles.settingsTabButton,
                    settingsTab === item.key ? styles.settingsTabButtonActive : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingsTabText,
                      settingsTab === item.key ? styles.settingsTabTextActive : undefined,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {settingsTab === 'users' && <UserManagementScreen can={can} />}
            {settingsTab === 'departments' && <DepartmentManagementScreen can={can} />}
            {settingsTab === 'roles' && <RolePolicyScreen can={can} />}
          </>
        )}
      </View>

      <BottomTabNavigation tabs={tabs} current={currentTab} onChange={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    backgroundColor: '#efe7ff',
  },

  content: {
    flex: 1,
  },
  card: {
    margin: 12,
    backgroundColor: '#ffffffcc',
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2a2f52',
  },
  paragraph: {
    marginTop: 8,
    fontSize: 14,
    color: '#515e78',
    lineHeight: 20,
  },
  settingsTabBar: {
    marginHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 6,
    flexDirection: 'row',
    gap: 6,
  },
  settingsTabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  settingsTabButtonActive: {
    backgroundColor: '#efe4ff',
  },
  settingsTabText: {
    fontSize: 12,
    color: '#5e6a84',
    fontWeight: '700',
    textAlign: 'center',
  },
  settingsTabTextActive: {
    color: '#6d28d9',
  },
});
