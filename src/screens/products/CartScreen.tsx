import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SuccessPopup } from '../../components/SuccessPopup';
import { client } from '../../lib/amplifyClient';
import { useStripeBridge } from '../../lib/useStripeBridge.native';
import { useAppTheme } from '../../theme/AppThemeContext';
import { formatQar } from '../../utils/currency';
import { PayPalCheckoutScreen } from './PayPalCheckoutScreen';
import type { AuthUserContext, Product } from '../../types';

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
  const [isPaying, setIsPaying] = useState(false);
  const [payPalApprovalUrl, setPayPalApprovalUrl] = useState('');
  const [payPalOrderId, setPayPalOrderId] = useState('');
  const [successPopup, setSuccessPopup] = useState({ visible: false, title: '', description: '' });
  const { initPaymentSheet, presentPaymentSheet } = useStripeBridge();

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.product.price ?? 0) * item.quantity, 0),
    [items],
  );

  const orderSummary = useMemo(
    () => items.map((item) => `${item.product.name} x${item.quantity}`).slice(0, 8).join(', '),
    [items],
  );

  const closePayPalModal = useCallback(() => {
    setPayPalApprovalUrl('');
    setPayPalOrderId('');
    setIsPaying(false);
  }, []);

  const handleStripeCheckout = useCallback(async () => {
    const amountCents = Math.round(subtotal * 100);
    const customerEmail = authUser.email && authUser.email.includes('@') ? authUser.email : undefined;
    const response = (await client.mutations.createCheckoutSession({
      amountCents,
      currency: 'qar',
      customerEmail,
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
      merchantDisplayName: 'My Amplify Store',
      customerId: payload.customerId,
      customerEphemeralKeySecret: payload.ephemeralKeySecret,
      paymentIntentClientSecret: payload.clientSecret,
      defaultBillingDetails: {
        email: customerEmail,
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

    onCheckoutSuccess();
    setSuccessPopup({
      visible: true,
      title: 'Payment Successful',
      description: 'Your Stripe payment was processed and your cart has been cleared.',
    });
  }, [authUser.email, initPaymentSheet, onCheckoutSuccess, orderSummary, presentPaymentSheet, subtotal]);

  const handlePayPalCheckout = useCallback(async () => {
    const response = (await client.mutations.createPayPalOrder({
      amount: subtotal.toFixed(2),
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
  }, [orderSummary, subtotal]);

  const handleCheckout = useCallback(async () => {
    if (items.length === 0 || subtotal <= 0) {
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
  }, [checkoutMethod, handlePayPalCheckout, handleStripeCheckout, items.length, subtotal]);

  const handlePayPalSuccess = useCallback(() => {
    closePayPalModal();
    onCheckoutSuccess();
    setSuccessPopup({
      visible: true,
      title: 'Payment Successful',
      description: 'Your PayPal payment was processed and your cart has been cleared.',
    });
  }, [closePayPalModal, onCheckoutSuccess]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#23314f" />
        </Pressable>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cart-outline" size={32} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add products from Product Detail to continue.</Text>
          </View>
        ) : (
          <>
            <View style={styles.methodCard}>
              <Text style={styles.methodTitle}>Payment method</Text>
              <View style={styles.methodToggleWrap}>
                <Pressable
                  style={[styles.methodButton, checkoutMethod === 'stripe' ? styles.methodButtonActive : undefined]}
                  onPress={() => setCheckoutMethod('stripe')}
                >
                  <Text style={[styles.methodButtonText, checkoutMethod === 'stripe' ? styles.methodButtonTextActive : undefined]}>Stripe</Text>
                </Pressable>
                <Pressable
                  style={[styles.methodButton, checkoutMethod === 'paypal' ? styles.methodButtonActive : undefined]}
                  onPress={() => setCheckoutMethod('paypal')}
                >
                  <Text style={[styles.methodButtonText, checkoutMethod === 'paypal' ? styles.methodButtonTextActive : undefined]}>PayPal</Text>
                </Pressable>
              </View>
              <Text style={styles.methodHint}>
                {checkoutMethod === 'stripe' ? 'Default secure card checkout with Stripe.' : 'Checkout with PayPal sandbox approval flow.'}
              </Text>
            </View>

            {items.map((item) => (
              <View key={item.product.id} style={styles.itemCard}>
                {item.product.imageDataUrl ? (
                  <Image source={{ uri: item.product.imageDataUrl }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="image-outline" size={20} color="#8b98ad" />
                  </View>
                )}

                <View style={styles.itemMeta}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemPrice}>{formatQar(item.product.price ?? 0)} each</Text>
                  <Text style={styles.itemLineTotal}>
                    Line total: {formatQar((item.product.price ?? 0) * item.quantity)}
                  </Text>

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

      <View style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutLabel}>Subtotal</Text>
          <Text style={styles.checkoutTotal}>{formatQar(subtotal)}</Text>
        </View>

        <Pressable
          style={[
            styles.checkoutButton,
            items.length === 0 || isPaying || subtotal <= 0 ? styles.checkoutDisabled : undefined,
          ]}
          disabled={items.length === 0 || isPaying || subtotal <= 0}
          onPress={() => void handleCheckout()}
        >
          <Text style={styles.checkoutText}>
            {isPaying ? 'Processing...' : checkoutMethod === 'stripe' ? 'Pay with Stripe' : 'Pay with PayPal'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.checkoutHint}>
        {checkoutMethod === 'stripe' ? 'Powered by Stripe test payments in QAR.' : 'Powered by PayPal sandbox checkout in QAR.'}
      </Text>

      <Modal visible={!!payPalApprovalUrl} animationType="slide" onRequestClose={closePayPalModal}>
        {payPalApprovalUrl ? (
          <PayPalCheckoutScreen
            approvalUrl={payPalApprovalUrl}
            orderId={payPalOrderId}
            onSuccess={handlePayPalSuccess}
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4eaf5',
  },
  headerBtn: { width: 28, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#23314f' },
  content: { padding: 12, gap: 10, paddingBottom: 100 },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 24,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#23314f' },
  emptyText: { color: '#64748b' },
  methodCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 8,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f2a44',
  },
  methodToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  methodButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  methodButtonText: {
    color: '#64748b',
    fontWeight: '700',
  },
  methodButtonTextActive: {
    color: '#1f2a44',
  },
  methodHint: {
    fontSize: 12,
    color: '#64748b',
  },
  itemCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
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
  itemPrice: { marginTop: 4, color: '#334155', fontSize: 13 },
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
    borderTopColor: '#dbe5f2',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkoutLabel: { fontSize: 11, color: '#64748b' },
  checkoutTotal: { fontSize: 20, fontWeight: '800', color: '#1f2a44' },
  checkoutButton: {
    backgroundColor: '#7c3aed',
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
    backgroundColor: '#ffffff',
  },
});
