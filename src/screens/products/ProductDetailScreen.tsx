import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SuccessPopup } from '../../components/SuccessPopup';
import { client } from '../../lib/amplifyClient';
import { useAppTheme } from '../../theme/AppThemeContext';
import { formatQar } from '../../utils/currency';
import type { AuthUserContext, Product, ProductRating } from '../../types';

type Props = {
  product: Product;
  authUser: AuthUserContext;
  isAdmin: boolean;
  cartCount: number;
  onAddToCart: (product: Product) => void;
  onOpenCart: () => void;
  onClose: () => void;
};

function StarRow({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => {
        const icon: 'star' | 'star-half' | 'star-outline' =
          value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline';
        return (
          <Pressable key={i} onPress={() => onChange?.(i)} disabled={!onChange} style={styles.starPad}>
            <Ionicons name={icon} size={size} color="#f59e0b" />
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProductDetailScreen({
  product,
  authUser,
  isAdmin,
  cartCount,
  onAddToCart,
  onOpenCart,
  onClose,
}: Props) {
  const { colors } = useAppTheme();
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [isInStore, setIsInStore] = useState(false);
  const [message, setMessage] = useState('');
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [successPopup, setSuccessPopup] = useState({ visible: false, title: '', description: '' });

  const loadData = useCallback(async () => {
    const [ratingsRes, storeRes] = await Promise.all([
      client.models.ProductRating.list({ filter: { productId: { eq: product.id } } }),
      client.models.StoreProduct.list({
        filter: { ownerSub: { eq: authUser.sub }, productId: { eq: product.id } },
      }),
    ]);
    setRatings((ratingsRes.data ?? []) as ProductRating[]);
    setIsInStore((storeRes.data ?? []).length > 0);
  }, [authUser.sub, product.id]);

  useEffect(() => {
    loadData().catch((e: unknown) => setMessage((e as Error).message));
  }, [loadData]);

  const totalCount = ratings.length;
  const averageRating = totalCount > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / totalCount : 0;
  const userRating = ratings.find((r) => r.userSub === authUser.sub)?.score ?? 0;

  const handleRate = useCallback(
    async (score: number) => {
      setIsRatingLoading(true);
      const existing = ratings.find((r) => r.userSub === authUser.sub);
      try {
        if (existing) {
          await client.models.ProductRating.update({ id: existing.id, score });
        } else {
          await client.models.ProductRating.create({
            productId: product.id,
            userSub: authUser.sub,
            score,
          });
        }
        await loadData();
        setSuccessPopup({
          visible: true,
          title: 'Rating Saved',
          description: 'Your rating was updated successfully.',
        });
      } catch (e: unknown) {
        setMessage((e as Error).message);
      } finally {
        setIsRatingLoading(false);
      }
    },
    [authUser.sub, loadData, product.id, ratings],
  );

  const handleAddToStore = useCallback(async () => {
    if (isInStore || isAdmin) {
      return;
    }
    setIsStoreLoading(true);
    try {
      await client.models.StoreProduct.create({
        productId: product.id,
        ownerSub: authUser.sub,
        ownerUsername: authUser.username,
      });
      setIsInStore(true);
      setMessage('Added to your store.');
      setSuccessPopup({
        visible: true,
        title: 'Added To Store',
        description: 'This product is now in your store.',
      });
    } catch (e: unknown) {
      setMessage((e as Error).message);
    } finally {
      setIsStoreLoading(false);
    }
  }, [authUser.sub, authUser.username, isAdmin, isInStore, product.id]);

  const handleAddToCart = useCallback(() => {
    onAddToCart(product);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1600);
  }, [onAddToCart, product]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#23314f" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <Pressable onPress={onOpenCart} style={styles.cartWrap} hitSlop={8}>
          <Ionicons name="cart-outline" size={24} color="#23314f" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {product.imageDataUrl ? (
          <Image source={{ uri: product.imageDataUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={56} color="#8b98ad" />
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>{formatQar(product.price ?? 0)}</Text>
          {!!product.description && <Text style={styles.productDesc}>{product.description}</Text>}
          {isAdmin && <Text style={styles.creatorText}>By {product.creatorUsername}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          {totalCount > 0 ? (
            <>
              <StarRow value={averageRating} size={22} />
              <Text style={styles.ratingMeta}>
                {averageRating.toFixed(1)} / 5 · {totalCount} {totalCount === 1 ? 'rating' : 'ratings'}
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>No ratings yet. Be the first!</Text>
          )}
          <Text style={styles.sectionSubtitle}>Your rating</Text>
          {isRatingLoading ? (
            <View style={styles.ratingLoaderWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.ratingLoaderText}>Saving rating...</Text>
            </View>
          ) : (
            <StarRow value={userRating} onChange={(s) => void handleRate(s)} size={26} />
          )}
        </View>

        {!!message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.actions}>
          <Pressable
            style={[styles.cartButton, addedFeedback ? styles.cartButtonSuccess : undefined]}
            onPress={handleAddToCart}
          >
            <Ionicons name={addedFeedback ? 'checkmark-circle' : 'cart'} size={20} color="#fff" />
            <Text style={styles.cartButtonText}>{addedFeedback ? 'Added to Cart!' : 'Add to Cart'}</Text>
          </Pressable>

          {!isAdmin && (
            <Pressable
              style={[styles.storeButton, isInStore ? styles.storeButtonDisabled : undefined]}
              disabled={isInStore || isStoreLoading}
              onPress={() => void handleAddToStore()}
            >
              <Ionicons name="storefront-outline" size={20} color="#fff" />
              <Text style={styles.storeButtonText}>
                {isInStore ? 'Already in My Store' : isStoreLoading ? 'Adding...' : 'Add to My Store'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4eaf5',
    gap: 8,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#23314f' },
  cartWrap: { position: 'relative', paddingRight: 6 },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: 2,
    backgroundColor: '#e11d48',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  scrollContent: { paddingBottom: 48 },
  image: { width: '100%', height: 300, backgroundColor: '#eef2f8' },
  imageFallback: {
    width: '100%',
    height: 300,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: { backgroundColor: '#ffffff', padding: 18, gap: 6 },
  productName: { fontSize: 22, fontWeight: '800', color: '#1f2a44' },
  productPrice: { fontSize: 20, fontWeight: '800', color: '#0f766e' },
  productDesc: { fontSize: 14, color: '#52617c', lineHeight: 22 },
  creatorText: { fontSize: 12, color: '#8b98ad', fontWeight: '600', marginTop: 4 },
  section: {
    margin: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#23314f' },
  sectionSubtitle: { fontSize: 13, fontWeight: '700', color: '#23314f', marginTop: 8 },
  ratingMeta: { fontSize: 13, color: '#48617a', marginTop: 2 },
  muted: { fontSize: 13, color: '#9ba8bd' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starPad: { paddingRight: 2, paddingVertical: 2 },
  message: {
    marginHorizontal: 12,
    color: '#9a3412',
    fontWeight: '600',
    marginBottom: 4,
  },
  actions: { margin: 12, gap: 10 },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
  },
  cartButtonSuccess: { backgroundColor: '#059669' },
  cartButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f766e',
    borderRadius: 14,
    paddingVertical: 14,
  },
  storeButtonDisabled: { backgroundColor: '#94a3b8' },
  storeButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  ratingLoaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingLoaderText: {
    color: '#52617c',
    fontSize: 12,
    fontWeight: '600',
  },
});
