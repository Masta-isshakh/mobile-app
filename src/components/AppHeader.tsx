import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeContext';

type Props = {
  title: string;
  subtitle: string;
  roleLabel: 'Admin' | 'Freelancer';
  showCart?: boolean;
  cartCount?: number;
  onPressCart?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  roleLabel,
  showCart = false,
  cartCount = 0,
  onPressCart,
}: Props) {
  const { isDarkMode } = useAppTheme();

  return (
    <View style={[styles.wrap, isDarkMode ? styles.wrapDark : undefined]}>
      <View style={styles.bgLayerOne} />
      <View style={styles.bgLayerTwo} />
      <View style={styles.bgLayerThree} />

      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.roleBadge, isDarkMode ? styles.roleBadgeDark : undefined]}>
            <Ionicons
              name={roleLabel === 'Admin' ? 'shield-checkmark' : 'sparkles'}
              size={12}
              color="#ffffff"
            />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {showCart ? (
          <Pressable style={[styles.cartButton, isDarkMode ? styles.cartButtonDark : undefined]} onPress={onPressCart}>
            <Ionicons name="cart-outline" size={22} color="#2e1065" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#5b21b6',
    overflow: 'hidden',
  },
  wrapDark: {
    backgroundColor: '#312e81',
  },
  bgLayerOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -42,
    top: -64,
    backgroundColor: '#7c3aed',
    opacity: 0.7,
  },
  bgLayerTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -24,
    bottom: -42,
    backgroundColor: '#312e81',
    opacity: 0.5,
  },
  bgLayerThree: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    right: 74,
    bottom: -12,
    backgroundColor: '#8b5cf6',
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  left: {
    flex: 1,
    paddingRight: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 8,
  },
  roleBadgeDark: {
    backgroundColor: 'rgba(255,255,255,0.17)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#ddd6fe',
  },
  cartButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cartButtonDark: {
    backgroundColor: '#e9e7ff',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e11d48',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
});