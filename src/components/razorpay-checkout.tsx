import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { reconcilePayments } from '@/lib/api/subscription';
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

export function RazorpayCheckout({ visible, onSuccess, onDismiss: onDismissProp, ...rest }: RazorpayCheckoutProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  // Closing without a success message doesn't prove nothing was paid (the redirect/handler can be
  // missed after a UPI/card/OTP step), so ask the server to settle anything Razorpay says is paid.
  const onDismiss = () => {
    onDismissProp();
    reconcilePayments()
      .then((res) => {
        const confirmed = res.data.confirmed;
        if (confirmed.length === 0) return;
        Alert.alert('Payment received', `Your payment for ${confirmed[0].plan_name ?? 'your purchase'} went through and is now active.`);
        queryClient.invalidateQueries();
      })
      .catch(() => {});
  };

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
      if (payload.type === 'error') {
        const description = (payload.error as { description?: string } | undefined)?.description;
        Alert.alert('Payment not completed', description || 'The payment could not be completed. You have not been charged.');
      }
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
