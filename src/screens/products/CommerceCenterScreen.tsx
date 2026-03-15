import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DropdownSelect } from '../../components/DropdownSelect';
import { getProductCategoryLabel, getTierBenefits } from '../../constants/commerceProgram';
import { client } from '../../lib/amplifyClient';
import { useAppTheme } from '../../theme/AppThemeContext';
import { formatQar } from '../../utils/currency';
import type {
  AuthUserContext,
  DeliveryNote,
  DeliveryStatus,
  LoyaltyAccount,
  LoyaltyLedger,
  OrderFulfillmentStatus,
  SalesOrder,
  WarrantyCard,
  WarrantyStatus,
} from '../../types';

type Props = {
  authUser: AuthUserContext;
  isAdmin: boolean;
};

const deliveryStatusOptions: Array<{ label: string; value: DeliveryStatus }> = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Packed', value: 'PACKED' },
  { label: 'Out For Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Collected', value: 'COLLECTED' },
];

const warrantyStatusOptions: Array<{ label: string; value: WarrantyStatus }> = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Void', value: 'VOID' },
];

function sortByCreatedAt<T extends { createdAt?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt ?? 0).getTime();
    const rightTime = new Date(right.createdAt ?? 0).getTime();
    return rightTime - leftTime;
  });
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleDateString('en-QA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function mapDeliveryToOrderStatus(status: DeliveryStatus): OrderFulfillmentStatus {
  switch (status) {
    case 'PACKED':
      return 'PACKED';
    case 'OUT_FOR_DELIVERY':
      return 'OUT_FOR_DELIVERY';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'COLLECTED':
      return 'COLLECTED';
    default:
      return 'PAID';
  }
}

