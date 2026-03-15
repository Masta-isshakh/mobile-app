import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { client } from '../../lib/amplifyClient';
import { useAppTheme } from '../../theme/AppThemeContext';
import { formatQar } from '../../utils/currency';
import type { CartItem } from '../../types';

type CartGroup = {
  ownerUsername: string;
  ownerSub: string;
  items: CartItem[];
  total: number;
};

type Props = {
  onClose: () => void;
};

export function AdminCartScreen({ onClose }: Props) {
  const { colors, isDarkMode } = useAppTheme();
  const [groups, setGroups] = useState<CartGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const loadCarts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await client.models.CartItem.list({});
      const items = (data ?? []) as CartItem[];

      const byOwner = new Map<string, CartGroup>();
      for (const item of items) {
        if (!byOwner.has(item.ownerSub)) {
          byOwner.set(item.ownerSub, {
            ownerSub: item.ownerSub,
            ownerUsername: item.ownerUsername,
            items: [],
            total: 0,
          });
        }
        const group = byOwner.get(item.ownerSub)!;
        group.items.push(item);
        group.total += (item.productPrice ?? 0) * item.quantity;
      }

      const result = Array.from(byOwner.values()).sort((a, b) =>
        a.ownerUsername.localeCompare(b.ownerUsername),
      );
      setGroups(result);
      setTotalItems(items.length);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCarts();
  }, [loadCarts]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode ? styles.headerDark : styles.headerLight]}>
        {/* Blob decorations */}
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />

        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Freelancer Carts</Text>
            <Text style={styles.headerSubtitle}>All active cart activity across freelancers</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={() => { void loadCarts(); }}>
            <Ionicons name="refresh-outline" size={20} color="#ffffff" />
          </Pressable>
        </View>

        {/* Summary strip */}
        {!isLoading && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.summaryText}>{groups.length} Freelancer{groups.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.summaryDot} />
            <View style={styles.summaryItem}>
              <Ionicons name="cube-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.summaryText}>{totalItems} Item{totalItems !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.summaryDot} />
            <View style={styles.summaryItem}>
              <Ionicons name="cart-outline" size={14} color="#F7941D" />
              <Text style={[styles.summaryText, { color: '#F7941D' }]}>
                {formatQar(groups.reduce((s, g) => s + g.total, 0))}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading carts…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="cart-outline" size={42} color="#1565C0" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Carts</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Freelancer cart activity will appear here
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <View key={group.ownerSub} style={[styles.groupCard, { backgroundColor: colors.surface }]}>
              {/* Group header */}
              <View style={styles.groupHeader}>
                <View style={[styles.avatarCircle, isDarkMode ? styles.avatarCircleDark : undefined]}>
                  <Text style={[styles.avatarLetter, isDarkMode ? styles.avatarLetterDark : undefined]}>
                    {group.ownerUsername[0]?.toUpperCase() ?? 'F'}
                  </Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={[styles.groupUsername, { color: colors.text }]}>{group.ownerUsername}</Text>
                  <Text style={[styles.groupMeta, { color: colors.textMuted }]}>
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.groupTotalBox}>
                  <Text style={styles.groupTotal}>{formatQar(group.total)}</Text>
                  <View style={styles.freelancerBadge}>
                    <Ionicons name="sparkles" size={10} color="#F7941D" />
                    <Text style={styles.freelancerBadgeText}>Freelancer</Text>
                  </View>
                </View>
              </View>

              {/* Items */}
              {group.items.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    { borderTopColor: colors.border },
                    idx === 0 ? styles.itemRowFirst : undefined,
                  ]}
                >
                  <View style={[styles.itemIcon, isDarkMode ? styles.itemIconDark : undefined]}>
                    <Ionicons name="cube-outline" size={16} color="#1565C0" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    {item.creatorUsername ? (
                      <Text style={[styles.itemBy, { color: colors.textMuted }]}>
                        by {item.creatorUsername}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemPrice}>{formatQar(item.productPrice ?? 0)}</Text>
                    <View style={styles.qtyChip}>
                      <Text style={styles.qtyText}>×{item.quantity}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Group footer */}
              <View style={[styles.groupFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.groupFooterLabel, { color: colors.textMuted }]}>Cart Total</Text>
                <Text style={styles.groupFooterTotal}>{formatQar(group.total)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.bottomPad} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  headerLight: {
    backgroundColor: '#1565C0',
  },
  headerDark: {
    backgroundColor: '#0D47A1',
  },
  headerBlob1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -30,
    top: -50,
    backgroundColor: '#1976D2',
    opacity: 0.55,
  },
  headerBlob2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    left: 40,
    bottom: -20,
    backgroundColor: '#F7941D',
    opacity: 0.25,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  /* Summary strip */
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  summaryDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  /* Loading / Empty */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCEEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  /* Scroll list */
  scroll: {
    paddingHorizontal: 12,
    paddingTop: 2,
  },

  /* Group card */
  groupCard: {
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCEEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleDark: {
    backgroundColor: '#1A3A6B',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1565C0',
  },
  avatarLetterDark: {
    color: '#64B5F6',
  },
  groupInfo: {
    flex: 1,
  },
  groupUsername: {
    fontSize: 15,
    fontWeight: '800',
  },
  groupMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  groupTotalBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  groupTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1565C0',
  },
  freelancerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freelancerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F7941D',
  },

  /* Item rows */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  itemRowFirst: {
    borderTopWidth: 1,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconDark: {
    backgroundColor: '#1A2E55',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemBy: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1565C0',
  },
  qtyChip: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Group footer */
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    backgroundColor: '#F0F7FF',
  },
  groupFooterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupFooterTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1565C0',
  },

  bottomPad: {
    height: 24,
  },
});
