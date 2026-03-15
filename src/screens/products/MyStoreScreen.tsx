import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { client } from '../../lib/amplifyClient';
import { useAppTheme } from '../../theme/AppThemeContext';
import { formatQar } from '../../utils/currency';
import type { AuthUserContext, Product, StoreProduct } from '../../types';

type Props = {
  authUser: AuthUserContext;
  isAdmin: boolean;
  onSelectProduct?: (product: Product) => void;
};

export function MyStoreScreen({ authUser, isAdmin, onSelectProduct }: Props) {
  const { colors } = useAppTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [storeItems, setStoreItems] = useState<StoreProduct[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingStoreItemId, setDeletingStoreItemId] = useState<string | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const cardGap = 10;
  const horizontalPadding = 24;
  const cardWidth = Math.max(Math.floor((windowWidth - horizontalPadding - cardGap) / 2), 150);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsResponse, storeResponse] = await Promise.all([
        client.models.ProductX.list(),
        isAdmin
          ? client.models.StoreProduct.list()
          : client.models.StoreProduct.list({ filter: { ownerSub: { eq: authUser.sub } } }),
      ]);

      setProducts((productsResponse.data ?? []) as Product[]);
      setStoreItems((storeResponse.data ?? []) as StoreProduct[]);
    } finally {
      setIsLoading(false);
    }
  }, [authUser.sub, isAdmin]);

  useEffect(() => {
    loadData().catch((error: unknown) => setMessage((error as Error).message));
  }, [loadData]);

  const productById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const groupedByUser = useMemo(() => {
    const map = new Map<string, StoreProduct[]>();
    for (const item of storeItems) {
      const key = item.ownerUsername;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [storeItems]);

  const ownItems = useMemo(() => {
    return storeItems.filter((item) => item.ownerSub === authUser.sub);
  }, [authUser.sub, storeItems]);

  const handleDeleteStoreItem = useCallback((item: StoreProduct, productName: string) => {
    Alert.alert(
      'Remove from store',
      `Delete ${productName} from ${item.ownerUsername}'s store?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeletingStoreItemId(item.id);
            void client.models.StoreProduct.delete({ id: item.id })
              .then(() => loadData())
              .catch((error: unknown) => setMessage((error as Error).message))
              .finally(() => setDeletingStoreItemId(null));
          },
        },
      ],
    );
  }, [loadData]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{isAdmin ? 'All User Stores' : 'My Store'}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}

      {isLoading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textMuted }]}>Loading store data...</Text>
        </View>
      )}

      {!isLoading && <ScrollView
        contentContainerStyle={[
          styles.contentWrap,
          isAdmin ? styles.contentWrapAdmin : styles.contentWrapFreelancer,
        ]}
      >
        {isAdmin ? (
          groupedByUser.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}> 
              <Text style={styles.emptyTitle}>No Store Items Yet</Text>
              <Text style={styles.emptyText}>When users add products to their store, you will see them here grouped by user.</Text>
            </View>
          ) : (
            groupedByUser.map(([key, items]) => {
              const ownerUsername = key;
              return (
                <View key={key} style={[styles.groupCard, { backgroundColor: colors.surface }]}>
                  <Text style={styles.groupTitle}>{ownerUsername}</Text>
                  <Text style={styles.groupSubtitle}>
                    {items.length} product{items.length !== 1 ? 's' : ''}
                  </Text>

                  {items.map((item) => {
                    const product = productById.get(item.productId);
                    if (!product) {
                      return null;
                    }

                    return (
                      <View key={item.id} style={styles.productRow}>
                        <Pressable style={styles.productRowMain} onPress={() => onSelectProduct?.(product)}>
                          {product.imageDataUrl ? (
                            <Image source={{ uri: product.imageDataUrl }} style={styles.thumb} />
                          ) : (
                            <View style={styles.thumbFallback}>
                              <Ionicons name="image-outline" size={16} color="#8b98ad" />
                            </View>
                          )}

                          <View style={styles.productMeta}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productPrice}>{formatQar(product.price ?? 0)}</Text>
                          </View>
                        </Pressable>

                        {isAdmin ? (
                          <Pressable
                            style={[
                              styles.deleteButton,
                              deletingStoreItemId === item.id ? styles.deleteButtonDisabled : undefined,
                            ]}
                            disabled={deletingStoreItemId === item.id}
                            onPress={() => handleDeleteStoreItem(item, product.name)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#dc2626" />
                            <Text style={styles.deleteButtonText}>
                              {deletingStoreItemId === item.id ? 'Deleting...' : 'Delete'}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })
          )
        ) : ownItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}> 
            <Text style={styles.emptyTitle}>Your Store is Empty</Text>
            <Text style={styles.emptyText}>Add products from the Products tab to populate your store page.</Text>
          </View>
        ) : (
          ownItems.map((item) => {
            const product = productById.get(item.productId);
            if (!product) {
              return null;
            }

            return (
              <Pressable
                key={item.id}
                style={[styles.productCard, { width: cardWidth, backgroundColor: colors.surface }]}
                onPress={() => onSelectProduct?.(product)}
              >
                {product.imageDataUrl ? (
                  <Image source={{ uri: product.imageDataUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.imageFallback}>
                    <Ionicons name="image-outline" size={24} color="#8b98ad" />
                  </View>
                )}

                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{formatQar(product.price ?? 0)}</Text>
                {isAdmin && <Text style={styles.productOwner}>By {product.creatorUsername}</Text>}
              </Pressable>
            );
          })
        )}
      </ScrollView>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  title: {
    marginHorizontal: 12,
    marginBottom: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#2a2f52',
  },
  message: {
    marginHorizontal: 12,
    marginBottom: 8,
    color: '#9a3412',
    fontWeight: '600',
  },
  loaderWrap: {
    marginTop: 26,
    alignItems: 'center',
    gap: 10,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentWrap: {
    paddingHorizontal: 12,
    paddingBottom: 130,
    gap: 10,
  },
  contentWrapAdmin: {
    flexDirection: 'column',
  },
  contentWrapFreelancer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 10,
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: '#ffffffcc',
    padding: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1f2a44',
  },
  emptyText: {
    marginTop: 6,
    color: '#5b6880',
  },
  groupCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#263559',
  },
  groupSubtitle: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
  },
  productRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  productRowMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#eef2f8',
  },
  thumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMeta: {
    flex: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.55,
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
  },
  productCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 10,
    minHeight: 212,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  image: {
    width: '100%',
    height: 86,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
  },
  imageFallback: {
    width: '100%',
    height: 86,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#23314f',
  },
  productPrice: {
    marginTop: 4,
    color: '#0f766e',
    fontWeight: '800',
    fontSize: 14,
  },
  productOwner: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7a93',
  },
});
