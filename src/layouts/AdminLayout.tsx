import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { DepartmentManagementScreen } from '../screens/admin/DepartmentManagementScreen';
import { RolePolicyScreen } from '../screens/admin/RolePolicyScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { CartScreen, MyStoreScreen, ProductCatalogScreen, ProductDetailScreen } from '../screens/products';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAppTheme } from '../theme/AppThemeContext';
import type { AuthUserContext, BottomTabItem, PermissionCheck, Product } from '../types';

type Props = {
  can: PermissionCheck;
  authUser: AuthUserContext;
};

export function AdminLayout({ can, authUser }: Props) {
  const { isDarkMode, colors } = useAppTheme();
  const tabs = useMemo<BottomTabItem[]>(() => {
    return [
      { key: 'home', label: 'Home', icon: 'home' },
      { key: 'products', label: 'Products', icon: 'grid' },
      { key: 'settings', label: 'Settings', icon: 'settings' },
      { key: 'store', label: 'My Store', icon: 'storefront' },
      { key: 'profile', label: 'Profile', icon: 'person' },
    ];
  }, [can]);

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
  const [settingsTab, setSettingsTab] = useState<'users' | 'departments' | 'roles'>('users');

  const currentTab = tabs.some((item) => item.key === tab) ? tab : 'home';

  const settingsItems = [
    { key: 'users', label: 'User Management' },
    { key: 'departments', label: 'Department Management' },
    { key: 'roles', label: 'Role Management' },
  ] as const;

  const headerCopy = useMemo(() => {
    if (currentTab === 'products') return { title: 'Product Control', subtitle: 'Create, edit, and publish products for the marketplace.' };
    if (currentTab === 'store') return { title: 'Store Oversight', subtitle: 'Review every freelancer store from one dashboard.' };
    if (currentTab === 'profile') return { title: 'Admin Profile', subtitle: 'Manage your identity, settings, and security.' };
    if (currentTab === 'settings') return { title: 'Admin Settings', subtitle: 'Manage users, departments, and permissions.' };
    return { title: `Welcome, ${authUser.username}`, subtitle: 'Your admin workspace is ready.' };
  }, [authUser.username, currentTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <AppHeader
        title={headerCopy.title}
        subtitle={headerCopy.subtitle}
        roleLabel="Admin"
      />

      <View style={styles.content}>
        {currentTab === 'home' && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.paragraph, { color: colors.textMuted }]}>Use Settings to manage users, departments, and role policies.</Text>
          </View>
        )}

        {currentTab === 'products' && (
          <ProductCatalogScreen authUser={authUser} isAdmin onSelectProduct={handleSelectProduct} />
        )}

        {currentTab === 'store' && (
          <MyStoreScreen authUser={authUser} isAdmin onSelectProduct={handleSelectProduct} />
        )}

        {currentTab === 'profile' && (
          <ProfileScreen authUser={authUser} role="Admin" />
        )}

        {currentTab === 'settings' && (
          <>
            <View style={[styles.settingsTabBar, { backgroundColor: colors.surface }]}> 
              {settingsItems.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setSettingsTab(item.key)}
                  style={[
                    styles.settingsTabButton,
                    settingsTab === item.key ? styles.settingsTabButtonActive : undefined,
                    settingsTab === item.key && isDarkMode ? styles.settingsTabButtonActiveDark : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingsTabText,
                      { color: colors.textMuted },
                      settingsTab === item.key ? styles.settingsTabTextActive : undefined,
                      settingsTab === item.key && isDarkMode ? styles.settingsTabTextActiveDark : undefined,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {settingsTab === 'users' && <UserManagementScreen can={can} />}
            {settingsTab === 'departments' && <DepartmentManagementScreen can={can} />}
            {settingsTab === 'roles' && <RolePolicyScreen can={can} />}
          </>
        )}
      </View>

      <BottomTabNavigation tabs={tabs} current={currentTab} onChange={setTab} />

      <Modal
        visible={selectedProduct !== null}
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        {selectedProduct !== null && (
          <ProductDetailScreen
            product={selectedProduct}
            authUser={authUser}
            isAdmin
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
    backgroundColor: '#ffffffcc',
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2a2f52',
  },
  paragraph: {
    marginTop: 8,
    fontSize: 14,
    color: '#515e78',
    lineHeight: 20,
  },
  settingsTabBar: {
    marginHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 6,
    flexDirection: 'row',
    gap: 6,
  },
  settingsTabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  settingsTabButtonActive: {
    backgroundColor: '#efe4ff',
  },
  settingsTabButtonActiveDark: {
    backgroundColor: '#312b52',
  },
  settingsTabText: {
    fontSize: 12,
    color: '#5e6a84',
    fontWeight: '700',
    textAlign: 'center',
  },
  settingsTabTextActive: {
    color: '#6d28d9',
  },
  settingsTabTextActiveDark: {
    color: '#c4b5fd',
  },
});
