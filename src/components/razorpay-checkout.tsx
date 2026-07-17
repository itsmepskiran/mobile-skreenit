import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { API_V1 } from '@/lib/config';

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutProps {
  visible: boolean;
  keyId: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
  onSuccess: (result: RazorpaySuccess) => void;
  onDismiss: () => void;
}

// Embeds Razorpay's hosted checkout.js in a WebView, mirroring sql-skreenit's
// Payments/js/payments.js invokeRazorpayGatewayInstance() options exactly —
// keeps checkout entirely within Expo Go (no native module / dev-client rebuild
// like react-native-razorpay would require).
function buildHtml(props: Omit<RazorpayCheckoutProps, 'visible' | 'onSuccess' | 'onDismiss'>): string {
  const options = {
    key: props.keyId,
    amount: props.amount,
    currency: props.currency,
    name: props.name,
    description: props.description,
    order_id: props.orderId,
    prefill: props.prefill,
    theme: { color: '#6366f1' },
    // Methods that can't complete inline (netbanking, some wallets — the bank
    // refuses to be iframed) make checkout.js top-navigate away instead of
    // firing `handler`. Without a real callback_url that lands back in this
    // same WebView, that navigation strands on the bank's page with no way to
    // report the result. /razorpay-callback verifies the payment and posts
    // the same {type, ...} shape `handler`/`payment.failed` already produce.
    callback_url: `${API_V1}/subscription/razorpay-callback`,
    redirect: true,
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="margin:0;background:transparent;">
  <script>
    function post(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    try {
      var options = ${JSON.stringify(options)};
      options.handler = function (response) {
        post({ type: 'success', ...response });
      };
      options.modal = {
        ondismiss: function () {
          post({ type: 'dismiss' });
        },
      };
      var rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        post({ type: 'error', error: response.error });
      });
      rzp.open();
    } catch (e) {
      post({ type: 'error', error: { description: String(e) } });
    }
  </script>
</body>
</html>`;
}

export function RazorpayCheckout({ visible, onSuccess, onDismiss, ...rest }: RazorpayCheckoutProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  const onMessage = (event: WebViewMessageEvent) => {
    let payload: { type: string; [key: string]: unknown };
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (payload.type === 'success') {
      onSuccess(payload as unknown as RazorpaySuccess);
    } else {
      onDismiss();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Pressable style={styles.closeButton} onPress={onDismiss} hitSlop={12}>
          <FontAwesome6 name="xmark" size={18} color={theme.text} />
          <ThemedText type="small">Cancel</ThemedText>
        </Pressable>
        {loading ? <ActivityIndicator style={styles.loader} color={theme.primary} /> : null}
        <WebView
          source={{ html: buildHtml(rest) }}
          onMessage={onMessage}
          onLoadEnd={() => setLoading(false)}
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  closeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  loader: { position: 'absolute', top: '50%', left: 0, right: 0 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
