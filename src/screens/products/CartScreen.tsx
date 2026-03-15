import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SuccessPopup } from '../../components/SuccessPopup';
import {
  addMonths,
  buildDeliveryNoteNumber,
  buildOrderNumber,
  buildWarrantyCardNumber,
  calculateEarnedPoints,
  calculateRedeemableDiscount,
  determineLoyaltyTier,
  getProductCategoryLabel,
  getRedeemablePointOptions,
  getTierBenefits,
  getWarrantyCoverageSummary,
  getWarrantyMonths,
} from '../../constants/commerceProgram';
import { client } from '../../lib/amplifyClient';
import { useStripeBridge } from '../../lib/useStripeBridge.native';
import { useAppTheme } from '../../theme/AppThemeContext';
import { formatQar } from '../../utils/currency';
import { PayPalCheckoutScreen } from './PayPalCheckoutScreen';
import type {
  AuthUserContext,
  LoyaltyAccount,
  PaymentMethodValue,
  Product,
  ProductCategoryValue,
} from '../../types';

type CartItem = {
  product: Product;
  quantity: number;
};

type Props = {
  authUser: AuthUserContext;
  items: CartItem[];
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckoutSuccess: () => void;
  onClose: () => void;
};

type CheckoutMethod = 'stripe' | 'paypal';

type StripeCheckoutSessionPayload = {
  clientSecret?: string;
  customerId?: string;
  ephemeralKeySecret?: string;
  paymentIntentId?: string;
  publishableKey?: string;
};

type PayPalOrderPayload = {
  orderId?: string;
  approvalUrl?: string;
  status?: string;
};

