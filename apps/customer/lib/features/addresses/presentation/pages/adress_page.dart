import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/addresses/data/models/saved_address_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class AddressPage extends ConsumerWidget {
  const AddressPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final st = ref.watch(addressControllerProvider);
    final currentAddress = st.current?.address?.trim() ?? '';
    final saved = st.saved;

    final (title, subtitle) = _splitByFirstComma(currentAddress);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      appBar: _AddressAppBar(
        title: 'Địa chỉ giao hàng',
        onBack: () => context.pop(),
        onTapMap: () => context.push('/address/choose'),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          children: [
            const SizedBox(height: 4),

            // Card địa chỉ hiện tại
            _Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _LeadingIcon(icon: Icons.location_on, color: AppColor.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: currentAddress.isEmpty
                          ? const Text(
                              'Chưa có địa chỉ hiện tại',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF6B7280),
                              ),
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF111827),
                                  ),
                                ),
                                if (subtitle.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    subtitle,
                                    style: const TextStyle(
                                      fontSize: 13.5,
                                      height: 1.25,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                    ),
                    if (st.isFetching)
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 18),
            const Text(
              'Địa chỉ đã lưu',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 10),

            _Card(
              child: saved.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(14),
                      child: Text(
                        'Chưa có địa chỉ đã lưu',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    )
                  : Column(
                      children: [
                        for (int i = 0; i < saved.length; i++) ...[
                          _SavedRow(
                            item: saved[i],
                            onTapUse: () async {
                              final ctrl = ref.read(addressControllerProvider.notifier);
                              await ctrl.useSavedAsCurrent(saved[i]);
                              if (context.mounted) context.pop(); // quay về Home
                            },
                            onTapEdit: () async {
                              await context.push('/address/add', extra: saved[i]);
                              // quay lại thì list đã tự reload khi save/delete
                            },
                          ),
                          if (i != saved.length - 1) const _DividerInset(),
                        ],
                      ],
                    ),
            ),

            const SizedBox(height: 90),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColor.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () => context.push('/address/add'),
              child: const Text(
                'Thêm địa chỉ mới',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),
      ),
    );
  }

  (String, String) _splitByFirstComma(String input) {
    final s = input.trim();
    if (s.isEmpty) return ('', '');
    final idx = s.indexOf(',');
    if (idx < 0) return (s, '');
    final head = s.substring(0, idx).trim();
    final tail = s.substring(idx + 1).trim();
    return (head.isEmpty ? s : head, tail);
  }
}

class _SavedRow extends StatelessWidget {
  const _SavedRow({
    required this.item,
    required this.onTapUse,
    required this.onTapEdit,
  });

  final SavedAddress item;
  final VoidCallback onTapUse;
  final VoidCallback onTapEdit;

  (String, String) _split(String input) {
    final s = input.trim();
    if (s.isEmpty) return ('', '');
    final idx = s.indexOf(',');
    if (idx < 0) return (s, '');
    return (s.substring(0, idx).trim(), s.substring(idx + 1).trim());
  }

  @override
  Widget build(BuildContext context) {
    final (t, sub) = _split(item.address);

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTapUse, // chọn => use => pop về home
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _LeadingIcon(icon: Icons.location_on_outlined, color: Color(0xFF111827)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.isNotEmpty ? t : item.address,
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF111827),
                    ),
                  ),
                  if (sub.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      sub,
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.25,
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            TextButton(
              onPressed: onTapEdit,
              style: TextButton.styleFrom(
                foregroundColor: AppColor.primary,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              ),
              child: const Text('Sửa', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }
}

// ===== UI =====
class _AddressAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _AddressAppBar({
    required this.title,
    required this.onBack,
    required this.onTapMap,
  });

  final String title;
  final VoidCallback onBack;
  final VoidCallback onTapMap;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 6);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: true,
      title: Text(
        title,
        style: const TextStyle(
          color: Color(0xFF111827),
          fontWeight: FontWeight.w700,
          fontSize: 18,
        ),
      ),
      leading: IconButton(
        onPressed: onBack,
        icon: const Icon(Icons.arrow_back_ios_new_rounded),
        color: AppColor.primary,
      )
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _LeadingIcon extends StatelessWidget {
  const _LeadingIcon({required this.icon, required this.color});
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: 28, child: Icon(icon, color: color, size: 22));
  }
}

class _DividerInset extends StatelessWidget {
  const _DividerInset();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(left: 54),
      child: Divider(height: 1, thickness: 1, color: Color(0xFFF1F3F5)),
    );
  }
}