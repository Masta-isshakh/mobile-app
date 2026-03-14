import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { client } from '../../lib/amplifyClient';
import type { AuthUserContext, Product, StoreProduct } from '../../types';

type Props = {
  authUser: AuthUserContext;
  isAdmin: boolean;
};

export function MyStoreScreen({ authUser, isAdmin }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeItems, setStoreItems] = useState<StoreProduct[]>([]);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const [productsResponse, storeResponse] = await Promise.all([
      client.models.ProductX.list(),
      isAdmin
        ? client.models.StoreProduct.list()
        : client.models.StoreProduct.list({ filter: { ownerSub: { eq: authUser.sub } } }),
    ]);

    setProducts((productsResponse.data ?? []) as Product[]);
    setStoreItems((storeResponse.data ?? []) as StoreProduct[]);
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
      const key = `${item.ownerUsername}::${item.ownerSub}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [storeItems]);

  const ownItems = useMemo(() => {
    return storeItems.filter((item) => item.ownerSub === authUser.sub);
  }, [authUser.sub, storeItems]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{isAdmin ? 'All User Stores' : 'My Store'}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}

      <ScrollView contentContainerStyle={styles.contentWrap}>
        {isAdmin ? (
          groupedByUser.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Store Items Yet</Text>
              <Text style={styles.emptyText}>When users add products to their store, you will see them here grouped by user.</Text>
            </View>
          ) : (
            groupedByUser.map(([key, items]) => {
              const [ownerUsername, ownerSub] = key.split('::');
              return (
                <View key={key} style={styles.groupCard}>
                  <Text style={styles.groupTitle}>{ownerUsername}</Text>
                  <Text style={styles.groupSubtitle}>User ID: {ownerSub}</Text>

                  {items.map((item) => {
                    const product = productById.get(item.productId);
                    if (!product) {
                      return null;
                    }

                    return (
                      <View key={item.id} style={styles.productRow}>
                        {product.imageDataUrl ? (
                          <Image source={{ uri: product.imageDataUrl }} style={styles.thumb} />
                        ) : (
                          <View style={styles.thumbFallback}>
                            <Ionicons name="image-outline" size={16} color="#8b98ad" />
                          </View>
                        )}

                        <View style={styles.productMeta}>
                          <Text style={styles.productName}>{product.name}</Text>
                          {!!product.description && <Text style={styles.productDescription}>{product.description}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )
        ) : ownItems.length === 0 ? (
          <View style={styles.emptyCard}>
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
              <View key={item.id} style={styles.productCard}>
                {product.imageDataUrl ? (
                  <Image source={{ uri: product.imageDataUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.imageFallback}>
                    <Ionicons name="image-outline" size={24} color="#8b98ad" />
                  </View>
                )}

                <Text style={styles.productName}>{product.name}</Text>
                {!!product.description && <Text style={styles.productDescription}>{product.description}</Text>}
              </View>
            );
          })
        )}
      </ScrollView>
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
  contentWrap: {
    paddingHorizontal: 12,
    paddingBottom: 130,
    gap: 10,
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
  productCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  image: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
  },
  imageFallback: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#23314f',
  },
  productDescription: {
    marginTop: 4,
    color: '#52617c',
    fontSize: 13,
  },
});
