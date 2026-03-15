import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { client } from '../../lib/amplifyClient';

type Props = {
  approvalUrl: string;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PayPalCheckoutScreen({ approvalUrl, orderId, onSuccess, onCancel }: Props) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const successUrlPrefix = useMemo(() => 'https://example.com/paypal/success', []);
  const cancelUrlPrefix = useMemo(() => 'https://example.com/paypal/cancel', []);

  const handleCapture = useCallback(async () => {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);
    setErrorMessage('');
    try {
      const response = (await client.mutations.capturePayPalOrder({ orderId })) as {
        data?: { status?: string };
        errors?: Array<{ message?: string }>;
      };

      if (response.errors?.length) {
        throw new Error(response.errors[0]?.message || 'Unable to capture PayPal order.');
      }

      if (response.data?.status !== 'COMPLETED') {
        throw new Error(`PayPal order capture returned status: ${response.data?.status || 'UNKNOWN'}`);
      }

      onSuccess();
    } catch (error: unknown) {
      setErrorMessage((error as Error).message);
      setIsCapturing(false);
    }
  }, [isCapturing, onSuccess, orderId]);

  const handleNavigation = useCallback(
    (navigationState: WebViewNavigation) => {
      const url = navigationState.url;
      if (url.startsWith(successUrlPrefix)) {
        void handleCapture();
        return false;
      }
      if (url.startsWith(cancelUrlPrefix)) {
        onCancel();
        return false;
      }
      return true;
    },
    [cancelUrlPrefix, handleCapture, onCancel, successUrlPrefix],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerButton}>
          <Ionicons name="close" size={22} color="#23314f" />
        </Pressable>
        <Text style={styles.title}>PayPal Checkout</Text>
        <View style={styles.headerButton} />
      </View>

      {!!errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}

      {isCapturing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Finalizing your PayPal payment...</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: approvalUrl }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Opening PayPal...</Text>
            </View>
          )}
          onShouldStartLoadWithRequest={handleNavigation}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  headerButton: {
    width: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#23314f',
  },
  errorMessage: {
    color: '#b91c1c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
