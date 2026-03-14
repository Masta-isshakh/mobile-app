import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';

import { client } from '../../lib/amplifyClient';
import type { AuthUserContext, Product, ProductRating, StoreProduct } from '../../types';

type Props = {
  authUser: AuthUserContext;
};

type RatingSummary = {
  average: number;
  count: number;
};

function StarRow({ value, onChange, size = 18 }: { value: number; onChange?: (value: number) => void; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((index) => {
        const icon = value >= index ? 'star' : value >= index - 0.5 ? 'star-half' : 'star-outline';
        return (
          <Pressable
            key={index}
            onPress={() => onChange?.(index)}
            disabled={!onChange}
            style={styles.starButton}
          >
            <Ionicons name={icon} size={size} color="#f59e0b" />
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProductCatalogScreen({ authUser }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [storeItems, setStoreItems] = useState<StoreProduct[]>([]);
  const [message, setMessage] = useState('');

  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [initialScore, setInitialScore] = useState(5);

  // Responsive grid
  const { width: windowWidth } = useWindowDimensions();
  // 1 column for phones, 2 for small tablets, 3 for large tablets, 4 for desktop
  const cardGap = windowWidth > 900 ? 28 : windowWidth > 700 ? 22 : windowWidth > 500 ? 16 : 10;
  const numColumns = windowWidth > 1200 ? 4 : windowWidth > 900 ? 3 : windowWidth > 700 ? 2 : 1;
  const cardWidth = Math.max(
    Math.floor((windowWidth - (cardGap * (numColumns + 1))) / numColumns),
    260
  );

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

  const ratingByProductForCurrentUser = useMemo(() => {
    const map = new Map<string, ProductRating>();
    for (const rating of ratings) {
      if (rating.userSub === authUser.sub) {
        map.set(rating.productId, rating);
      }
    }
    return map;
  }, [authUser.sub, ratings]);

  const storedProductIds = useMemo(() => {
    return new Set(storeItems.map((item) => item.productId));
  }, [storeItems]);

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

  const resetUploadForm = useCallback(() => {
    setName('');
    setDescription('');
    setImageDataUrl('');
    setInitialScore(5);
  }, []);

  const createProduct = useCallback(async () => {
    if (!name.trim()) {
      setMessage('Product name is required.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const productResponse = await client.models.ProductX.create({
        name: name.trim(),
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

      setUploadVisible(false);
      resetUploadForm();
      setMessage('Product uploaded successfully.');
      await loadData();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  }, [authUser.sub, authUser.username, description, imageDataUrl, initialScore, loadData, name, resetUploadForm]);

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

  const rateProduct = useCallback(
    async (productId: string, score: number) => {
      if (score < 1 || score > 5) {
        return;
      }

      const existing = ratingByProductForCurrentUser.get(productId);

      try {
        if (existing) {
          await client.models.ProductRating.update({ id: existing.id, score });
        } else {
          await client.models.ProductRating.create({
            productId,
            userSub: authUser.sub,
            score,
          });
        }
        await loadData();
      } catch (error: unknown) {
        setMessage((error as Error).message);
      }
    },
    [authUser.sub, loadData, ratingByProductForCurrentUser],
  );

  const sortedProducts = useMemo(() => {
    return [...products].reverse();
  }, [products]);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Products</Text>
        <Pressable style={styles.uploadButton} onPress={() => setUploadVisible(true)}>
          <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
          <Text style={styles.uploadButtonText}>Upload Product</Text>
        </Pressable>
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}

      <ScrollView contentContainerStyle={[styles.contentWrap, { flexDirection: 'row', flexWrap: 'wrap', gap: cardGap, justifyContent: numColumns > 1 ? 'flex-start' : 'center' }]}> 
        {sortedProducts.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyText}>Use Upload Product to create your first product catalog item.</Text>
          </View>
        )}

        {sortedProducts.map((product) => {
          const summary = ratingSummaryByProduct.get(product.id) ?? { average: 0, count: 0 };
          const userRating = ratingByProductForCurrentUser.get(product.id)?.score ?? 0;
          const alreadyInStore = storedProductIds.has(product.id);

          return (
            <View
              key={product.id}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  marginLeft: cardGap,
                  marginTop: cardGap,
                  // Subtle shadow for premium look
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.10,
                  shadowRadius: 16,
                  elevation: Platform.OS === 'android' ? 7 : 0,
                },
              ]}
            >
              {product.imageDataUrl ? (
                <Image source={{ uri: product.imageDataUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={26} color="#8b98ad" />
                </View>
              )}

              <Text style={styles.cardTitle}>{product.name}</Text>
              {!!product.description && <Text style={styles.cardText}>{product.description}</Text>}
              <Text style={styles.metaText}>Uploaded by: {product.creatorUsername}</Text>

              <View style={styles.ratingBox}>
                <View>
                  <Text style={styles.ratingLabel}>Average rating</Text>
                  <StarRow value={summary.average} />
                  <Text style={styles.ratingMeta}>
                    {summary.average.toFixed(1)} / 5 ({summary.count} ratings)
                  </Text>
                </View>

                <View>
                  <Text style={styles.ratingLabel}>Your rating</Text>
                  <StarRow value={userRating} onChange={(score) => void rateProduct(product.id, score)} />
                </View>
              </View>

              <Pressable
                style={[styles.storeButton, alreadyInStore ? styles.storeButtonDisabled : undefined]}
                disabled={alreadyInStore}
                onPress={() => void addToStore(product.id)}
              >
                <Text style={styles.storeButtonText}>
                  {alreadyInStore ? 'Already in My Store' : 'Add to My Store'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={uploadVisible} transparent animationType="fade" onRequestClose={() => setUploadVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setUploadVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Upload Product</Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Product name"
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
            <StarRow value={initialScore} onChange={setInitialScore} size={22} />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setUploadVisible(false);
                  resetUploadForm();
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.submitButton, uploading ? styles.submitDisabled : undefined]}
                onPress={() => void createProduct()}
                disabled={uploading}
              >
                <Text style={styles.submitText}>{uploading ? 'Uploading...' : 'Create Product'}</Text>
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
    // flexDirection, flexWrap, gap are set dynamically
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
  card: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 14,
    minHeight: 340,
    marginBottom: 0,
    // width is set dynamically
    // shadow is set dynamically
    // margin is set dynamically
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  image: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
  },
  imagePlaceholder: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#23314f',
  },
  cardText: {
    marginTop: 6,
    fontSize: 14,
    color: '#52617c',
    lineHeight: 19,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7a93',
  },
  ratingBox: {
    marginTop: 10,
    gap: 8,
  },
  ratingLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  ratingMeta: {
    color: '#67748b',
    fontSize: 12,
    marginTop: 2,
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
