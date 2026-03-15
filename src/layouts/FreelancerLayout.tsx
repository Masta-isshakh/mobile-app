import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { FreelancerScreen } from '../screens/freelancer/FreelancerScreen';
import { CartScreen, CommerceCenterScreen, MyStoreScreen, ProductCatalogScreen, ProductDetailScreen } from '../screens/products';
import { ProfileScreen } from '../screens/ProfileScreen';
import { client } from '../lib/amplifyClient';
import { useAppTheme } from '../theme/AppThemeContext';
import type { AuthUserContext, BottomTabItem, CartItem, PermissionCheck, Product } from '../types';

type Props = {
  can: PermissionCheck;
  authUser: AuthUserContext;
};

export function FreelancerLayout({ can, authUser }: Props) {
  const { colors } = useAppTheme();
  const tabs = useMemo<BottomTabItem[]>(() => {
    return [
      { key: 'home', label: 'Home', icon: 'home' },
      { key: 'products', label: 'Products', icon: 'grid' },
      { key: 'orders', label: 'Orders', icon: 'receipt' },
      { key: 'store', label: 'My Store', icon: 'storefront' },
      { key: 'profile', label: 'Profile', icon: 'person' },
    ];
  }, []);

  const [tab, setTab] = useState<string>('home');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [cart, setCart] = useState<Map<string, { product: Product; quantity: number }>>(new Map());
  // Tracks DynamoDB CartItem IDs so we can update/delete instead of re-creating
  const cartDbIds = useRef<Map<string, string>>(new Map());

  // Load persisted cart from DynamoDB on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const { data } = await client.models.CartItem.list({
          filter: { ownerSub: { eq: authUser.sub } },
        });
        if (!data?.length) return;
        const newCart = new Map<string, { product: Product; quantity: number }>();
        const newIds = new Map<string, string>();
        for (const item of data as CartItem[]) {
          newCart.set(item.productId, {
            product: {
              id: item.productId,
              name: item.productName,
              price: item.productPrice ?? 0,
              description: null,
              imageDataUrl: item.productImageUrl ?? null,
              creatorSub: '',
              creatorUsername: item.creatorUsername ?? '',
            },
            quantity: item.quantity,
          });
          newIds.set(item.productId, item.id);
        }
        setCart(newCart);
        cartDbIds.current = newIds;
      } catch {
        // Non-fatal: fall back to empty in-memory cart
      }
    };
    void loadCart();
  }, [authUser.sub]);

  const cartItems = useMemo(() => Array.from(cart.values()), [cart]);
  const totalCartItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const handleSelectProduct = useCallback((product: Product) => setSelectedProduct(product), []);
  const handleAddToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(product.id);
      const newQty = (current?.quantity ?? 0) + 1;
      next.set(product.id, { product, quantity: newQty });

      // Sync to DynamoDB
      const dbId = cartDbIds.current.get(product.id);
      if (dbId) {
        void client.models.CartItem.update({ id: dbId, quantity: newQty });
      } else {
        void client.models.CartItem.create({
          productId: product.id,
          productName: product.name,
          productPrice: product.price ?? 0,
          productImageUrl: product.imageDataUrl ?? undefined,
          creatorUsername: product.creatorUsername,
          quantity: newQty,
          ownerSub: authUser.sub,
          ownerUsername: authUser.username,
        }).then((result: { data?: { id?: string } | null }) => {
          if (result.data?.id) cartDbIds.current.set(product.id, result.data.id);
        });
      }
      return next;
    });
  }, [authUser.sub, authUser.username]);

  const increaseCartQty = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(productId);
      if (!current) return prev;
      const newQty = current.quantity + 1;
      next.set(productId, { ...current, quantity: newQty });
      const dbId = cartDbIds.current.get(productId);
      if (dbId) void client.models.CartItem.update({ id: dbId, quantity: newQty });
      return next;
    });
  }, []);

  const decreaseCartQty = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(productId);
      if (!current) return prev;
      if (current.quantity <= 1) {
        next.delete(productId);
        const dbId = cartDbIds.current.get(productId);
        if (dbId) {
          void client.models.CartItem.delete({ id: dbId });
          cartDbIds.current.delete(productId);
        }
      } else {
        const newQty = current.quantity - 1;
        next.set(productId, { ...current, quantity: newQty });
        const dbId = cartDbIds.current.get(productId);
        if (dbId) void client.models.CartItem.update({ id: dbId, quantity: newQty });
      }
      return next;
    });
  }, []);

  const removeCartItem = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      const dbId = cartDbIds.current.get(productId);
      if (dbId) {
        void client.models.CartItem.delete({ id: dbId });
        cartDbIds.current.delete(productId);
      }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    // Delete all DB cart items for this user
    const idsToDelete = Array.from(cartDbIds.current.values());
    for (const id of idsToDelete) {
      void client.models.CartItem.delete({ id });
    }
    cartDbIds.current.clear();
    setCart(new Map());
    setCartVisible(false);
    setSelectedProduct(null);
  }, []);

  const headerCopy = useMemo(() => {
    if (tab === 'products') return { title: 'Product Market', subtitle: 'Browse, rate, and add products to your cart.' };
    if (tab === 'store') return { title: 'My Storefront', subtitle: 'Your curated items, ready to share and sell.' };
    if (tab === 'profile') return { title: 'Profile Studio', subtitle: 'Your account, preferences, and identity details.' };
    if (tab === 'orders') return { title: 'Orders And Loyalty', subtitle: 'Track orders, delivery notes, warranty cards, and loyalty rewards.' };
    return { title: `Hello, ${authUser.username}`, subtitle: 'Your workspace is personalized by role permissions.' };
  }, [authUser.username, tab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <AppHeader
        title={headerCopy.title}
        subtitle={headerCopy.subtitle}
        roleLabel="Freelancer"
        showCart
        cartCount={totalCartItems}
        onPressCart={() => setCartVisible(true)}
      />

      <View style={styles.content}>
        {tab === 'home' && <FreelancerScreen can={can} authUser={authUser} />}

        {tab === 'products' && (
          <ProductCatalogScreen authUser={authUser} isAdmin={false} onSelectProduct={handleSelectProduct} />
        )}

        {tab === 'orders' && <CommerceCenterScreen authUser={authUser} isAdmin={false} />}

        {tab === 'store' && (
          <MyStoreScreen authUser={authUser} isAdmin={false} onSelectProduct={handleSelectProduct} />
        )}

        {tab === 'profile' && (
          <ProfileScreen authUser={authUser} role="Freelancer" />
        )}
      </View>

      <BottomTabNavigation tabs={tabs} current={tab} onChange={setTab} />

      <Modal
        visible={selectedProduct !== null}
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        {selectedProduct !== null && (
          <ProductDetailScreen
            product={selectedProduct}
            authUser={authUser}
            isAdmin={false}
            cartCount={totalCartItems}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setCartVisible(true)}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </Modal>

      <Modal visible={cartVisible} animationType="slide" onRequestClose={() => setCartVisible(false)}>
        <CartScreen
          authUser={authUser}
          items={cartItems}
          onIncrease={increaseCartQty}
          onDecrease={decreaseCartQty}
          onRemove={removeCartItem}
          onCheckoutSuccess={clearCart}
          onClose={() => setCartVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efe7ff',
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#ffffffcc',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2a2f52',
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    color: '#515e78',
    lineHeight: 20,
  },
});
