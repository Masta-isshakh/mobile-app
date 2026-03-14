import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { client } from './lib/amplifyClient';
import { buildPermissionSet } from './lib/permissions';
import { AdminLayout } from './layouts/AdminLayout';
import { FreelancerLayout } from './layouts/FreelancerLayout';
import type { AppUser, AuthUserContext, Policy, RolePolicy, UserRole } from './types';

type AuthState = {
  loading: boolean;
  roleError: string;
  isAdminGroup: boolean;
  permissionKeys: Set<string>;
  currentProfile: AppUser | null;
  authUser: AuthUserContext;
};

export function AppShell() {
  const [state, setState] = useState<AuthState>({
    loading: true,
    roleError: '',
    isAdminGroup: false,
    permissionKeys: new Set<string>(),
    currentProfile: null,
    authUser: { sub: '', username: '' },
  });

  const loadAuthContext = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const tokenPayload = session.tokens?.idToken?.payload as
        | { 'cognito:groups'?: string[]; sub?: string }
        | undefined;
      const groups = tokenPayload?.['cognito:groups'] ?? [];
      const isAdminGroup = groups.includes('ADMIN');

      const currentUser = await getCurrentUser();
      const authUser: AuthUserContext = {
        sub: tokenPayload?.sub ?? '',
        username: currentUser.username,
      };

      const usersResponse = await client.models.AppUser.list({
        filter: { username: { eq: currentUser.username } },
      });

      const currentProfile = (usersResponse.data?.[0] ?? null) as AppUser | null;

      let permissionKeys = new Set<string>();
      if (currentProfile?.id) {
        const [userRolesResponse, rolePoliciesResponse, policiesResponse] = await Promise.all([
          client.models.UserRole.list({ filter: { userId: { eq: currentProfile.id } } }),
          client.models.RolePolicy.list(),
          client.models.Policy.list(),
        ]);

        const roleIds = (userRolesResponse.data ?? []).map((row: UserRole) => row.roleId);
        permissionKeys = buildPermissionSet(
          roleIds,
          (policiesResponse.data ?? []) as Policy[],
          (rolePoliciesResponse.data ?? []) as RolePolicy[],
        );
      }

      setState({
        loading: false,
        roleError: '',
        isAdminGroup,
        permissionKeys,
        currentProfile,
        authUser,
      });
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        roleError: (error as Error).message,
      }));
    }
  }, []);

  useEffect(() => {
    loadAuthContext().catch((error: unknown) => {
      setState((prev) => ({
        ...prev,
        loading: false,
        roleError: (error as Error).message,
      }));
    });
  }, [loadAuthContext]);

  const can = useMemo(() => {
    const isBootstrapAdmin = state.isAdminGroup && state.permissionKeys.size === 0;
    return (resource: string, action: string) => {
      if (isBootstrapAdmin) {
        return true;
      }
      return state.permissionKeys.has(`${resource}:${action}`);
    };
  }, [state.isAdminGroup, state.permissionKeys]);

  if (state.loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (state.roleError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Unable to load authorization context</Text>
          <Text style={styles.paragraph}>{state.roleError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return state.isAdminGroup ? (
    <AdminLayout can={can} authUser={state.authUser} />
  ) : (
    <FreelancerLayout can={can} authUser={state.authUser} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7fb',
  },
  card: {
    margin: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12263a',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#4f5d75',
  },
});
