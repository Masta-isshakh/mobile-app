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
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />
      <View style={styles.blobAccent} />

      <View style={styles.logoRow}>
        <View style={styles.brandMark}>
          <View style={styles.brandIconCircle}>
            <Ionicons name="shield-checkmark" size={17} color="#ffffff" />
          </View>
          <View>
            <View style={styles.brandNameRow}>
              <Text style={styles.brandJama}>JAMA</Text>
              <View style={styles.brandGoPill}>
                <Text style={styles.brandGoText}>GO</Text>
              </View>
            </View>
            <Text style={styles.brandTagline}>Security Equipment</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.roleBadge, isDarkMode ? styles.roleBadgeDark : undefined]}>
            <Ionicons name={roleLabel === 'Admin' ? 'sparkles' : 'briefcase'} size={13} color="#ffffff" />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>

          {showCart ? (
            <Pressable style={styles.cartButton} onPress={onPressCart}>
              <Ionicons name="cart-outline" size={22} color="#1565C0" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </Pressable>
          ) : null}
        </View>

      </View>

      <View style={styles.divider} />

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
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#1565C0',
    overflow: 'hidden',
  },
  wrapDark: {
    backgroundColor: '#0D47A1',
  },
  blobTopRight: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -40,
    top: -55,
    backgroundColor: '#1976D2',
    opacity: 0.6,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    left: -22,
    bottom: -38,
    backgroundColor: '#0D47A1',
    opacity: 0.5,
  },
  blobAccent: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    right: 80,
    bottom: -10,
    backgroundColor: '#F7941D',
    opacity: 0.28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  brandIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandJama: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  brandGoPill: {
    backgroundColor: '#F7941D',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  brandGoText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleBadgeDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(247,148,29,0.45)',
    marginBottom: 10,
    borderRadius: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  textBlock: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 18,
  },
  signalCard: {
    minWidth: 78,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  signalEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  signalValue: {
    marginTop: 3,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
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
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F7941D',
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
