import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../lib/amplifyClient';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import type { AuthUserContext } from '../types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  authUser: AuthUserContext;
  role: 'Admin' | 'Freelancer';
};

type ProfilePreferences = {
  notificationsEnabled: boolean;
  darkMode: boolean;
  language: 'English' | 'Arabic' | 'French';
};

type ProfileStats = {
  products: number;
  rating: string;
  orders: number;
};

const DEFAULT_PREFERENCES: ProfilePreferences = {
  notificationsEnabled: true,
  darkMode: false,
  language: 'English',
};

const FAQ_ITEMS = [
  {
    q: 'How do I update my profile name?',
    a: 'Preferred username comes from Cognito preferred_username and app profile records managed by your admin flow.',
  },
  {
    q: 'How can I contact support?',
    a: 'Use the support email action from your email app or contact your platform administrator.',
  },
  {
    q: 'Why are some pages restricted?',
    a: 'Access is controlled by your role policies configured in the admin settings.',
  },
];

function getInitials(name: string): string {
  const parts = name.split(/[._@\-\s]+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return '?';
}

export function ProfileScreen({ authUser, role }: Props) {
  const { signOut } = useAuthenticator();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats>({
    products: 0,
    rating: '0.0',
    orders: 0,
  });
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PREFERENCES);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);

  const initials = getInitials(authUser.username);
  const isAdmin = role === 'Admin';
  const appVersion = '1.0.0';
  const storageKey = `profile_prefs_${authUser.sub || authUser.username}`;

  const colors = useMemo(
    () =>
      prefs.darkMode
        ? {
            root: '#1f1933',
            card: '#2a2342',
            label: '#d6ccff',
            text: '#f5f3ff',
            muted: '#c6bcf0',
            divider: '#3a3260',
            iconBg: '#3a3260',
            icon: '#c4b5fd',
          }
        : {
            root: '#f3eeff',
            card: '#ffffff',
            label: '#7c3aed',
            text: '#1e1b4b',
            muted: '#6b7280',
            divider: '#f3f4f6',
            iconBg: '#f5f0ff',
            icon: '#7c3aed',
          },
    [prefs.darkMode],
  );

  const persistPreferences = useCallback(
    async (next: ProfilePreferences) => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      } catch (error: unknown) {
        Alert.alert('Preferences', `Unable to save preferences: ${(error as Error).message}`);
      }
    },
    [storageKey],
  );

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as Partial<ProfilePreferences>;
          setPrefs({
            notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_PREFERENCES.notificationsEnabled,
            darkMode: parsed.darkMode ?? DEFAULT_PREFERENCES.darkMode,
            language: parsed.language ?? DEFAULT_PREFERENCES.language,
          });
        }

        const [productsResponse, ratingsResponse, storeResponse] = await Promise.all([
          role === 'Admin'
            ? client.models.ProductX.list()
            : client.models.ProductX.list({ filter: { creatorSub: { eq: authUser.sub } } }),
          client.models.ProductRating.list({ filter: { userSub: { eq: authUser.sub } } }),
          role === 'Admin'
            ? client.models.StoreProduct.list()
            : client.models.StoreProduct.list({ filter: { ownerSub: { eq: authUser.sub } } }),
        ]);

        const products = productsResponse.data ?? [];
        const ratings = ratingsResponse.data ?? [];
        const stores = storeResponse.data ?? [];
        const ratingAverage = ratings.length
          ? (ratings.reduce((sum: number, row: { score: number }) => sum + row.score, 0) / ratings.length).toFixed(1)
          : '0.0';

        if (mounted) {
          setStats({
            products: products.length,
            rating: ratingAverage,
            orders: stores.length,
          });
        }
      } catch (error: unknown) {
        if (mounted) {
          Alert.alert('Profile', `Unable to load profile data: ${(error as Error).message}`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [authUser.sub, role, storageKey]);

  const updatePreferences = useCallback(
    (next: ProfilePreferences) => {
      setPrefs(next);
      void persistPreferences(next);
    },
    [persistPreferences],
  );

  const handleOpenPrivacy = useCallback(async () => {
    const url = 'https://aws.amazon.com/privacy/';
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Privacy Policy', 'Unable to open browser on this device.');
      return;
    }
    await Linking.openURL(url);
  }, []);

  const handleOpenEmail = useCallback(async () => {
    if (!authUser.email) {
      Alert.alert('Email', 'No email is available for this account.');
      return;
    }
    const mailto = `mailto:${authUser.email}`;
    const supported = await Linking.canOpenURL(mailto);
    if (!supported) {
      Alert.alert('Email', 'No email app available on this device.');
      return;
    }
    await Linking.openURL(mailto);
  }, [authUser.email]);

  const handleStatPress = useCallback((label: string, value: string) => {
    Alert.alert(label, `${label}: ${value}`);
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ],
      { cancelable: true },
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.root }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
      style={[styles.root, { backgroundColor: colors.root }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      >
      {/* ── Header ── */}
      <View style={styles.headerBg}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <Text style={styles.displayName}>{authUser.username}</Text>

        <View style={[styles.badge, isAdmin ? styles.badgeAdmin : styles.badgeFreelancer]}>
          <Ionicons
            name={isAdmin ? 'shield-checkmark' : 'briefcase'}
            size={11}
            color="#fff"
            style={styles.badgeIcon}
          />
          <Text style={styles.badgeText}>{role}</Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <StatCard
          icon="cube-outline"
          label="Products"
          value={String(stats.products)}
          onPress={() => handleStatPress('Products', String(stats.products))}
        />
        <StatCard
          icon="star-outline"
          label="Rating"
          value={stats.rating}
          onPress={() => handleStatPress('Rating', stats.rating)}
        />
        <StatCard
          icon="cart-outline"
          label="Orders"
          value={String(stats.orders)}
          onPress={() => handleStatPress('Orders', String(stats.orders))}
        />
      </View>

      {/* ── Account section ── */}
      <SectionLabel text="ACCOUNT INFO" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <InfoRow
          icon="person-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Preferred Username"
          value={authUser.username}
          onPress={() => Alert.alert('Preferred Username', authUser.username)}
        />
        <Divider />
        <InfoRow
          icon="mail-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Email"
          value={authUser.email ?? '-'}
          onPress={() => void handleOpenEmail()}
          chevron
        />
        <Divider />
        <InfoRow
          icon={isAdmin ? 'shield-outline' : 'briefcase-outline'}
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Role"
          value={role}
          onPress={() => Alert.alert('Role', role)}
        />
      </View>

      {/* ── Preferences section ── */}
      <SectionLabel text="PREFERENCES" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <InfoRow
          icon="notifications-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Notifications"
          value={prefs.notificationsEnabled ? 'Enabled' : 'Disabled'}
          onPress={() =>
            updatePreferences({ ...prefs, notificationsEnabled: !prefs.notificationsEnabled })
          }
          trailing={
            <Switch
              value={prefs.notificationsEnabled}
              onValueChange={(value) => updatePreferences({ ...prefs, notificationsEnabled: value })}
            />
          }
        />
        <Divider />
        <InfoRow
          icon="moon-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Dark Mode"
          value={prefs.darkMode ? 'On' : 'Off'}
          onPress={() => updatePreferences({ ...prefs, darkMode: !prefs.darkMode })}
          trailing={
            <Switch
              value={prefs.darkMode}
              onValueChange={(value) => updatePreferences({ ...prefs, darkMode: value })}
            />
          }
        />
        <Divider />
        <InfoRow
          icon="language-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Language"
          value={prefs.language}
          chevron
          onPress={() => setLanguageModalVisible(true)}
        />
      </View>

      {/* ── Support section ── */}
      <SectionLabel text="SUPPORT" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <InfoRow
          icon="help-circle-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Help & FAQ"
          value=""
          chevron
          onPress={() => setFaqVisible(true)}
        />
        <Divider />
        <InfoRow
          icon="document-text-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="Privacy Policy"
          value=""
          chevron
          onPress={() => void handleOpenPrivacy()}
        />
        <Divider />
        <InfoRow
          icon="information-circle-outline"
          iconColor={colors.icon}
          iconBg={colors.iconBg}
          textColor={colors.text}
          mutedColor={colors.muted}
          label="App Version"
          value={appVersion}
          onPress={() => Alert.alert('App Version', appVersion)}
        />
      </View>

      {/* ── Sign out ── */}
      <Pressable
        style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={languageModalVisible} transparent animationType="fade" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLanguageModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Language</Text>
            {(['English', 'Arabic', 'French'] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.optionBtn, prefs.language === item ? styles.optionBtnActive : undefined]}
                onPress={() => {
                  updatePreferences({ ...prefs, language: item });
                  setLanguageModalVisible(false);
                }}
              >
                <Text style={[styles.optionText, prefs.language === item ? styles.optionTextActive : undefined]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={faqVisible} transparent animationType="fade" onRequestClose={() => setFaqVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFaqVisible(false)} />
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>Help & FAQ</Text>
            <ScrollView style={styles.faqScroll}>
              {FAQ_ITEMS.map((item) => (
                <View key={item.q} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <Text style={styles.faqAnswer}>{item.a}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setFaqVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Small sub-components ────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function StatCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#7c3aed" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({
  icon,
  label,
  value,
  chevron,
  onPress,
  trailing,
  iconColor,
  iconBg,
  textColor,
  mutedColor,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  chevron?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  iconColor: string;
  iconBg: string;
  textColor: string;
  mutedColor: string;
}) {
  const content = (
    <>
      <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}> 
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <Text style={[styles.infoLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: mutedColor }]} numberOfLines={1}>
        {value}
      </Text>
      {trailing}
      {chevron === true && trailing == null && <Ionicons name="chevron-forward" size={15} color="#c4b5fd" />}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.infoRow} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.infoRow}>
      {content}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  bottomSpacer: {
    height: 16,
  },

  // Header
  headerBg: {
    backgroundColor: '#6d28d9',
    paddingTop: 40,
    paddingBottom: 44,
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#7c3aed',
    top: -90,
    right: -70,
    opacity: 0.5,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#4c1d95',
    bottom: -50,
    left: -30,
    opacity: 0.55,
  },
  circle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8b5cf6',
    top: 14,
    left: 24,
    opacity: 0.3,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 33,
    fontWeight: '800',
    color: '#6d28d9',
    letterSpacing: 1,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeIcon: {
    marginRight: 5,
  },
  badgeAdmin: {
    backgroundColor: '#1e1b4b',
  },
  badgeFreelancer: {
    backgroundColor: '#064e3b',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -22,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2e1065',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sections
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 4,
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f5f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b4b',
  },
  infoValue: {
    fontSize: 13,
    color: '#6b7280',
    maxWidth: 130,
    textAlign: 'right',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 60,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#fff5f5',
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    gap: 10,
  },
  signOutBtnPressed: {
    backgroundColor: '#fee2e2',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2a44',
    marginBottom: 10,
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  optionBtnActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  optionText: {
    color: '#4c1d95',
    fontWeight: '700',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#2e1065',
  },
  faqScroll: {
    marginBottom: 12,
  },
  faqItem: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2a44',
    marginBottom: 5,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 19,
    color: '#52617c',
  },
  closeBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
