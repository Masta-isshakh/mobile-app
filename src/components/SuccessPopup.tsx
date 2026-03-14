import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export function SuccessPopup({ visible, title, description, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, visible]);

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.88);
      opacity.setValue(0);
    }
  }, [opacity, scale, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}> 
          <View style={styles.badgeWrap}>
            <Text style={styles.badge}>OK</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Great</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 20, 38, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  badgeWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#dff6ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badge: {
    color: '#137a4d',
    fontSize: 22,
    fontWeight: '900',
  },
  title: {
    color: '#10253f',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: '#4e5f77',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  button: {
    marginTop: 18,
    backgroundColor: '#2f67ff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 34,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
