// enter_phone_page.dart (chỉ phần khác so với bạn)
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

import 'package:customer/app/theme/app_color.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';

class EnterPhonePage extends ConsumerStatefulWidget {
  const EnterPhonePage({super.key});

  @override
  ConsumerState<EnterPhonePage> createState() => _EnterPhonePageState();
}

class _EnterPhonePageState extends ConsumerState<EnterPhonePage> {
  final _ctrl = TextEditingController();
  final _focus = FocusNode();
  bool _saving = false;

  bool get _isValid {
    final digits = _ctrl.text.replaceAll(RegExp(r'\D'), '');
    return digits.length >= 9 && digits.length <= 11;
  }

  @override
  void initState() {
    super.initState();
    _ctrl.addListener(() => setState(() {}));
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _confirmCancel() async {
    if (_saving) return;

    final ok = await showCupertinoDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (_) => CupertinoAlertDialog(
        title: const Text('Huỷ đăng nhập?'),
        content: const Text(
          'Bạn chưa nhập số điện thoại. Nếu thoát, tài khoản sẽ không được coi là đăng nhập hoàn tất.',
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Ở lại', style: TextStyle(color: CupertinoColors.activeBlue),),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true, // ✅ đỏ kiểu iOS
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Huỷ'),
          ),
        ],
      ),
    );

    if (ok == true) {
      await ref.read(authViewModelProvider.notifier).logout();
      if (!mounted) return;
      context.go('/'); // hoặc '/signin' tuỳ bạn
    }
  }

  Future<void> _submit() async {
    if (!_isValid || _saving) return;

    setState(() => _saving = true);
    try {
      final phone = _ctrl.text.trim();
      await ref.read(authViewModelProvider.notifier).updatePhone(phone);

      if (!mounted) return;
      context.go('/'); // router sẽ cho vào MainShell vì phone đã có
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Cập nhật SĐT thất bại: $e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabledBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColor.iconInactive, width: 1),
    );
    final focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColor.primary, width: 1.5),
    );

    return PopScope(
      canPop: false, // ✅ chặn pop mặc định
      onPopInvoked: (didPop) {
        if (!didPop) _confirmCancel(); // ✅ bấm back hệ thống sẽ vào đây
      },
      child: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Scaffold(
          appBar: AppBar(
            leading: IconButton(
              onPressed: _confirmCancel, // ✅ không pop nữa
              icon: const Icon(
                Iconsax.arrow_left_copy,
                color: AppColor.primary,
              ),
            ),
            title: const Text('Thêm số điện thoại'),
            centerTitle: true,
            bottom: PreferredSize(
              preferredSize: Size.fromHeight(_saving ? 3 : 0),
              child: _saving
                  ? const LinearProgressIndicator(minHeight: 3)
                  : const SizedBox.shrink(),
            ),
          ),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Nhập Số Điện Thoại để đặt hàng dễ hơn',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),
                  TextField(
                    cursorColor: AppColor.primary,
                    controller: _ctrl,
                    focusNode: _focus,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.done,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(11),
                    ],
                    onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      hintText: 'Số điện thoại',
                      prefixIcon: const Icon(Iconsax.call_copy),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 14,
                      ),
                      enabledBorder: enabledBorder,
                      focusedBorder: focusedBorder,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColor.primary,
                        foregroundColor: AppColor.background,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: (_isValid && !_saving) ? _submit : null,
                      child: const Text(
                        'Tiếp tục',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
