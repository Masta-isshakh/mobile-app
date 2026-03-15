import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
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

import { SuccessPopup } from '../../components/SuccessPopup';
import { client } from '../../lib/amplifyClient';
import { useAppTheme } from '../../theme/AppThemeContext';
import { formatQar } from '../../utils/currency';
import type {
  AuthUserContext,
  Product,
  ProductCategoryValue,
  ProductRating,
  StoreProduct,
} from '../../types';

type Props = {
  authUser: AuthUserContext;
  isAdmin: boolean;
  onSelectProduct?: (product: Product) => void;
};

type RatingSummary = {
  average: number;
  count: number;
};

type ProductCategoryFilter = 'ALL' | ProductCategoryValue;
type ProductSortOption = 'NEWEST' | 'PRICE_ASC' | 'TOP_RATED';

const PRODUCT_CATEGORIES: ProductCategoryFilter[] = [
  'ALL',
  'SURVEILLANCE',
  'ACCESS_CONTROL',
  'SAFETY',
  'POWER',
  'OTHER',
];

const PRODUCT_SORT_OPTIONS: Array<{ value: ProductSortOption; label: string }> = [
  { value: 'NEWEST', label: 'Newest' },
  { value: 'PRICE_ASC', label: 'Price: Low to High' },
  { value: 'TOP_RATED', label: 'Top Rated' },
];

function getProductCategoryValue(product: Product): ProductCategoryValue {
  return product.category ?? 'OTHER';
}