export function CartScreen({
  authUser,
  items,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckoutSuccess,
  onClose,
}: Props) {
  const { colors } = useAppTheme();
  const [checkoutMethod, setCheckoutMethod] = useState<CheckoutMethod>('stripe');
  const [withDelivery, setWithDelivery] = useState(false);
  const [customerName, setCustomerName] = useState(authUser.username);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(authUser.email ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [qidReference, setQidReference] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payPalApprovalUrl, setPayPalApprovalUrl] = useState('');
  const [payPalOrderId, setPayPalOrderId] = useState('');
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [successPopup, setSuccessPopup] = useState({ visible: false, title: '', description: '' });
  const { initPaymentSheet, presentPaymentSheet } = useStripeBridge();

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.product.price ?? 0) * item.quantity, 0),
    [items],
  );
  const deliveryFee = useMemo(() => (items.length > 0 && withDelivery ? 50 : 0), [items.length, withDelivery]);
  const loyaltyDiscount = useMemo(() => calculateRedeemableDiscount(redeemPoints), [redeemPoints]);
  const total = useMemo(() => Math.max(0, subtotal + deliveryFee - loyaltyDiscount), [deliveryFee, loyaltyDiscount, subtotal]);
  const earnedPoints = useMemo(() => calculateEarnedPoints(Math.max(0, subtotal - loyaltyDiscount)), [loyaltyDiscount, subtotal]);

  const redeemOptions = useMemo(
    () => getRedeemablePointOptions(loyaltyAccount?.pointsBalance ?? 0, subtotal),
    [loyaltyAccount?.pointsBalance, subtotal],
  );

  useEffect(() => {
    if (!redeemOptions.includes(redeemPoints)) {
      setRedeemPoints(0);
    }
  }, [redeemOptions, redeemPoints]);

  const orderSummary = useMemo(() => {
    const lines = items.map((item) => `${item.product.name} x${item.quantity}`).slice(0, 8).join(', ');
    const deliverySummary = withDelivery ? 'Delivery: Yes (+50 QAR)' : 'Delivery: No';
    const loyaltySummary = redeemPoints > 0 ? `Loyalty: Redeemed ${redeemPoints} pts` : 'Loyalty: No redemption';
    return `${lines} | ${deliverySummary} | ${loyaltySummary}`;
  }, [items, redeemPoints, withDelivery]);

  const loadLoyaltyAccount = useCallback(async () => {
    const response = await client.models.LoyaltyAccount.list({
      filter: { ownerSub: { eq: authUser.sub } },
    });
    setLoyaltyAccount((response.data?.[0] ?? null) as LoyaltyAccount | null);
  }, [authUser.sub]);

  useEffect(() => {
    void loadLoyaltyAccount();
  }, [loadLoyaltyAccount]);

  const closePayPalModal = useCallback(() => {
    setPayPalApprovalUrl('');
    setPayPalOrderId('');
    setIsPaying(false);
  }, []);

  const validateCheckoutDetails = useCallback(() => {
    if (!customerName.trim()) {
      throw new Error('Recipient full name is required.');
    }
    if (!customerPhone.trim()) {
      throw new Error('Phone number is required.');
    }
    if (!customerEmail.trim()) {
      throw new Error('Email address is required so receipts and warranty documents can be sent.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      throw new Error('Enter a valid customer email address.');
    }
    if (withDelivery && !deliveryAddress.trim()) {
      throw new Error('Delivery address is required when delivery is selected.');
    }
  }, [customerEmail, customerName, customerPhone, deliveryAddress, withDelivery]);

  const finalizeCommerceRecords = useCallback(
    async (paymentMethod: PaymentMethodValue) => {
      const now = new Date().toISOString();
      const orderNumber = buildOrderNumber();
      const deliveryMode = withDelivery ? 'DELIVERY' : 'SELF_PICKUP';

      const orderResponse = await client.models.SalesOrder.create({
        orderNumber,
        ownerSub: authUser.sub,
        ownerUsername: authUser.username,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        companyName: companyName.trim() || undefined,
        qidReference: qidReference.trim() || undefined,
        deliveryAddress: withDelivery ? deliveryAddress.trim() : undefined,
        deliveryMode,
        fulfillmentStatus: 'PAID',
        paymentMethod,
        paymentStatus: 'PAID',
        subtotalQar: subtotal,
        deliveryFeeQar: deliveryFee,
        loyaltyDiscountQar: loyaltyDiscount,
        totalQar: total,
        loyaltyPointsEarned: earnedPoints,
        loyaltyPointsRedeemed: redeemPoints,
        warrantyCardsIssued: items.length,
        note: withDelivery ? 'Delivery requested by customer.' : 'Customer selected self pickup.',
      });

      const order = orderResponse.data;
      if (!order?.id) {
        throw new Error('Order record could not be created.');
      }

      for (const item of items) {
        const category = (item.product.category ?? 'OTHER') as ProductCategoryValue;
        const lineTotalQar = (item.product.price ?? 0) * item.quantity;

        const orderItemResponse = await client.models.SalesOrderItem.create({
          orderId: order.id,
          ownerSub: authUser.sub,
          productId: item.product.id,
          productName: item.product.name,
          productCategory: category,
          creatorUsername: item.product.creatorUsername,
          quantity: item.quantity,
          unitPriceQar: item.product.price ?? 0,
          lineTotalQar,
        });

        const orderItemId = orderItemResponse.data?.id;
        if (!orderItemId) {
          throw new Error('Order item record could not be created.');
        }

        const warrantyMonths = getWarrantyMonths(category);
        await client.models.WarrantyCard.create({
          orderId: order.id,
          orderItemId,
          ownerSub: authUser.sub,
          ownerUsername: authUser.username,
          cardNumber: buildWarrantyCardNumber(),
          productId: item.product.id,
          productName: item.product.name,
          productCategory: category,
          warrantyMonths,
          warrantyStartDate: now,
          warrantyEndDate: addMonths(now, warrantyMonths),
          status: 'ACTIVE',
          coverageSummary: getWarrantyCoverageSummary(category),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          companyName: companyName.trim() || undefined,
          qidReference: qidReference.trim() || undefined,
        });
      }

      await client.models.DeliveryNote.create({
        orderId: order.id,
        orderNumber,
        ownerSub: authUser.sub,
        ownerUsername: authUser.username,
        noteNumber: buildDeliveryNoteNumber(),
        deliveryMode,
        status: 'DRAFT',
        recipientName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        deliveryAddress: withDelivery ? deliveryAddress.trim() : undefined,
        companyName: companyName.trim() || undefined,
        qidReference: qidReference.trim() || undefined,
        noteText: withDelivery
          ? `Deliver to ${customerName.trim()} at ${deliveryAddress.trim()}. Contact ${customerPhone.trim()} before arrival.`
          : `Prepare this order for customer pickup by ${customerName.trim()}. Contact ${customerPhone.trim()} once packed.`,
      });

      const currentPoints = loyaltyAccount?.pointsBalance ?? 0;
      const currentLifetimeSpend = loyaltyAccount?.lifetimeSpendQar ?? 0;
      const currentLifetimeOrders = loyaltyAccount?.lifetimeOrders ?? 0;
      const nextPointsBalance = currentPoints - redeemPoints + earnedPoints;
      const nextLifetimeSpend = currentLifetimeSpend + subtotal;
      const nextLifetimeOrders = currentLifetimeOrders + 1;
      const nextTier = determineLoyaltyTier(nextLifetimeSpend);

      if (loyaltyAccount?.id) {
        await client.models.LoyaltyAccount.update({
          id: loyaltyAccount.id,
          pointsBalance: nextPointsBalance,
          tier: nextTier,
          lifetimeSpendQar: nextLifetimeSpend,
          lifetimeOrders: nextLifetimeOrders,
          lastEarnedAt: earnedPoints > 0 ? now : loyaltyAccount.lastEarnedAt ?? undefined,
          lastRedeemedAt: redeemPoints > 0 ? now : loyaltyAccount.lastRedeemedAt ?? undefined,
        });
      } else {
        await client.models.LoyaltyAccount.create({
          ownerSub: authUser.sub,
          ownerUsername: authUser.username,
          pointsBalance: nextPointsBalance,
          tier: nextTier,
          lifetimeSpendQar: nextLifetimeSpend,
          lifetimeOrders: nextLifetimeOrders,
          lastEarnedAt: earnedPoints > 0 ? now : undefined,
          lastRedeemedAt: redeemPoints > 0 ? now : undefined,
        });
      }

      if (redeemPoints > 0) {
        await client.models.LoyaltyLedger.create({
          ownerSub: authUser.sub,
          ownerUsername: authUser.username,
          orderId: order.id,
          entryType: 'REDEEM',
          pointsDelta: -redeemPoints,
          description: `Redeemed ${redeemPoints} points on order ${orderNumber}.`,
          tierSnapshot: nextTier,
        });
      }

      if (earnedPoints > 0) {
        await client.models.LoyaltyLedger.create({
          ownerSub: authUser.sub,
          ownerUsername: authUser.username,
          orderId: order.id,
          entryType: 'EARN',
          pointsDelta: earnedPoints,
          description: `Earned ${earnedPoints} points from order ${orderNumber}.`,
          tierSnapshot: nextTier,
        });
      }

      await loadLoyaltyAccount();
      return orderNumber;
    },
    [
      authUser.sub,
      authUser.username,
      companyName,
      customerEmail,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryFee,
      earnedPoints,
      items,
      loadLoyaltyAccount,
      loyaltyAccount,
      loyaltyDiscount,
      qidReference,
      redeemPoints,
      subtotal,
      total,
      withDelivery,
    ],
  );

  const handleStripeCheckout = useCallback(async () => {
    validateCheckoutDetails();

    const amountCents = Math.round(total * 100);
    const stripeCustomerEmail = customerEmail.trim().toLowerCase();
    const response = (await client.mutations.createCheckoutSession({
      amountCents,
      currency: 'qar',
      customerEmail: stripeCustomerEmail,
      orderSummary,
    })) as { data?: StripeCheckoutSessionPayload; errors?: Array<{ message?: string }> };

    if (response.errors?.length) {
      throw new Error(response.errors[0]?.message || 'Unable to start Stripe checkout.');
    }

    const payload = response.data;
    if (!payload?.clientSecret || !payload.customerId || !payload.ephemeralKeySecret) {
      throw new Error('Stripe checkout session is incomplete. Check backend Stripe configuration.');
    }

    const init = await initPaymentSheet({
      merchantDisplayName: 'JAMA GO Security Equipment',
      customerId: payload.customerId,
      customerEphemeralKeySecret: payload.ephemeralKeySecret,
      paymentIntentClientSecret: payload.clientSecret,
      defaultBillingDetails: {
        email: stripeCustomerEmail,
        name: customerName.trim(),
      },
      allowsDelayedPaymentMethods: true,
    });

    if (init.error) {
      throw new Error(init.error.message || 'Failed to initialize Stripe payment sheet.');
    }

    const payment = await presentPaymentSheet();
    if (payment.error) {
      if (payment.error.code === 'Canceled') {
        return;
      }
      throw new Error(payment.error.message || 'Stripe payment failed.');
    }

    const orderNumber = await finalizeCommerceRecords('STRIPE');
    onCheckoutSuccess();
    setSuccessPopup({
      visible: true,
      title: 'Payment Successful',
      description: `Order ${orderNumber} confirmed. ${withDelivery ? 'Delivery has been included.' : 'Pickup was selected.'} You earned ${earnedPoints} loyalty points${redeemPoints > 0 ? ` and redeemed ${redeemPoints}` : ''}.`,
    });
  }, [
    customerEmail,
    customerName,
    earnedPoints,
    finalizeCommerceRecords,
    initPaymentSheet,
    onCheckoutSuccess,
    orderSummary,
    presentPaymentSheet,
    redeemPoints,
    total,
    validateCheckoutDetails,
    withDelivery,
  ]);

  const handlePayPalCheckout = useCallback(async () => {
    validateCheckoutDetails();

    const response = (await client.mutations.createPayPalOrder({
      amount: total.toFixed(2),
      currency: 'QAR',
      orderSummary,
    })) as { data?: PayPalOrderPayload; errors?: Array<{ message?: string }> };

    if (response.errors?.length) {
      throw new Error(response.errors[0]?.message || 'Unable to start PayPal checkout.');
    }

    const payload = response.data;
    if (!payload?.orderId || !payload?.approvalUrl) {
      throw new Error('PayPal order is incomplete. Check backend PayPal configuration.');
    }

    setPayPalOrderId(payload.orderId);
    setPayPalApprovalUrl(payload.approvalUrl);
  }, [orderSummary, total, validateCheckoutDetails]);

  const handleCheckout = useCallback(async () => {
    if (items.length === 0 || total <= 0) {
      return;
    }

    setIsPaying(true);
    try {
      if (checkoutMethod === 'paypal') {
        await handlePayPalCheckout();
      } else {
        await handleStripeCheckout();
        setIsPaying(false);
      }
    } catch (error: unknown) {
      setIsPaying(false);
      Alert.alert('Checkout failed', (error as Error).message);
    }
  }, [checkoutMethod, handlePayPalCheckout, handleStripeCheckout, items.length, total]);

  const handlePayPalSuccess = useCallback(async () => {
    closePayPalModal();
    const orderNumber = await finalizeCommerceRecords('PAYPAL');
    onCheckoutSuccess();
    setSuccessPopup({
      visible: true,
      title: 'Payment Successful',
      description: `Order ${orderNumber} confirmed. ${withDelivery ? 'Delivery has been included.' : 'Pickup was selected.'} You earned ${earnedPoints} loyalty points${redeemPoints > 0 ? ` and redeemed ${redeemPoints}` : ''}.`,
    });
  }, [closePayPalModal, earnedPoints, finalizeCommerceRecords, onCheckoutSuccess, redeemPoints, withDelivery]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={onClose} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#23314f" />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="cart-outline" size={32} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add products from Product Detail to continue.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.programCard, { backgroundColor: colors.surface }]}>
              <View style={styles.programHeader}>
                <View>
                  <Text style={styles.programEyebrow}>JAMA GO Loyalty</Text>
                  <Text style={styles.programTitle}>{loyaltyAccount?.tier ?? 'MEMBER'} Member</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsBadgeValue}>{loyaltyAccount?.pointsBalance ?? 0}</Text>
                  <Text style={styles.pointsBadgeLabel}>PTS</Text>
                </View>
              </View>
              <Text style={styles.programHint}>{getTierBenefits(loyaltyAccount?.tier ?? 'MEMBER')}</Text>
              <Text style={styles.programHint}>This order will earn {earnedPoints} points on the merchandise subtotal.</Text>

              <Text style={styles.sectionLabel}>Redeem points</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.loyaltyChipRow}>
                {redeemOptions.map((points) => {
                  const active = redeemPoints === points;
                  const discount = calculateRedeemableDiscount(points);
                  return (
                    <Pressable
                      key={points}
                      style={[styles.loyaltyChip, active ? styles.loyaltyChipActive : undefined]}
                      onPress={() => setRedeemPoints(points)}
                    >
                      <Text style={[styles.loyaltyChipTitle, active ? styles.loyaltyChipTitleActive : undefined]}>
                        {points === 0 ? 'No redemption' : `${points} pts`}
                      </Text>
                      <Text style={[styles.loyaltyChipMeta, active ? styles.loyaltyChipMetaActive : undefined]}>
                        {points === 0 ? 'Keep full balance' : `${formatQar(discount)} off`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.formTitle}>Customer details</Text>
              <Text style={styles.helperText}>We will use the mobile number for WhatsApp updates and the email for receipts, invoices, and warranty delivery.</Text>
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Recipient full name"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Company name (optional)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={qidReference}
                onChangeText={setQidReference}
                placeholder="QID / reference (optional)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.formTitle}>Payment method</Text>
              <View style={styles.toggleWrap}>
                <Pressable
                  style={[styles.toggleButton, checkoutMethod === 'stripe' ? styles.toggleButtonActive : undefined]}
                  onPress={() => setCheckoutMethod('stripe')}
                >
                  <Text style={[styles.toggleButtonText, checkoutMethod === 'stripe' ? styles.toggleButtonTextActive : undefined]}>Stripe</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleButton, checkoutMethod === 'paypal' ? styles.toggleButtonActive : undefined]}
                  onPress={() => setCheckoutMethod('paypal')}
                >
                  <Text style={[styles.toggleButtonText, checkoutMethod === 'paypal' ? styles.toggleButtonTextActive : undefined]}>PayPal</Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                {checkoutMethod === 'stripe' ? 'Card checkout with Stripe in QAR.' : 'PayPal sandbox checkout in QAR.'}
              </Text>
            </View>

            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.formTitle}>Delivery preference</Text>
              <View style={styles.toggleWrap}>
                <Pressable
                  style={[styles.toggleButton, !withDelivery ? styles.toggleButtonActive : undefined]}
                  onPress={() => setWithDelivery(false)}
                >
                  <Text style={[styles.toggleButtonText, !withDelivery ? styles.toggleButtonTextActive : undefined]}>Without Delivery</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleButton, withDelivery ? styles.toggleButtonActive : undefined]}
                  onPress={() => setWithDelivery(true)}
                >
                  <Text style={[styles.toggleButtonText, withDelivery ? styles.toggleButtonTextActive : undefined]}>With Delivery</Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>Delivery adds a fixed {formatQar(50)} fee and generates a full delivery note workflow.</Text>

              {withDelivery ? (
                <TextInput
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Delivery address in Doha"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
                />
              ) : (
                <View style={styles.pickupNotice}>
                  <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                  <Text style={[styles.pickupNoticeText, { color: colors.textMuted }]}>A collection-ready delivery note will still be generated for pickup control.</Text>
                </View>
              )}
            </View>

            {items.map((item) => (
              <View key={item.product.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
                {item.product.imageDataUrl ? (
                  <Image source={{ uri: item.product.imageDataUrl }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="image-outline" size={20} color="#8b98ad" />
                  </View>
                )}

                <View style={styles.itemMeta}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemCategory}>{getProductCategoryLabel(item.product.category)} · {formatQar(item.product.price ?? 0)} each</Text>
                  <Text style={styles.itemLineTotal}>Line total: {formatQar((item.product.price ?? 0) * item.quantity)}</Text>

                  <View style={styles.qtyRow}>
                    <Pressable style={styles.qtyBtn} onPress={() => onDecrease(item.product.id)}>
                      <Ionicons name="remove" size={16} color="#1e293b" />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable style={styles.qtyBtn} onPress={() => onIncrease(item.product.id)}>
                      <Ionicons name="add" size={16} color="#1e293b" />
                    </Pressable>
                    <Pressable style={styles.removeBtn} onPress={() => onRemove(item.product.id)}>
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={[styles.checkoutBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.checkoutMeta}>
          <Text style={styles.checkoutLabel}>Subtotal</Text>
          <Text style={styles.checkoutBreakdown}>{formatQar(subtotal)}</Text>
          <Text style={styles.checkoutLabel}>Delivery</Text>
          <Text style={styles.checkoutBreakdown}>{deliveryFee > 0 ? formatQar(deliveryFee) : 'No delivery'}</Text>
          <Text style={styles.checkoutLabel}>Loyalty discount</Text>
          <Text style={styles.checkoutBreakdown}>{loyaltyDiscount > 0 ? `- ${formatQar(loyaltyDiscount)}` : 'No discount'}</Text>
          <Text style={styles.checkoutLabel}>Total</Text>
          <Text style={styles.checkoutTotal}>{formatQar(total)}</Text>
        </View>

        <Pressable
          style={[
            styles.checkoutButton,
            { backgroundColor: colors.primary },
            items.length === 0 || isPaying || total <= 0 ? styles.checkoutDisabled : undefined,
          ]}
          disabled={items.length === 0 || isPaying || total <= 0}
          onPress={() => void handleCheckout()}
        >
          <Text style={styles.checkoutText}>
            {isPaying ? 'Processing...' : checkoutMethod === 'stripe' ? 'Pay with Stripe' : 'Pay with PayPal'}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.checkoutHint, { backgroundColor: colors.surface }]}>
        The order will automatically generate loyalty entries, a delivery note, warranty cards, and share-ready documents for email or WhatsApp after successful payment.
      </Text>

      <Modal visible={!!payPalApprovalUrl} animationType="slide" onRequestClose={closePayPalModal}>
        {payPalApprovalUrl ? (
          <PayPalCheckoutScreen
            approvalUrl={payPalApprovalUrl}
            orderId={payPalOrderId}
            onSuccess={() => {
              void handlePayPalSuccess();
            }}
            onCancel={closePayPalModal}
          />
        ) : null}
      </Modal>

      <SuccessPopup
        visible={successPopup.visible}
        title={successPopup.title}
        description={successPopup.description}
        onClose={() => setSuccessPopup({ visible: false, title: '', description: '' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eeff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 28, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#23314f' },
  content: { padding: 12, gap: 10, paddingBottom: 100 },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 24,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#23314f' },
  emptyText: { color: '#64748b', textAlign: 'center' },
  programCard: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  programEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F7941D',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f2a44',
  },
  pointsBadge: {
    borderRadius: 14,
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pointsBadgeValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  pointsBadgeLabel: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
  },
  programHint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f2a44',
  },
  loyaltyChipRow: {
    gap: 8,
  },
  loyaltyChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4f2',
    backgroundColor: '#f9fbff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
  },
  loyaltyChipActive: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  loyaltyChipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1f2a44',
  },
  loyaltyChipTitleActive: {
    color: '#ffffff',
  },
  loyaltyChipMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
  },
  loyaltyChipMetaActive: {
    color: '#dbeafe',
  },
  formCard: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f2a44',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  toggleButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12,
  },
  toggleButtonTextActive: {
    color: '#1f2a44',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
  },
  pickupNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#eef4ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickupNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#eef2f8' },
  thumbFallback: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '800', color: '#1f2a44' },
  itemCategory: { marginTop: 3, color: '#64748b', fontSize: 12 },
  itemLineTotal: { marginTop: 2, color: '#0f766e', fontWeight: '700', fontSize: 13 },
  qtyRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { minWidth: 20, textAlign: 'center', fontWeight: '700' },
  removeBtn: { marginLeft: 8, paddingVertical: 4, paddingHorizontal: 8 },
  removeBtnText: { color: '#dc2626', fontWeight: '700' },
  checkoutBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  checkoutMeta: {
    flex: 1,
    gap: 2,
  },
  checkoutLabel: { fontSize: 11, color: '#64748b' },
  checkoutBreakdown: { fontSize: 13, fontWeight: '700', color: '#334155' },
  checkoutTotal: { fontSize: 20, fontWeight: '800', color: '#1f2a44' },
  checkoutButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkoutDisabled: { backgroundColor: '#94a3b8' },
  checkoutText: { color: '#fff', fontWeight: '800' },
  checkoutHint: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    paddingBottom: 10,
  },
});
