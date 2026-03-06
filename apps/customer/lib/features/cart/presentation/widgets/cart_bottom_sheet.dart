import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/cart/data/models/cart_models.dart';
import 'package:customer/features/cart/data/repositories/cart_repository.dart';
import 'package:customer/features/cart/presentation/viewmodels/cart_controller.dart';
import 'package:customer/features/cart/presentation/viewmodels/cart_state.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

String _money(num v) => '${v.toStringAsFixed(0)}đ'.replaceAllMapped(
  RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
  (m) => '${m[1]}.',
);

class CartBottomSheet extends ConsumerStatefulWidget {
  const CartBottomSheet({super.key, required this.merchantId});
  final String merchantId;

  @override
  ConsumerState<CartBottomSheet> createState() => _CartBottomSheetState();
}

class _CartBottomSheetState extends ConsumerState<CartBottomSheet> {
  late final CartParams _params;

  @override
  void initState() {
    super.initState();
    _params = CartParams.delivery(merchantId: widget.merchantId);

    // ✅ khi mở sheet: load current cart (để có items)
    unawaited(ref.read(cartProvider(_params).notifier).ensureCurrentLoaded());
  }

  Future<void> _openNoteSheet(BuildContext context, CartLine line) async {
    final ctrl = ref.read(cartProvider(_params).notifier);

    await showModalBottomSheet(
      context: context,
      useRootNavigator:
          true, // ✅ để sheet note nổi lên trên sheet cart (iOS rất cần)
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withOpacity(0.35),
      builder: (_) => _EditNoteSheet(
        initialText: line.note,
        onSubmit: (note) async {
          await ctrl.updateNote(line.lineKey, note);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(cartProvider(_params));
    final ctrl = ref.read(cartProvider(_params).notifier);

    final current = st.current; // CartResponse?
    final cart = current?.cart; // CartData?
    final items = cart?.items ?? const <CartLine>[];

    final totals = st.summary; // CartTotals
    final totalQty = totals.itemCount;
    final total = totals.totalEstimated;
    final hasDiscount = totals.discountEstimated > 0;
    final original = totals.originalEstimated;

    return DraggableScrollableSheet(
      initialChildSize: 0.86,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollCtrl) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 10),

              // header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    // 1. Bên trái: Ép sát lề trái
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                          // Gán null nếu đang update hoặc giỏ hàng trống để nút mờ đi (disabled)
                          onPressed: (st.isUpdating || items.isEmpty)
                              ? null
                              : () {
                                  // Hiển thị Cupertino Dialog
                                  showCupertinoDialog(
                                    context: context,
                                    builder: (BuildContext ctx) {
                                      return CupertinoAlertDialog(

                                        title: Text('Xóa giỏ hàng'),
                                        content: const Text(
                                          'Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng không?',
                                        ),
                                        actions: [
                                          // Nút Hủy
                                          CupertinoDialogAction(
                                            isDefaultAction: true,
                                            onPressed: () {
                                              Navigator.pop(
                                                ctx,
                                              ); // Đóng hộp thoại
                                            },
                                            child:  Text('Hủy', style: TextStyle(color: CupertinoColors.activeBlue)),
                                          ),
                                          // Nút Xóa
                                          CupertinoDialogAction(
                                            isDestructiveAction:
                                                true, // Giúp chữ có màu đỏ cảnh báo (chuẩn iOS)
                                            onPressed: () {
                                              Navigator.pop(
                                                ctx,
                                              ); // Đóng hộp thoại trước
                                              ctrl.clearAll(); // Sau đó gọi hàm xóa
                                            },
                                            child: Text('Xoá', style: TextStyle(color: CupertinoColors.destructiveRed)),
                                          ),
                                        ],
                                      );
                                    },
                                  );
                                },
                          child: const Text('Xóa tất cả', style: TextStyle(color: AppColor.primary),),
                        ),
                      ),
                    ),

