import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { client } from '../../lib/amplifyClient';
import type { AppUser, AuthUserContext, PermissionCheck, Policy, RolePolicy, UserRole } from '../../types';

type Props = {
  can: PermissionCheck;
  authUser: AuthUserContext;
};

export function FreelancerScreen({ can, authUser }: Props) {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canViewPage = can('page.freelancer', 'view') || can('page.users', 'view');

  const loadData = useCallback(async () => {
    try {
      let currentProfile: AppUser | null = null;

      if (authUser.username) {
        const byPreferred = await client.models.AppUser.list({
          filter: { username: { eq: authUser.username } },
        });
        currentProfile = (byPreferred.data?.[0] ?? null) as AppUser | null;
      }

      if (!currentProfile && authUser.email) {
        const byEmail = await client.models.AppUser.list({
          filter: { email: { eq: authUser.email.toLowerCase() } },
        });
        currentProfile = (byEmail.data?.[0] ?? null) as AppUser | null;
      }

      if (!currentProfile && authUser.cognitoUsername) {
        const byCognitoUsername = await client.models.AppUser.list({
          filter: { cognitoUsername: { eq: authUser.cognitoUsername } },
        });
        currentProfile = (byCognitoUsername.data?.[0] ?? null) as AppUser | null;
      }

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
  }, [authUser.cognitoUsername, authUser.email, authUser.username]);

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

  const capabilityHighlights = useMemo(() => {
    return groupedPolicies
      .flatMap(([resource, items]) => items.map((item) => `${resource} · ${item.action}`))
      .slice(0, 6);
  }, [groupedPolicies]);

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
        <View style={styles.heroCard}>
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowAccent} />
          <Text style={styles.heroEyebrow}>Freelancer Hub</Text>
          <Text style={styles.heroTitle}>A polished workspace to sell, follow up, and keep every customer relationship organized.</Text>
          <Text style={styles.heroText}>Track your permissions, keep contact details complete, and use the Orders area to share receipts, invoices, delivery notes, and warranty certificates with confidence.</Text>

          <View style={styles.heroStatRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{capabilityHighlights.length || 0}</Text>
              <Text style={styles.heroStatLabel}>Live capabilities</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{profile?.status ?? 'ACTIVE'}</Text>
              <Text style={styles.heroStatLabel}>Profile status</Text>
            </View>
          </View>
        </View>

        {!!error && (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Snapshot</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-circle-outline" size={18} color="#1565C0" />
            <Text style={styles.metaText}>Preferred Username: {profile?.username ?? authUser.username ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#1565C0" />
            <Text style={styles.metaText}>Email: {profile?.email ?? authUser.email ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#1565C0" />
            <Text style={styles.metaText}>Status: {profile?.status ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Communication Ready</Text>
          <Text style={styles.metaText}>Capture a mobile number for WhatsApp follow-up and an email address for receipts, invoices, and warranty certificates during checkout.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Enabled Access</Text>
          {groupedPolicies.length === 0 && (
            <Text style={styles.metaText}>No actions enabled for this user yet.</Text>
          )}

          {capabilityHighlights.length > 0 ? (
            <View style={styles.capabilityWrap}>
              {capabilityHighlights.map((entry) => (
                <View key={entry} style={styles.capabilityChip}>
                  <Text style={styles.capabilityChipText}>{entry}</Text>
                </View>
              ))}
            </View>
          ) : null}

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
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#092c5d',
    padding: 20,
    overflow: 'hidden',
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(21, 101, 192, 0.45)',
    right: -56,
    top: -80,
  },
  heroGlowAccent: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(247, 148, 29, 0.22)',
    left: -30,
    bottom: -34,
  },
  heroEyebrow: {
    color: '#f7c37b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 21,
  },
  heroStatRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  heroStatLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
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
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  capabilityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  capabilityChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e9f2ff',
  },
  capabilityChipText: {
    color: '#0b4ea2',
    fontSize: 12,
    fontWeight: '800',
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
