import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { client } from '../../lib/amplifyClient';
import type { AuthUserContext, Product, ProductRating, StoreProduct } from '../../types';

type Props = {
  authUser: AuthUserContext;
  isAdmin: boolean;
  onSelectProduct?: (product: Product) => void;
};

type RatingSummary = {
  average: number;
  count: number;
};

function StarRow({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((index) => {
        const icon = value >= index ? 'star' : value >= index - 0.5 ? 'star-half' : 'star-outline';
        return (
          <View key={index} style={styles.starButton}>
            <Ionicons name={icon} size={size} color="#f59e0b" />
          </View>
        );
      })}
    </View>
  );
}

export function ProductCatalogScreen({ authUser, isAdmin, onSelectProduct }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [storeItems, setStoreItems] = useState<StoreProduct[]>([]);
  const [message, setMessage] = useState('');

  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [description, setDescription] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [initialScore, setInitialScore] = useState(5);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const { width: windowWidth } = useWindowDimensions();
  const cardGap = 10;
  const horizontalPadding = 24;
  const cardWidth = Math.max(Math.floor((windowWidth - horizontalPadding - cardGap) / 2), 150);

  const loadData = useCallback(async () => {
    const [productsResponse, ratingsResponse, storeResponse] = await Promise.all([
      client.models.ProductX.list(),
      client.models.ProductRating.list(),
      client.models.StoreProduct.list({ filter: { ownerSub: { eq: authUser.sub } } }),
    ]);

    setProducts((productsResponse.data ?? []) as Product[]);
    setRatings((ratingsResponse.data ?? []) as ProductRating[]);
    setStoreItems((storeResponse.data ?? []) as StoreProduct[]);
  }, [authUser.sub]);

  useEffect(() => {
    loadData().catch((error: unknown) => setMessage((error as Error).message));
  }, [loadData]);

  const ratingSummaryByProduct = useMemo(() => {
    const map = new Map<string, RatingSummary>();

    for (const rating of ratings) {
      const current = map.get(rating.productId) ?? { average: 0, count: 0 };
      const nextCount = current.count + 1;
      const nextAverage = (current.average * current.count + rating.score) / nextCount;
      map.set(rating.productId, { average: nextAverage, count: nextCount });
    }

    return map;
  }, [ratings]);

  const storedProductIds = useMemo(() => new Set(storeItems.map((item) => item.productId)), [storeItems]);

  const resetForm = useCallback(() => {
    setName('');
    setPriceText('');
    setDescription('');
    setImageDataUrl('');
    setInitialScore(5);
    setEditingProductId(null);
  }, []);

  const parsePrice = useCallback(() => {
    const parsed = Number.parseFloat(priceText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  }, [priceText]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Media access is required to upload product images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const selected = result.assets[0];
    const processed = await ImageManipulator.manipulateAsync(
      selected.uri,
      [{ resize: { width: 640 } }],
      {
        compress: 0.68,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );

    if (!processed.base64) {
      setMessage('Unable to prepare image. Please choose another image.');
      return;
    }

    setImageDataUrl(`data:image/jpeg;base64,${processed.base64}`);
  }, []);

  const createProduct = useCallback(async () => {
    if (!name.trim()) {
      setMessage('Product name is required.');
      return;
    }

    const price = parsePrice();
    if (price === null) {
      setMessage('Price must be a valid number greater than or equal to 0.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const productResponse = await client.models.ProductX.create({
        name: name.trim(),
        price,
        description: description.trim() || undefined,
        imageDataUrl: imageDataUrl || undefined,
        creatorSub: authUser.sub,
        creatorUsername: authUser.username,
      });

      const createdProduct = productResponse.data as Product | undefined;
      if (createdProduct && initialScore >= 1 && initialScore <= 5) {
        await client.models.ProductRating.create({
          productId: createdProduct.id,
          userSub: authUser.sub,
          score: initialScore,
        });
      }

      setCreateVisible(false);
      resetForm();
      setMessage('Product created successfully.');
      await loadData();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  }, [authUser.sub, authUser.username, description, imageDataUrl, initialScore, loadData, name, parsePrice, resetForm]);

  const openEdit = useCallback((product: Product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setPriceText(String(product.price ?? 0));
    setDescription(product.description ?? '');
    setImageDataUrl(product.imageDataUrl ?? '');
    setEditVisible(true);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingProductId) {
      return;
    }
    if (!name.trim()) {
      setMessage('Product name is required.');
      return;
    }

    const price = parsePrice();
    if (price === null) {
      setMessage('Price must be a valid number greater than or equal to 0.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      await client.models.ProductX.update({
        id: editingProductId,
        name: name.trim(),
        price,
        description: description.trim() || undefined,
        imageDataUrl: imageDataUrl || undefined,
      });
      setEditVisible(false);
      resetForm();
      setMessage('Product updated successfully.');
      await loadData();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  }, [description, editingProductId, imageDataUrl, loadData, name, parsePrice, resetForm]);

  const deleteProduct = useCallback((product: Product) => {
    Alert.alert('Delete Product', `Delete "${product.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await client.models.ProductX.delete({ id: product.id });
              setMessage('Product deleted.');
              await loadData();
            } catch (error: unknown) {
              setMessage((error as Error).message);
            }
          })();
        },
      },
    ]);
  }, [loadData]);

  const addToStore = useCallback(
    async (productId: string) => {
      if (storedProductIds.has(productId)) {
        setMessage('This product is already in your store.');
        return;
      }

      try {
        await client.models.StoreProduct.create({
          productId,
          ownerSub: authUser.sub,
          ownerUsername: authUser.username,
        });
        setMessage('Product added to your store.');
        await loadData();
      } catch (error: unknown) {
        setMessage((error as Error).message);
      }
    },
    [authUser.sub, authUser.username, loadData, storedProductIds],
  );

  const sortedProducts = useMemo(() => [...products].reverse(), [products]);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Products</Text>
        {isAdmin && (
          <Pressable style={styles.uploadButton} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
            <Text style={styles.uploadButtonText}>Create Product</Text>
          </Pressable>
        )}
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}

      <ScrollView
        contentContainerStyle={[
          styles.contentWrap,
          {
            flexDirection: 'row',
            flexWrap: 'wrap',
            columnGap: cardGap,
            rowGap: cardGap,
            justifyContent: 'space-between',
          },
        ]}
      >
        {sortedProducts.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyText}>Admins can create products. Freelancers can browse and add them to their store.</Text>
          </View>
        )}

        {sortedProducts.map((product) => {
          const summary = ratingSummaryByProduct.get(product.id) ?? { average: 0, count: 0 };
          const alreadyInStore = storedProductIds.has(product.id);

          return (
            <Pressable
              key={product.id}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  elevation: Platform.OS === 'android' ? 7 : 0,
                },
              ]}
              onPress={() => onSelectProduct?.(product)}
            >
              {product.imageDataUrl ? (
                <Image source={{ uri: product.imageDataUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#8b98ad" />
                </View>
              )}

              <Text style={styles.cardTitle} numberOfLines={2}>{product.name}</Text>
              <Text style={styles.priceText}>${(product.price ?? 0).toFixed(2)}</Text>
              {!!product.description && (
                <Text style={styles.cardText} numberOfLines={2}>{product.description}</Text>
              )}
              <Text style={styles.metaText}>By {product.creatorUsername}</Text>

              <View style={styles.compactRating}>
                <StarRow value={summary.average} size={12} />
                <Text style={styles.ratingMeta}>
                  {summary.count > 0 ? `${summary.average.toFixed(1)} (${summary.count})` : 'No ratings'}
                </Text>
              </View>

              {isAdmin ? (
                <View style={styles.adminActions}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => openEdit(product)}
                  >
                    <Text style={styles.adminButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => deleteProduct(product)}
                  >
                    <Text style={styles.adminButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.storeButton, alreadyInStore ? styles.storeButtonDisabled : undefined]}
                  disabled={alreadyInStore}
                  onPress={() => void addToStore(product.id)}
                >
                  <Text style={styles.storeButtonText}>{alreadyInStore ? 'In My Store' : 'Add to Store'}</Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Product</Text>

            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" />
            <TextInput
              style={styles.input}
              value={priceText}
              onChangeText={setPriceText}
              placeholder="Price (e.g. 29.99)"
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Product description"
              multiline
            />

            <Pressable style={styles.pickImageButton} onPress={() => void pickImage()}>
              <Ionicons name="image-outline" size={16} color="#17348d" />
              <Text style={styles.pickImageText}>{imageDataUrl ? 'Change image' : 'Upload image'}</Text>
            </Pressable>

            {!!imageDataUrl && <Image source={{ uri: imageDataUrl }} style={styles.previewImage} />}

            <Text style={styles.ratingLabel}>Initial rating</Text>
            <View style={styles.starRowWrap}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setInitialScore(value)}>
                  <Ionicons
                    name={initialScore >= value ? 'star' : 'star-outline'}
                    size={22}
                    color="#f59e0b"
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setCreateVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, uploading ? styles.submitDisabled : undefined]}
                onPress={() => void createProduct()}
                disabled={uploading}
              >
                <Text style={styles.submitText}>{uploading ? 'Saving...' : 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Product</Text>

            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" />
            <TextInput
              style={styles.input}
              value={priceText}
              onChangeText={setPriceText}
              placeholder="Price (e.g. 29.99)"
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Product description"
              multiline
            />

            <Pressable style={styles.pickImageButton} onPress={() => void pickImage()}>
              <Ionicons name="image-outline" size={16} color="#17348d" />
              <Text style={styles.pickImageText}>{imageDataUrl ? 'Change image' : 'Upload image'}</Text>
            </Pressable>

            {!!imageDataUrl && <Image source={{ uri: imageDataUrl }} style={styles.previewImage} />}

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setEditVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, uploading ? styles.submitDisabled : undefined]}
                onPress={() => void saveEdit()}
                disabled={uploading}
              >
                <Text style={styles.submitText}>{uploading ? 'Saving...' : 'Save Changes'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  topBar: {
    marginHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2a2f52',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
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
    alignItems: 'flex-start',
  },
  emptyCard: {
    width: '100%',
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
  card: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 10,
    minHeight: 212,
    marginBottom: 0,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  image: {
    width: '100%',
    height: 86,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
  },
  imagePlaceholder: {
    width: '100%',
    height: 86,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#23314f',
  },
  priceText: {
    marginTop: 4,
    color: '#0f766e',
    fontWeight: '800',
    fontSize: 14,
  },
  cardText: {
    marginTop: 4,
    fontSize: 12,
    color: '#52617c',
    lineHeight: 16,
  },
  metaText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7a93',
  },
  ratingMeta: {
    color: '#67748b',
    fontSize: 11,
    marginTop: 2,
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    paddingRight: 2,
    paddingVertical: 2,
  },
  adminActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  adminButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  storeButton: {
    marginTop: 12,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  storeButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  storeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 17, 30, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2a44',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4deeb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    backgroundColor: '#f8fbff',
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  pickImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e4ecff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  pickImageText: {
    color: '#17348d',
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#eef2f8',
  },
  ratingLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  starRowWrap: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#111827',
    fontWeight: '700',
  },
  submitButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingVertical: 10,
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