function getProductCategoryLabel(category: ProductCategoryFilter): string {
  switch (category) {
    case 'ALL':
      return 'All';
    case 'SURVEILLANCE':
      return 'Surveillance';
    case 'ACCESS_CONTROL':
      return 'Access Control';
    case 'SAFETY':
      return 'Safety';
    case 'POWER':
      return 'Power';
    default:
      return 'Other';
  }
}

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
  const { colors } = useAppTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [storeItems, setStoreItems] = useState<StoreProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryFilter>('ALL');
  const [sortOption, setSortOption] = useState<ProductSortOption>('NEWEST');
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);
  const [successPopup, setSuccessPopup] = useState({ visible: false, title: '', description: '' });

  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [productCategory, setProductCategory] = useState<ProductCategoryValue | ''>('');
  const [priceText, setPriceText] = useState('');
  const [description, setDescription] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [initialScore, setInitialScore] = useState(5);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const { width: windowWidth } = useWindowDimensions();
  const isCompactLayout = windowWidth < 720;
  const cardGap = 10;
  const horizontalPadding = 24;
  const cardWidth = Math.max(Math.floor((windowWidth - horizontalPadding - cardGap) / 2), 150);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsResponse, ratingsResponse, storeResponse] = await Promise.all([
        client.models.ProductX.list(),
        client.models.ProductRating.list(),
        client.models.StoreProduct.list({ filter: { ownerSub: { eq: authUser.sub } } }),
      ]);

      setProducts((productsResponse.data ?? []) as Product[]);
      setRatings((ratingsResponse.data ?? []) as ProductRating[]);
      setStoreItems((storeResponse.data ?? []) as StoreProduct[]);
    } finally {
      setIsLoading(false);
    }
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
    setProductCategory('');
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

    if (!productCategory) {
      setMessage('Please choose a category.');
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
        category: productCategory,
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
      setSuccessPopup({
        visible: true,
        title: 'Product Created',
        description: 'Your product is now available in the catalog.',
      });
      await loadData();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  }, [authUser.sub, authUser.username, description, imageDataUrl, initialScore, loadData, name, parsePrice, productCategory, resetForm]);

  const openEdit = useCallback((product: Product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setProductCategory(product.category ?? 'OTHER');
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

    if (!productCategory) {
      setMessage('Please choose a category.');
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
        category: productCategory,
        price,
        description: description.trim() || undefined,
        imageDataUrl: imageDataUrl || undefined,
      });
      setEditVisible(false);
      resetForm();
      setMessage('Product updated successfully.');
      setSuccessPopup({
        visible: true,
        title: 'Product Updated',
        description: 'Changes were saved successfully.',
      });
      await loadData();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  }, [description, editingProductId, imageDataUrl, loadData, name, parsePrice, productCategory, resetForm]);

  const deleteProduct = useCallback((product: Product) => {
    Alert.alert('Delete Product', `Delete "${product.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setProcessingProductId(product.id);
            try {
              await client.models.ProductX.delete({ id: product.id });
              setMessage('Product deleted.');
              setSuccessPopup({
                visible: true,
                title: 'Product Deleted',
                description: 'The selected product was removed successfully.',
              });
              await loadData();
            } catch (error: unknown) {
              setMessage((error as Error).message);
            } finally {
              setProcessingProductId(null);
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

      setProcessingProductId(productId);
      try {
        await client.models.StoreProduct.create({
          productId,
          ownerSub: authUser.sub,
          ownerUsername: authUser.username,
        });
        setMessage('Product added to your store.');
        setSuccessPopup({
          visible: true,
          title: 'Added To Store',
          description: 'The product has been added to your store successfully.',
        });
        await loadData();
      } catch (error: unknown) {
        setMessage((error as Error).message);
      } finally {
        setProcessingProductId(null);
      }
    },
    [authUser.sub, authUser.username, loadData, storedProductIds],
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const productsByNewest = useMemo(() => {
    return [...products].sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ProductCategoryFilter, number>();
    PRODUCT_CATEGORIES.forEach((category) => counts.set(category, 0));
    counts.set('ALL', productsByNewest.length);

    for (const product of productsByNewest) {
      const category = getProductCategoryValue(product);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    return counts;
  }, [productsByNewest]);

  const visibleProducts = useMemo(() => {
    const filtered = productsByNewest.filter((product) => {
      const matchesCategory =
        selectedCategory === 'ALL' || getProductCategoryValue(product) === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const searchable = `${product.name} ${product.description ?? ''} ${product.creatorUsername}`.toLowerCase();
      return searchable.includes(normalizedSearchQuery);
    });

    if (sortOption === 'PRICE_ASC') {
      filtered.sort((left, right) => (left.price ?? 0) - (right.price ?? 0));
    } else if (sortOption === 'TOP_RATED') {
      filtered.sort((left, right) => {
        const leftSummary = ratingSummaryByProduct.get(left.id) ?? { average: 0, count: 0 };
        const rightSummary = ratingSummaryByProduct.get(right.id) ?? { average: 0, count: 0 };
        if (rightSummary.average !== leftSummary.average) {
          return rightSummary.average - leftSummary.average;
        }
        return rightSummary.count - leftSummary.count;
      });
    }

    return filtered;
  }, [normalizedSearchQuery, productsByNewest, ratingSummaryByProduct, selectedCategory, sortOption]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}> 
      <View style={styles.topBar}>
        <Text style={[styles.title, { color: colors.text }]}>Products</Text>
        {isAdmin && (
          <Pressable style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
            <Text style={styles.uploadButtonText}>Create Product</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.discoveryPanel, { backgroundColor: colors.surface }]}> 
        <View style={styles.searchRow}>
          <View style={[styles.searchShell, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products, keywords, or creators"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery ? (
              <Pressable style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {isCompactLayout ? (
            <Pressable
              style={[styles.filterDrawerButton, { backgroundColor: colors.primary }]}
              onPress={() => setFilterDrawerVisible(true)}
            >
              <Ionicons name="options-outline" size={18} color="#ffffff" />
              <Text style={styles.filterDrawerButtonText}>Filters</Text>
            </Pressable>
          ) : null}
        </View>

        {!isCompactLayout ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {PRODUCT_CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.categoryChipText, { color: active ? '#ffffff' : colors.text }]}>
                      {getProductCategoryLabel(category)}
                    </Text>
                    <View
                      style={[
                        styles.categoryCountBadge,
                        { backgroundColor: active ? 'rgba(255,255,255,0.2)' : '#F7941D' },
                      ]}
                    >
                      <Text style={styles.categoryCountText}>{categoryCounts.get(category) ?? 0}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortRow}
            >
              {PRODUCT_SORT_OPTIONS.map((option) => {
                const active = sortOption === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.sortChip,
                      {
                        backgroundColor: active ? colors.surfaceMuted : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSortOption(option.value)}
                  >
                    <Text style={[styles.sortChipText, { color: active ? colors.primary : colors.textMuted }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <View style={styles.compactFilterSummary}>
            <Text style={[styles.compactFilterSummaryText, { color: colors.textMuted }]}>
              {getProductCategoryLabel(selectedCategory)} · {PRODUCT_SORT_OPTIONS.find((option) => option.value === sortOption)?.label}
            </Text>
          </View>
        )}

        <Text style={[styles.resultsMeta, { color: colors.textMuted }]}> 
          Showing {visibleProducts.length} of {productsByNewest.length} products
        </Text>
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}

      {isLoading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textMuted }]}>Loading products...</Text>
        </View>
      )}

      {!isLoading && <ScrollView
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
        {productsByNewest.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}> 
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyText}>Admins can create products. Freelancers can browse and add them to their store.</Text>
          </View>
        )}

        {productsByNewest.length > 0 && visibleProducts.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}> 
            <Text style={styles.emptyTitle}>No Matching Products</Text>
            <Text style={styles.emptyText}>Try a different search term or switch to another category.</Text>
          </View>
        )}

        {visibleProducts.map((product) => {
          const summary = ratingSummaryByProduct.get(product.id) ?? { average: 0, count: 0 };
          const alreadyInStore = storedProductIds.has(product.id);
          const category = getProductCategoryValue(product);

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
                { backgroundColor: colors.surface },
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
              <Text style={styles.priceText}>{formatQar(product.price ?? 0)}</Text>
              <View style={[styles.productTag, { backgroundColor: colors.surfaceMuted }]}> 
                <Text style={[styles.productTagText, { color: colors.primary }]}>{getProductCategoryLabel(category)}</Text>
              </View>
              {isAdmin && <Text style={styles.metaText}>By {product.creatorUsername}</Text>}

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
                    style={[styles.deleteButton, processingProductId === product.id ? styles.storeButtonDisabled : undefined]}
                    onPress={() => deleteProduct(product)}
                    disabled={processingProductId === product.id}
                  >
                    <Text style={styles.adminButtonText}>{processingProductId === product.id ? 'Deleting...' : 'Delete'}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.storeButton, { backgroundColor: colors.primary }, (alreadyInStore || processingProductId === product.id) ? styles.storeButtonDisabled : undefined]}
                  disabled={alreadyInStore || processingProductId === product.id}
                  onPress={() => void addToStore(product.id)}
                >
                  <Text style={styles.storeButtonText}>
                    {alreadyInStore ? 'In My Store' : processingProductId === product.id ? 'Adding...' : 'Add to Store'}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>}

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalTitle}>Create Product</Text>

            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.formChipWrap}>
              {PRODUCT_CATEGORIES.filter((category) => category !== 'ALL').map((category) => {
                const active = productCategory === category;
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.formCategoryChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setProductCategory(category)}
                  >
                    <Text style={[styles.formCategoryChipText, { color: active ? '#ffffff' : colors.text }]}>
                      {getProductCategoryLabel(category)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
                style={[styles.submitButton, { backgroundColor: colors.primary }, uploading ? styles.submitDisabled : undefined]}
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
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalTitle}>Edit Product</Text>

            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.formChipWrap}>
              {PRODUCT_CATEGORIES.filter((category) => category !== 'ALL').map((category) => {
                const active = productCategory === category;
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.formCategoryChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setProductCategory(category)}
                  >
                    <Text style={[styles.formCategoryChipText, { color: active ? '#ffffff' : colors.text }]}>
                      {getProductCategoryLabel(category)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
                style={[styles.submitButton, { backgroundColor: colors.primary }, uploading ? styles.submitDisabled : undefined]}
                onPress={() => void saveEdit()}
                disabled={uploading}
              >
                <Text style={styles.submitText}>{uploading ? 'Saving...' : 'Save Changes'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SuccessPopup
        visible={successPopup.visible}
        title={successPopup.title}
        description={successPopup.description}
        onClose={() => setSuccessPopup({ visible: false, title: '', description: '' })}
      />

      <Modal
        visible={filterDrawerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterDrawerVisible(false)} />
          <View style={[styles.drawerCard, { backgroundColor: colors.surface }]}> 
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Filters & Sort</Text>
              <Pressable onPress={() => setFilterDrawerVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.drawerSectionTitle, { color: colors.text }]}>Category</Text>
            <View style={styles.drawerChipWrap}>
              {PRODUCT_CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.drawerChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.drawerChipText, { color: active ? '#ffffff' : colors.text }]}>
                      {getProductCategoryLabel(category)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.drawerSectionTitle, { color: colors.text }]}>Sort By</Text>
            <View style={styles.drawerChipWrap}>
              {PRODUCT_SORT_OPTIONS.map((option) => {
                const active = sortOption === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.drawerChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSortOption(option.value)}
                  >
                    <Text style={[styles.drawerChipText, { color: active ? '#ffffff' : colors.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.drawerButtons}>
              <Pressable
                style={[styles.drawerSecondaryButton, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => {
                  setSelectedCategory('ALL');
                  setSortOption('NEWEST');
                  setSearchQuery('');
                }}
              >
                <Text style={[styles.drawerSecondaryButtonText, { color: colors.text }]}>Reset</Text>
              </Pressable>
              <Pressable
                style={[styles.drawerPrimaryButton, { backgroundColor: colors.primary }]}
                onPress={() => setFilterDrawerVisible(false)}
              >
                <Text style={styles.drawerPrimaryButtonText}>Apply</Text>
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
  discoveryPanel: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 18,
    padding: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchShell: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 2,
  },
  filterDrawerButton: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterDrawerButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  categoryRow: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sortRow: {
    gap: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 9,
    paddingLeft: 12,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  categoryCountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactFilterSummary: {
    paddingTop: 10,
  },
  compactFilterSummaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  message: {
    marginHorizontal: 12,
    marginBottom: 8,
    color: '#9a3412',
    fontWeight: '600',
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
  },
  loaderText: {
    fontSize: 14,
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
  productTag: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  formChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  formCategoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  formCategoryChipText: {
    fontSize: 12,
    fontWeight: '700',
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
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 17, 30, 0.45)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  drawerSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 4,
  },
  drawerChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  drawerChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  drawerChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  drawerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  drawerSecondaryButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  drawerSecondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  drawerPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  drawerPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
