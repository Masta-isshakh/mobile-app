import { useCallback, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { FreelancerScreen } from '../screens/freelancer/FreelancerScreen';
import { CartScreen, MyStoreScreen, ProductCatalogScreen, ProductDetailScreen } from '../screens/products';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAppTheme } from '../theme/AppThemeContext';
import type { AuthUserContext, BottomTabItem, PermissionCheck, Product } from '../types';

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
      { key: 'settings', label: 'Settings', icon: 'settings' },
      { key: 'store', label: 'My Store', icon: 'storefront' },
      { key: 'profile', label: 'Profile', icon: 'person' },
    ];
  }, []);

  const [tab, setTab] = useState<string>('home');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [cart, setCart] = useState<Map<string, { product: Product; quantity: number }>>(new Map());
  const cartItems = useMemo(() => Array.from(cart.values()), [cart]);
  const totalCartItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const handleSelectProduct = useCallback((product: Product) => setSelectedProduct(product), []);
  const handleAddToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(product.id);
      next.set(product.id, {
        product,
        quantity: (current?.quantity ?? 0) + 1,
      });
      return next;
    });
  }, []);

  const increaseCartQty = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(productId);
      if (!current) return prev;
      next.set(productId, { ...current, quantity: current.quantity + 1 });
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
      } else {
        next.set(productId, { ...current, quantity: current.quantity - 1 });
      }
      return next;
    });
  }, []);

  const removeCartItem = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(new Map());
    setCartVisible(false);
    setSelectedProduct(null);
  }, []);

  const headerCopy = useMemo(() => {
    if (tab === 'products') return { title: 'Product Market', subtitle: 'Browse, rate, and add products to your cart.' };
    if (tab === 'store') return { title: 'My Storefront', subtitle: 'Your curated items, ready to share and sell.' };
    if (tab === 'profile') return { title: 'Profile Studio', subtitle: 'Your account, preferences, and identity details.' };
    if (tab === 'settings') return { title: 'Workspace Settings', subtitle: 'Adjust your app behavior and preferences.' };
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

        {tab === 'settings' && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.cardText, { color: colors.textMuted }]}>Account and notification settings can be managed here.</Text>
          </View>
        )}

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