                    // 2. Ở giữa: Chữ tự động nằm ngay giữa trung tâm
                    const Text(
                      'Giỏ hàng',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight
                            .w600, // Trong ảnh nét chữ không quá dày, w600 là vừa đẹp
                      ),
                    ),

                    // 3. Bên phải: Ép sát lề phải
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close, color: Colors.grey),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // body
              if (st.isLoadingCart && current == null)
                const Expanded(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (items.isEmpty)
                const Expanded(child: Center(child: Text('Giỏ hàng trống')))
              else
                Expanded(
                  child: ListView.separated(
                    controller: scrollCtrl,
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 110),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const Divider(height: 18),
                    itemBuilder: (_, i) {
                      final it = items[i];

                      return Slidable(
                        key: ValueKey(it.lineKey),
                        endActionPane: ActionPane(
                          motion: const DrawerMotion(),
                          extentRatio: 0.22,
                          children: [
                            SlidableAction(
                              onPressed: (_) {
                                if (!st.isUpdating) ctrl.removeLine(it.lineKey);
                              },
                              backgroundColor: Colors.redAccent,
                              foregroundColor: Colors.white,
                              icon: Icons.delete_outline,
                              label: 'Xoá',
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(10),
                                bottomLeft: Radius.circular(10),
                              ),
                            ),
                          ],
                        ),
                        child: _CartLineRow(
                          onEditNote: () => _openNoteSheet(context, it),
                          line: it,
                          onMinus: () {
                            if (st.isUpdating) return;
                            final next = it.quantity - 1;
                            if (next <= 0) {
                              ctrl.removeLine(it.lineKey);
                            } else {
                              ctrl.updateQty(it.lineKey, next);
                            }
                          },
                          onPlus: () {
                            if (st.isUpdating) return;
                            ctrl.updateQty(it.lineKey, it.quantity + 1);
                          },
                        ),
                      );
                    },
                  ),
                ),

              // bottom summary + CTA
            ],
          ),
        );
      },
    );
  }
}

List<String> _fmtSelectedOptionsCompact(List<dynamic> raw) {
  final out = <String>[];
  for (final x in raw) {
    if (x is Map) {
      final m = x.cast<String, dynamic>();
      final choice = (m['choice_name'] ?? m['choiceName'] ?? m['name'] ?? '')
          .toString()
          .trim();
      final opt = (m['option_name'] ?? m['optionName'] ?? '').toString().trim();

      // Ưu tiên giống ShopeeFood: chỉ hiện choice (Coca, Bắp cải trộn...)
      if (choice.isNotEmpty) {
        out.add(choice);
      } else if (opt.isNotEmpty) {
        out.add(opt);
      }
    } else if (x is String && x.trim().isNotEmpty) {
      out.add(x.trim());
    }
  }
  return out;
}

List<String> _fmtSelectedToppingsCompact(List<dynamic> raw) {
  final out = <String>[];
  for (final x in raw) {
    if (x is Map) {
      final m = x.cast<String, dynamic>();
      final name = (m['topping_name'] ?? m['toppingName'] ?? m['name'] ?? '')
          .toString()
          .trim();
      final qty = (m['quantity'] as num?)?.toInt() ?? 1;

      if (name.isNotEmpty) {
        // ShopeeFood thường hiện kiểu "Phô mai", nếu qty>1 thì "Phô mai x2"
        out.add(qty > 1 ? '$name x$qty' : name);
      }
    } else if (x is String && x.trim().isNotEmpty) {
      out.add(x.trim());
    }
  }
  return out;
}

String _buildLineMetaText(CartLine line) {
  final parts = <String>[];

  parts.addAll(_fmtSelectedOptionsCompact(line.selectedOptions));
  parts.addAll(_fmtSelectedToppingsCompact(line.selectedToppings));

  // NOTE: nếu bạn KHÔNG muốn note dính vào dòng option thì bỏ đoạn này
  // final note = line.note.trim();
  // if (note.isNotEmpty) parts.add('Ghi chú: $note');

  return parts.join(', ');
}