export function CommerceCenterScreen({ authUser, isAdmin }: Props) {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [warrantyCards, setWarrantyCards] = useState<WarrantyCard[]>([]);
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccount[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LoyaltyLedger[]>([]);
  const [signatureDrafts, setSignatureDrafts] = useState<Record<string, string>>({});
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);
  const [busyWarrantyId, setBusyWarrantyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const ownerFilter = { ownerSub: { eq: authUser.sub } };
    const [ordersResult, notesResult, warrantiesResult, loyaltyResult, ledgerResult] = await Promise.all([
      client.models.SalesOrder.list(isAdmin ? undefined : { filter: ownerFilter }),
      client.models.DeliveryNote.list(isAdmin ? undefined : { filter: ownerFilter }),
      client.models.WarrantyCard.list(isAdmin ? undefined : { filter: ownerFilter }),
      client.models.LoyaltyAccount.list(isAdmin ? undefined : { filter: ownerFilter }),
      client.models.LoyaltyLedger.list(isAdmin ? undefined : { filter: ownerFilter }),
    ]);

    setOrders(sortByCreatedAt((ordersResult.data ?? []) as SalesOrder[]));
    setDeliveryNotes(sortByCreatedAt((notesResult.data ?? []) as DeliveryNote[]));
    setWarrantyCards(sortByCreatedAt((warrantiesResult.data ?? []) as WarrantyCard[]));
    setLoyaltyAccounts(sortByCreatedAt((loyaltyResult.data ?? []) as LoyaltyAccount[]));
    setLedgerEntries(sortByCreatedAt((ledgerResult.data ?? []) as LoyaltyLedger[]));
  }, [authUser.sub, isAdmin]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const activeLoyaltyAccount = useMemo(() => loyaltyAccounts[0] ?? null, [loyaltyAccounts]);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalQar ?? 0), 0);
    const totalPoints = loyaltyAccounts.reduce((sum, account) => sum + (account.pointsBalance ?? 0), 0);
    return {
      totalOrders: orders.length,
      totalRevenue,
      totalPoints,
      totalWarranties: warrantyCards.length,
    };
  }, [loyaltyAccounts, orders, warrantyCards.length]);

  const handleDeliveryStatusChange = useCallback(
    async (note: DeliveryNote, nextStatusValue: string) => {
      const nextStatus = nextStatusValue as DeliveryStatus;
      const signatureName = (signatureDrafts[note.id] ?? '').trim();
      const requiresSignature = nextStatus === 'DELIVERED' || nextStatus === 'COLLECTED';

      if (requiresSignature && !signatureName && !note.signatureName) {
        return;
      }

      setBusyNoteId(note.id);
      try {
        const signedAt = requiresSignature ? new Date().toISOString() : undefined;
        await client.models.DeliveryNote.update({
          id: note.id,
          status: nextStatus,
          signatureName: requiresSignature ? signatureName || note.signatureName || undefined : undefined,
          signedAt,
        });

        const order = orders.find((entry) => entry.id === note.orderId);
        if (order?.id) {
          await client.models.SalesOrder.update({
            id: order.id,
            fulfillmentStatus: mapDeliveryToOrderStatus(nextStatus),
          });
        }

        await loadData();
      } finally {
        setBusyNoteId(null);
      }
    },
    [loadData, orders, signatureDrafts],
  );

  const handleWarrantyStatusChange = useCallback(
    async (card: WarrantyCard, nextStatusValue: string) => {
      setBusyWarrantyId(card.id);
      try {
        await client.models.WarrantyCard.update({
          id: card.id,
          status: nextStatusValue as WarrantyStatus,
        });
        await loadData();
      } finally {
        setBusyWarrantyId(null);
      }
    },
    [loadData],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.stateWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.textMuted }]}>Loading commerce records...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}> 
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>{isAdmin ? 'Commerce Operations' : 'Loyalty And Documents'}</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                {isAdmin ? 'Orders, delivery, warranty, and loyalty oversight' : 'Your purchases, loyalty value, and issued documents'}
              </Text>
            </View>
            <Pressable style={[styles.refreshButton, { borderColor: colors.border }]} onPress={() => void handleRefresh()}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={[styles.refreshLabel, { color: colors.primary }]}>Refresh</Text>
            </Pressable>
          </View>

          <View style={styles.metricRow}>
            <MetricCard label={isAdmin ? 'Orders' : 'My Orders'} value={String(metrics.totalOrders)} />
            <MetricCard label="Revenue" value={formatQar(metrics.totalRevenue)} />
            <MetricCard label="Warranty Cards" value={String(metrics.totalWarranties)} />
            <MetricCard label="Points" value={String(metrics.totalPoints)} />
          </View>
        </View>

        {!isAdmin && activeLoyaltyAccount ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Loyalty Status</Text>
            <View style={styles.loyaltyHeader}>
              <View>
                <Text style={styles.loyaltyTier}>{activeLoyaltyAccount.tier ?? 'MEMBER'}</Text>
                <Text style={[styles.sectionSubtext, { color: colors.textMuted }]}>
                  {getTierBenefits(activeLoyaltyAccount.tier ?? 'MEMBER')}
                </Text>
              </View>
              <View style={styles.pointsPill}>
                <Text style={styles.pointsValue}>{activeLoyaltyAccount.pointsBalance ?? 0}</Text>
                <Text style={styles.pointsLabel}>available points</Text>
              </View>
            </View>
            <View style={styles.inlineStats}>
              <InlineStat label="Lifetime spend" value={formatQar(activeLoyaltyAccount.lifetimeSpendQar ?? 0)} />
              <InlineStat label="Completed orders" value={String(activeLoyaltyAccount.lifetimeOrders ?? 0)} />
            </View>
          </View>
        ) : null}

        {isAdmin ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Loyalty Accounts</Text>
            <Text style={[styles.sectionSubtext, { color: colors.textMuted }]}>Active points balances and customer tiers across the workspace.</Text>
            {loyaltyAccounts.length === 0 ? (
              <EmptyState text="No loyalty accounts have been created yet." />
            ) : (
              loyaltyAccounts.slice(0, 8).map((account) => (
                <View key={account.id} style={styles.recordRow}>
                  <View style={styles.recordMain}>
                    <Text style={styles.recordTitle}>{account.ownerUsername}</Text>
                    <Text style={styles.recordMeta}>{account.tier ?? 'MEMBER'} tier</Text>
                  </View>
                  <View style={styles.recordAside}>
                    <Text style={styles.recordValue}>{account.pointsBalance ?? 0} pts</Text>
                    <Text style={styles.recordMeta}>{formatQar(account.lifetimeSpendQar ?? 0)} spend</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{isAdmin ? 'Orders Queue' : 'Order History'}</Text>
          <Text style={[styles.sectionSubtext, { color: colors.textMuted }]}>Every completed order now carries loyalty, delivery, and warranty records.</Text>
          {orders.length === 0 ? (
            <EmptyState text="No orders are available yet." />
          ) : (
            orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.recordTitle}>{order.orderNumber}</Text>
                    <Text style={styles.recordMeta}>{order.customerName} · {order.ownerUsername}</Text>
                  </View>
                  <View style={styles.recordAside}>
                    <Text style={styles.recordValue}>{formatQar(order.totalQar)}</Text>
                    <StatusBadge label={order.fulfillmentStatus.replace(/_/g, ' ')} tone="blue" />
                  </View>
                </View>
                <View style={styles.inlineStats}>
                  <InlineStat label="Payment" value={order.paymentMethod} />
                  <InlineStat label="Delivery" value={order.deliveryMode.replace('_', ' ')} />
                  <InlineStat label="Earned" value={`${order.loyaltyPointsEarned ?? 0} pts`} />
                  <InlineStat label="Redeemed" value={`${order.loyaltyPointsRedeemed ?? 0} pts`} />
                </View>
                <Text style={styles.smallPrint}>Created {formatDate(order.createdAt)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Notes</Text>
          <Text style={[styles.sectionSubtext, { color: colors.textMuted }]}>Operational delivery paperwork with signature capture for final handover.</Text>
          {deliveryNotes.length === 0 ? (
            <EmptyState text="No delivery notes have been generated yet." />
          ) : (
            deliveryNotes.map((note) => {
              const noteBusy = busyNoteId === note.id;
              const draftSignature = signatureDrafts[note.id] ?? note.signatureName ?? '';
              return (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.recordTitle}>{note.noteNumber}</Text>
                      <Text style={styles.recordMeta}>{note.orderNumber} · {note.recipientName}</Text>
                    </View>
                    <StatusBadge label={note.status.replace(/_/g, ' ')} tone="amber" />
                  </View>
                  <Text style={styles.noteText}>{note.noteText || 'No delivery instructions recorded.'}</Text>
                  <View style={styles.inlineStats}>
                    <InlineStat label="Mode" value={note.deliveryMode.replace('_', ' ')} />
                    <InlineStat label="Phone" value={note.customerPhone} />
                    <InlineStat label="Signed" value={note.signatureName ?? 'Pending'} />
                  </View>
                  {note.deliveryAddress ? <Text style={styles.smallPrint}>{note.deliveryAddress}</Text> : null}

                  {isAdmin ? (
                    <>
                      <DropdownSelect
                        label="Delivery Status"
                        value={note.status}
                        placeholder="Select a status"
                        options={deliveryStatusOptions}
                        disabled={noteBusy}
                        onChange={(value) => {
                          void handleDeliveryStatusChange(note, value);
                        }}
                      />
                      <TextInput
                        value={draftSignature}
                        onChangeText={(value) => setSignatureDrafts((current) => ({ ...current, [note.id]: value }))}
                        placeholder="Recipient signature name for delivered/collected"
                        placeholderTextColor={colors.textMuted}
                        style={[
                          styles.signatureInput,
                          { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                        ]}
                      />
                      {noteBusy ? <Text style={styles.smallPrint}>Updating delivery workflow...</Text> : null}
                    </>
                  ) : (
                    <Text style={styles.smallPrint}>
                      {note.signedAt ? `Signed on ${formatDate(note.signedAt)}` : 'Awaiting delivery signature.'}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Warranty Cards</Text>
          <Text style={[styles.sectionSubtext, { color: colors.textMuted }]}>Issued by product category with coverage windows and support reference numbers.</Text>
          {warrantyCards.length === 0 ? (
            <EmptyState text="No warranty cards are available yet." />
          ) : (
            warrantyCards.map((card) => {
              const warrantyBusy = busyWarrantyId === card.id;
              return (
                <View key={card.id} style={styles.warrantyCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.recordMain}>
                      <Text style={styles.recordTitle}>{card.cardNumber}</Text>
                      <Text style={styles.recordMeta}>{card.productName}</Text>
                    </View>
                    <StatusBadge label={card.status} tone="green" />
                  </View>
                  <View style={styles.inlineStats}>
                    <InlineStat label="Category" value={getProductCategoryLabel(card.productCategory)} />
                    <InlineStat label="Coverage" value={`${card.warrantyMonths} months`} />
                    <InlineStat label="Starts" value={formatDate(card.warrantyStartDate)} />
                    <InlineStat label="Ends" value={formatDate(card.warrantyEndDate)} />
                  </View>
                  <Text style={styles.noteText}>{card.coverageSummary}</Text>
                  {isAdmin ? (
                    <DropdownSelect
                      label="Warranty Status"
                      value={card.status}
                      placeholder="Select a status"
                      options={warrantyStatusOptions}
                      disabled={warrantyBusy}
                      onChange={(value) => {
                        void handleWarrantyStatusChange(card, value);
                      }}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {!isAdmin ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Loyalty Activity</Text>
            <Text style={[styles.sectionSubtext, { color: colors.textMuted }]}>Earned and redeemed points tied to your completed orders.</Text>
            {ledgerEntries.length === 0 ? (
              <EmptyState text="No loyalty entries are available yet." />
            ) : (
              ledgerEntries.slice(0, 10).map((entry) => (
                <View key={entry.id} style={styles.recordRow}>
                  <View style={styles.recordMain}>
                    <Text style={styles.recordTitle}>{entry.description}</Text>
                    <Text style={styles.recordMeta}>{formatDate(entry.createdAt)}</Text>
                  </View>
                  <Text style={[styles.recordValue, entry.pointsDelta >= 0 ? styles.positiveValue : styles.negativeValue]}>
                    {entry.pointsDelta >= 0 ? '+' : ''}
                    {entry.pointsDelta} pts
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineStat}>
      <Text style={styles.inlineStatLabel}>{label}</Text>
      <Text style={styles.inlineStatValue}>{value}</Text>
    </View>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: 'blue' | 'amber' | 'green' }) {
  const palette =
    tone === 'amber'
      ? { backgroundColor: '#FFF4DB', color: '#A16207' }
      : tone === 'green'
        ? { backgroundColor: '#DCFCE7', color: '#166534' }
        : { backgroundColor: '#DBEAFE', color: '#1D4ED8' };

  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.statusBadgeText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={20} color="#94a3b8" />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 12,
    gap: 12,
    paddingBottom: 34,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F7941D',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 26,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  refreshLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#EEF4FF',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#163A6B',
  },
  metricLabel: {
    marginTop: 3,
    color: '#5A7093',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubtext: {
    fontSize: 12,
    lineHeight: 18,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  loyaltyTier: {
    fontSize: 22,
    fontWeight: '900',
    color: '#163A6B',
  },
  pointsPill: {
    borderRadius: 16,
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  pointsLabel: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '700',
  },
  inlineStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineStat: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: '#F8FBFF',
    padding: 10,
  },
  inlineStatLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  inlineStatValue: {
    marginTop: 3,
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '800',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 14,
    backgroundColor: '#F8FBFF',
    padding: 12,
  },
  recordMain: {
    flex: 1,
    gap: 3,
  },
  recordAside: {
    alignItems: 'flex-end',
    gap: 5,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  recordMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  recordValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderCard: {
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    padding: 12,
    gap: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  smallPrint: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  noteCard: {
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    padding: 12,
    gap: 10,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#334155',
  },
  signatureInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  warrantyCard: {
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    padding: 12,
    gap: 10,
  },
  positiveValue: {
    color: '#166534',
  },
  negativeValue: {
    color: '#B91C1C',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#F8FBFF',
    padding: 12,
  },
  emptyStateText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
});