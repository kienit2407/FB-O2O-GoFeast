import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:customer/features/orders/data/models/checkout_models.dart';

class PaymentWebViewPage extends StatefulWidget {
  const PaymentWebViewPage({super.key, required this.initialUrl});

  final String initialUrl;

  @override
  State<PaymentWebViewPage> createState() => _PaymentWebViewPageState();
}

class _PaymentWebViewPageState extends State<PaymentWebViewPage> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _handledReturn = false;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) return;
            setState(() => _progress = progress);
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _progress = 100);
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri != null && _isPaymentReturnUri(uri)) {
              _finishWithReturn(uri);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.initialUrl));
  }

  bool _isPaymentReturnUri(Uri uri) {
    final hasPaymentParams =
        uri.queryParameters.containsKey('gateway') &&
        uri.queryParameters.containsKey('status') &&
        uri.queryParameters.containsKey('order_id');

    if (hasPaymentParams) return true;

    final path = uri.path.toLowerCase();

    if (path.endsWith('/payment-result')) return true;

    // nếu sau này bạn dùng deeplink kiểu:
    // shopeefood://payment-result?gateway=vnpay&status=success...
    if (uri.scheme == 'shopeefood' && uri.host == 'payment-result') {
      return true;
    }

    return false;
  }

  void _finishWithReturn(Uri uri) {
    if (_handledReturn) return;
    _handledReturn = true;

    Navigator.of(context).pop(PaymentGatewayReturn.fromUri(uri));
  }

  Future<void> _confirmClose() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Đóng thanh toán?'),
        content: const Text(
          'Bạn chưa hoàn tất thanh toán. Nếu đóng bây giờ, đơn đã tạo sẽ chưa được thanh toán.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Ở lại'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );

    if (ok == true && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (_) async {
        await _confirmClose();
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Thanh toán VNPay'),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: _confirmClose,
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => _controller.reload(),
            ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(2),
            child: _progress < 100
                ? LinearProgressIndicator(value: _progress / 100)
                : const SizedBox.shrink(),
          ),
        ),
        body: WebViewWidget(controller: _controller),
      ),
    );
  }
}