class _CartLineRow extends StatelessWidget {
  const _CartLineRow({
    required this.line,
    required this.onMinus,
    required this.onPlus,
    required this.onEditNote,
  });

  final CartLine line;
  final VoidCallback onMinus;
  final VoidCallback onPlus;
  final VoidCallback onEditNote;

  @override
  Widget build(BuildContext context) {
    final hasSale = line.basePrice != null && line.basePrice! > line.unitPrice;
    final metaText = _buildLineMetaText(line);

    final note = line.note.trim();
    final noteLabel = note.isEmpty ? 'Thêm ghi chú...' : note;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            width: 62,
            height: 62,
            child: (line.imageUrl == null || line.imageUrl!.isEmpty)
                ? Container(color: Colors.black12)
                : CachedNetworkImage(
                    imageUrl: line.imageUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: Colors.black12),
                    errorWidget: (_, __, ___) =>
                        Container(color: Colors.black12),
                  ),
          ),
        ),
        const SizedBox(width: 12),

        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                line.name,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),

              //  NEW: option/topping text dạng "A, B, C" (max 2 lines -> ...)
              if (metaText.trim().isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  metaText,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    height: 1.25,
                    color: Colors.black54,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],

              const SizedBox(height: 8),

              InkWell(
                onTap: onEditNote,
                child: Row(
                  children: [
                    const Icon(Iconsax.note, size: 12, color: Colors.grey),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Thêm ghi chú...',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10,
                          color:   Colors.grey ,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Text(
                    _money(line.unitPrice),
                    style: const TextStyle(
                      color: AppColor.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (hasSale)
                    Text(
                      _money(line.basePrice!),
                      style: const TextStyle(
                        color: Colors.black38,
                        decoration: TextDecoration.lineThrough,
                        fontWeight: FontWeight.w400,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(width: 10),
        Padding(
          padding: const EdgeInsets.only(right: 10),
          child: Row(
            children: [
              _QtyBtn(icon: Icons.remove, onTap: onMinus),
              const SizedBox(width: 10),
              Text(
                '${line.quantity}',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 10),
              _QtyBtn(icon: Icons.add, onTap: onPlus, filled: true),
            ],
          ),
        ),
      ],
    );
  }
}

class _EditNoteSheet extends StatefulWidget {
  const _EditNoteSheet({required this.initialText, required this.onSubmit});

  final String initialText;
  final Future<void> Function(String note) onSubmit;

  @override
  State<_EditNoteSheet> createState() => _EditNoteSheetState();
}

class _EditNoteSheetState extends State<_EditNoteSheet> {
  late final TextEditingController _ctrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialText);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await widget.onSubmit(_ctrl.text.trim());
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Không lưu được ghi chú')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Container(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + bottomInset),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // header
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Thêm ghi chú',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _saving ? null : () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // text box
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.black.withOpacity(0.06)),
                  ),
                  child: TextField(
                    controller: _ctrl,
                    minLines: 4,
                    maxLines: 6,
                    textInputAction: TextInputAction.newline,
                    decoration: const InputDecoration(
                      hintText:
                          'Việc thực hiện yêu cầu theo ghi chú sẽ tuỳ thuộc vào quán.',
                      border: InputBorder.none,
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // confirm
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColor.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    onPressed: _saving ? null : _submit,
                    child: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Xác nhận',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  const _QtyBtn({required this.icon, required this.onTap, this.filled = false});
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 20,
        height: 20,
        decoration: BoxDecoration(
          color: filled ? AppColor.primary : Colors.white,
          borderRadius: BorderRadius.circular(5),
          border: Border.all(color: AppColor.primary),
        ),
        child: Icon(
          icon,
          color: filled ? Colors.white : AppColor.primary,
          size: 14,
        ),
      ),
    );
  }
}
