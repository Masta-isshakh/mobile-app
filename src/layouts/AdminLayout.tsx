import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { DepartmentManagementScreen } from '../screens/admin/DepartmentManagementScreen';
import { RolePolicyScreen } from '../screens/admin/RolePolicyScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import type { BottomTabItem, PermissionCheck } from '../types';

type Props = {
  can: PermissionCheck;
};

export function AdminLayout({ can }: Props) {
  const tabs = useMemo<BottomTabItem[]>(() => {
    return [
      { key: 'home', label: 'Home', icon: 'H' },
      { key: 'products', label: 'Products', icon: 'P' },
      { key: 'settings', label: 'Settings', icon: 'S' },
      { key: 'store', label: 'My Store', icon: 'M' },
      { key: 'profile', label: 'Profile', icon: 'U' },
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
      <View style={styles.header}>
        <Text style={styles.title}>Control Center</Text>
        <Text style={styles.subtitle}>Manage users, departments and roles from one settings hub.</Text>
      </View>

      <View style={styles.content}>
        {currentTab === 'home' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Welcome Back</Text>
            <Text style={styles.paragraph}>Use Settings to manage users, departments, and role policies.</Text>
          </View>
        )}

        {currentTab === 'products' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Products</Text>
            <Text style={styles.paragraph}>Product dashboard placeholder. You can plug your product catalog here.</Text>
          </View>
        )}

        {currentTab === 'store' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My Store</Text>
            <Text style={styles.paragraph}>Store analytics placeholder. Add storefront metrics in this area.</Text>
          </View>
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
    backgroundColor: '#efe7ff',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
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
