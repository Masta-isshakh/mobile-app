import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '../../lib/amplifyClient';
import type { AppUser, PermissionCheck, Policy, RolePolicy, UserRole } from '../../types';

type Props = {
  can: PermissionCheck;
};

export function FreelancerScreen({ can }: Props) {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canViewPage = can('page.freelancer', 'view') || can('page.users', 'view');

  const loadData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const usersResponse = await client.models.AppUser.list({
        filter: { username: { eq: user.username } },
      });
      const currentProfile = usersResponse.data?.[0] ?? null;
      setProfile(currentProfile);

      if (!currentProfile?.id) {
        setPolicies([]);
        return;
      }

      const [userRolesResponse, rolePoliciesResponse, policiesResponse] = await Promise.all([
        client.models.UserRole.list({ filter: { userId: { eq: currentProfile.id } } }),
        client.models.RolePolicy.list(),
        client.models.Policy.list(),
      ]);

      const roleIds = new Set<string>((userRolesResponse.data ?? []).map((item: UserRole) => item.roleId));
      const rolePolicyRows = (rolePoliciesResponse.data ?? []).filter((rp: RolePolicy) => roleIds.has(rp.roleId));
      const allowedPolicyIds = new Set<string>(
        rolePolicyRows
          .filter((rp: RolePolicy) => (rp.effect ?? 'ALLOW') === 'ALLOW')
          .map((rp: RolePolicy) => rp.policyId),
      );

      setPolicies((policiesResponse.data ?? []).filter((policy: Policy) => allowedPolicyIds.has(policy.id)));
    } catch (loadError: unknown) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch((caughtError: unknown) => {
      setError((caughtError as Error).message);
      setLoading(false);
    });
  }, [loadData]);

  const groupedPolicies = useMemo(() => {
    const groups = new Map<string, Policy[]>();
    for (const policy of policies) {
      const key = policy.resource;
      const current = groups.get(key) ?? [];
      current.push(policy);
      groups.set(key, current);
    }
    return Array.from(groups.entries());
  }, [policies]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!canViewPage) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>No Access</Text>
          <Text style={styles.metaText}>Your current role does not allow this page.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentWrap}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Freelancer Workspace</Text>
          <Text style={styles.metaText}>This page reflects what your role policy allows.</Text>
        </View>

        {!!error && (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.metaText}>Username: {profile?.username ?? '-'}</Text>
          <Text style={styles.metaText}>Email: {profile?.email ?? '-'}</Text>
          <Text style={styles.metaText}>Status: {profile?.status ?? '-'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Enabled Access</Text>
          {groupedPolicies.length === 0 && (
            <Text style={styles.metaText}>No actions enabled for this user yet.</Text>
          )}

          {groupedPolicies.map(([resource, items]) => (
            <View key={resource} style={styles.groupWrap}>
              <Text style={styles.groupTitle}>{resource}</Text>
              {items.map((policy) => (
                <Text key={policy.id} style={styles.metaText}>
                  - {policy.action} ({policy.name})
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
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
  contentWrap: {
    padding: 12,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12263a',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#4f5d75',
    marginTop: 2,
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  groupWrap: {
    marginTop: 10,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
});
