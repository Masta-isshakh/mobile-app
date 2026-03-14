import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
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
    const next: BottomTabItem[] = [];
    if (can('page.users', 'view')) {
      next.push({ key: 'users', label: 'Users', subtitle: 'Accounts' });
    }
    if (can('page.departments', 'view')) {
      next.push({ key: 'departments', label: 'Departments', subtitle: 'Structure' });
    }
    if (can('page.access', 'view')) {
      next.push({ key: 'access', label: 'Roles & Policies', subtitle: 'Control' });
    }
    return next;
  }, [can]);

  const [tab, setTab] = useState<string>(tabs[0]?.key ?? '');

  if (!tabs.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>No Admin Pages Enabled</Text>
          <Text style={styles.subtitle}>
            Go to Roles & Policies and enable page permissions for this role.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentTab = tabs.some((item) => item.key === tab) ? tab : tabs[0].key;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Control Center</Text>
        <Text style={styles.subtitle}>Users, departments, and full page/action access governance</Text>
      </View>

      <View style={styles.content}>
        {currentTab === 'users' && <UserManagementScreen can={can} />}
        {currentTab === 'departments' && <DepartmentManagementScreen can={can} />}
        {currentTab === 'access' && <RolePolicyScreen can={can} />}
      </View>

      <BottomTabNavigation tabs={tabs} current={currentTab} onChange={setTab} />
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
  card: {
    margin: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
  },
});
