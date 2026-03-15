import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { BottomTabNavigation } from '../components/BottomTabNavigation';
import { DepartmentManagementScreen } from '../screens/admin/DepartmentManagementScreen';
import { RolePolicyScreen } from '../screens/admin/RolePolicyScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { AdminCartScreen } from '../screens/admin/AdminCartScreen';
import { CartScreen, CommerceCenterScreen, MyStoreScreen, ProductCatalogScreen, ProductDetailScreen } from '../screens/products';
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
      { key: 'orders', label: 'Orders', icon: 'receipt' },
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
  const [settingsTab, setSettingsTab] = useState<'users' | 'departments' | 'roles'>('users');
  const [adminCartVisible, setAdminCartVisible] = useState(false);

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
    if (currentTab === 'orders') return { title: 'Commerce Operations', subtitle: 'Monitor orders, delivery notes, loyalty accounts, and warranty cards.' };
    if (currentTab === 'settings') return { title: 'Admin Settings', subtitle: 'Manage users, departments, and permissions.' };
    return { title: `Welcome, ${authUser.username}`, subtitle: 'Your admin workspace is ready.' };
  }, [authUser.username, currentTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <AppHeader
        title={headerCopy.title}
        subtitle={headerCopy.subtitle}
        roleLabel="Admin"
        showCart
        cartCount={0}
        onPressCart={() => setAdminCartVisible(true)}
      />

      <View style={styles.content}>
        {currentTab === 'home' && (
          <ScrollView contentContainerStyle={styles.homeScroll}>
            <View style={styles.homeHeroCard}>
              <View style={styles.homeGlowPrimary} />
              <View style={styles.homeGlowAccent} />
              <Text style={styles.heroEyebrow}>Operations Command</Text>
              <Text style={styles.heroTitle}>Professional control for products, orders, people, and permissions.</Text>
              <Text style={styles.heroText}>Use this admin home as your daily command center to supervise store activity, fulfillment, and access governance from one place.</Text>

              <View style={styles.heroMetricRow}>
                <View style={styles.heroMetricCard}>
                  <Text style={styles.heroMetricValue}>6</Text>
                  <Text style={styles.heroMetricLabel}>Core Workspaces</Text>
                </View>
                <View style={styles.heroMetricCard}>
                  <Text style={styles.heroMetricValue}>Live</Text>
                  <Text style={styles.heroMetricLabel}>Commerce Tracking</Text>
                </View>
                <View style={styles.heroMetricCard}>
                  <Text style={styles.heroMetricValue}>24/7</Text>
                  <Text style={styles.heroMetricLabel}>Operational View</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.homeSectionLabel, { color: colors.text }]}>Jump into a workflow</Text>
            <View style={styles.quickActionGrid}>
              {[
                { key: 'products', label: 'Manage Products', icon: 'grid-outline', blurb: 'Create, refine, and publish catalog inventory.' },
                { key: 'orders', label: 'Run Commerce', icon: 'receipt-outline', blurb: 'Track orders, delivery notes, and warranties.' },
                { key: 'settings', label: 'Control Access', icon: 'shield-checkmark-outline', blurb: 'Manage users, roles, departments, and policies.' },
                { key: 'store', label: 'Inspect Stores', icon: 'storefront-outline', blurb: 'Audit all freelancer store shelves in one view.' },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
                >
                  <View style={styles.quickActionIconWrap}>
                    <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.quickActionTitle, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.quickActionText, { color: colors.textMuted }]}>{item.blurb}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.briefingCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily briefing</Text>
              <Text style={[styles.paragraph, { color: colors.textMuted }]}>Review orders first, then check store content, then tighten role policies. This sequence keeps fulfillment clean while reducing permission drift.</Text>
            </View>
          </ScrollView>
        )}

        {currentTab === 'products' && (
          <ProductCatalogScreen authUser={authUser} isAdmin onSelectProduct={handleSelectProduct} />
        )}

        {currentTab === 'orders' && <CommerceCenterScreen authUser={authUser} isAdmin />}

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

      {/* Admin overview: all freelancer carts */}
      <Modal visible={adminCartVisible} animationType="slide" onRequestClose={() => setAdminCartVisible(false)}>
        <AdminCartScreen onClose={() => setAdminCartVisible(false)} />
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
  homeScroll: {
    paddingHorizontal: 12,
    paddingBottom: 132,
    gap: 14,
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
  homeHeroCard: {
    marginTop: 2,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#0d2f63',
    overflow: 'hidden',
  },
  homeGlowPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(36, 122, 223, 0.38)',
    top: -68,
    right: -48,
  },
  homeGlowAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(247, 148, 29, 0.22)',
    bottom: -28,
    left: -24,
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 21,
  },
  heroMetricRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  heroMetricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
  },
  heroMetricValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  heroMetricLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
  },
  homeSectionLabel: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '900',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    minHeight: 156,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  quickActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#e0efff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '800',
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  briefingCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 8,
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
    backgroundColor: '#DCEEFF',
  },
  settingsTabButtonActiveDark: {
    backgroundColor: '#1A3A6B',
  },
  settingsTabText: {
    fontSize: 12,
    color: '#5e6a84',
    fontWeight: '700',
    textAlign: 'center',
  },
  settingsTabTextActive: {
    color: '#1565C0',
  },
  settingsTabTextActiveDark: {
    color: '#64B5F6',
  },
});
