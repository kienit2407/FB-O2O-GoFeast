import 'package:cached_network_image/cached_network_image.dart';
import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/merchant/data/models/merchant_detail_model.dart';
import 'package:customer/features/merchant/data/models/product_config_model.dart';
import 'package:customer/features/merchant/presentation/pages/merchant_detail_page.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProductOptionBottomSheet extends ConsumerStatefulWidget {
  const ProductOptionBottomSheet({
    super.key,
    required this.merchantId,
    required this.product,
  });

  final String merchantId;
  final MerchantDetailProductItem product;

  @override
  ConsumerState<ProductOptionBottomSheet> createState() =>
      _ProductOptionBottomSheetState();
}

class _ProductOptionBottomSheetState
    extends ConsumerState<ProductOptionBottomSheet> {
  int qty = 1;

  // optionId -> set(choiceId)
  final Map<String, Set<String>> _sel = {};
  // toppingId -> qty
  final Map<String, int> _toppingQty = {};
  final _noteCtrl = TextEditingController();

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  int _sumOptionExtra(List<ProductConfigOption> opts) {
    int sum = 0;
    for (final o in opts) {
      final picked = _sel[o.id] ?? {};
      for (final cid in picked) {
        final c = o.choices.firstWhere(
          (x) => x.id == cid,
          orElse: () => ProductConfigChoice(
            id: '',
            name: '',
            priceModifier: 0,
            isAvailable: true,
          ),
        );
        sum += c.priceModifier;
      }
    }
    return sum;
  }

  int _sumToppingExtra(List<ProductConfigTopping> tops) {
    int sum = 0;
    for (final t in tops) {
      final q = _toppingQty[t.id] ?? 0;
      if (q > 0) sum += t.price * q;
    }
    return sum;
  }

  String _chooseLabel(ProductConfigOption o) {
    // đúng style ảnh: (Chọn 1) / (Chọn 1 đến 2)
    if (o.minSelect == o.maxSelect) return '(Chọn ${o.minSelect})';
    return '(Chọn ${o.minSelect} đến ${o.maxSelect})';
  }

  bool _validate(List<ProductConfigOption> opts) {
    for (final o in opts) {
      final picked = _sel[o.id] ?? {};
      final c = picked.length;
      if (c < o.minSelect) return false;
      if (c > o.maxSelect) return false;
    }
    return true;
  }

  void _toggleChoice(ProductConfigOption opt, ProductConfigChoice choice) {
    if (!choice.isAvailable) return;

    final set = (_sel[opt.id] ?? <String>{}).toSet();
    final has = set.contains(choice.id);

    if (opt.type == OptionType.single) {
      // ✅ bấm lại cùng choice => bỏ tick
      if (has) {
        set.remove(choice.id);
      } else {
        set
          ..clear()
          ..add(choice.id);
      }
    } else {
      // multiple
      if (has) {
        // ✅ bấm lại => bỏ tick (không chặn theo minSelect nữa)
        set.remove(choice.id);
      } else {
        if (set.length < opt.maxSelect) {
          set.add(choice.id);
        } else {
          // optional: báo user đã đạt max
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Tối đa ${opt.maxSelect} lựa chọn')),
          );
        }
      }
    }

    setState(() => _sel[opt.id] = set);
  }

  void _incTopping(ProductConfigTopping t) {
    if (!t.isAvailable) return;
    final cur = _toppingQty[t.id] ?? 0;
    if (cur >= t.maxQuantity) return;
    setState(() => _toppingQty[t.id] = cur + 1);
  }

  void _decTopping(ProductConfigTopping t) {
    final cur = _toppingQty[t.id] ?? 0;
    if (cur <= 0) return;
    setState(() => _toppingQty[t.id] = cur - 1);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;

    return DraggableScrollableSheet(
      initialChildSize: 0.70,
      minChildSize: 0.70,
      maxChildSize: 0.90,
      expand: false,
      builder: (context, scrollCtrl) {
        final asyncCfg = ref.watch(
          productConfigProvider(ProductConfigParams(widget.merchantId, p.id)),
        );

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
          ),
          child: asyncCfg.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, __) => Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Không tải được config: $e'),
              ),
            ),
            data: (cfg) {
              final opts = [...cfg.options]
                ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
              final tops = cfg.toppings;

              final optionExtra = _sumOptionExtra(opts);
              final toppingExtra = _sumToppingExtra(tops);
              final unit = p.price + optionExtra + toppingExtra;
              final total = unit * qty;

              final canSubmit = _validate(opts);

              return Column(
                children: [
                  SizedBox(
                    height: 56,
                    width: double.infinity,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        const Text(
                          'Thêm món mới',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Positioned(
                          right: 0,
                          child: IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // ===== Product Card (top) + qty stepper =====
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: SizedBox(
                            width: 86,
                            height: 86,
                            child: (p.cover == null || p.cover!.isEmpty)
                                ? Container(color: Colors.black12)
                                : CachedNetworkImage(
                                    imageUrl: p.cover!,
                                    fit: BoxFit.cover,
                                    placeholder: (_, __) =>
                                        Container(color: Colors.black12),
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
                                p.name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (p.description.trim().isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        p.description.trim(),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Colors.black54,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w400,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Text(
                                    '${p.sold}+ đã bán',
                                    style: const TextStyle(
                                      color: Colors.black54,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    '${p.reviews} lượt thích',
                                    style: const TextStyle(
                                      color: Colors.black54,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Text(
                                    money(p.price),
                                    style: const TextStyle(
                                      color: AppColor.primary,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  if (p.basePrice != null &&
                                      p.basePrice! > p.price)
                                    Text(
                                      money(p.basePrice!),
                                      style: const TextStyle(
                                        color: Colors.black38,
                                        fontSize: 12,
                                        decoration: TextDecoration.lineThrough,
                                        fontWeight: FontWeight.w400,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        _QtyStepper(
                          qty: qty,
                          onMinus: () =>
                              setState(() => qty = (qty > 1) ? qty - 1 : 1),
                          onPlus: () => setState(() => qty = qty + 1),
                        ),
                      ],
                    ),
                  ),

                  // ===== Options + Toppings list =====
                  Expanded(
                    child: ListView(
                      controller: scrollCtrl,
                      padding: EdgeInsets.zero,
                      children: [
                        // Options
                        for (final o in opts) ...[
                          _GroupHeader(title: '${o.name} ${_chooseLabel(o)}'),
                          for (final c in o.choices)
                            _ChoiceTile(
                              title: c.name,
                              priceText: '${money(c.priceModifier)}',
                              selected: (_sel[o.id] ?? {}).contains(c.id),
                              enabled: c.isAvailable,
                              onTap: () => _toggleChoice(o, c),
                            ),
                        ],

                        // Toppings (nếu có)
                        if (tops.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          const _GroupHeader(title: 'Topping'),
                          for (final t in tops)
                            _ToppingTile(
                              title: t.name,
                              priceText: money(t.price),
                              qty: _toppingQty[t.id] ?? 0,
                              maxQty: t.maxQuantity,
                              enabled: t.isAvailable,
                              onMinus: () => _decTopping(t),
                              onPlus: () => _incTopping(t),
                            ),
                        ],

                        // Note (optional giống “Thêm ghi chú...”)
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
                          child: TextField(
                            controller: _noteCtrl,
                            // 1. Cấu hình số dòng
                            minLines: 1, // Bắt đầu với 1 dòng
                            maxLines:
                                5, // Mở rộng tối đa 5 dòng, sau đó sẽ tự động cuộn bên trong
                            // 2. Cho phép bàn phím hiện nút "Enter" để xuống dòng
                            keyboardType: TextInputType.multiline,
                            textInputAction: TextInputAction.newline,

                            cursorColor: CupertinoColors.activeBlue,
                            style: const TextStyle(fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'Thêm ghi chú...',
                              hintStyle: const TextStyle(
                                color: Colors.black38,
                                fontSize: 13,
                              ),
                              filled: true,
                              fillColor: const Color(0xFFF3F4F6),

                              // 3. (Tùy chọn) Thêm padding bên trong để chữ không bị sát mép quá khi có nhiều dòng
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),

                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 90), // chừa chỗ cho CTA
                      ],
                    ),
                  ),

                  // ===== CTA (sticky) =====
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                      child: SizedBox(
                        height: 52,
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: canSubmit
                                ? AppColor.primary
                                : Colors.black12,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: canSubmit
                              ? () {
                                  final selectedOptions =
                                      <SelectedOptionDraft>[];
                                  for (final o in opts) {
                                    final picked = _sel[o.id] ?? {};
                                    for (final cid in picked) {
                                      final c = o.choices.firstWhere(
                                        (x) => x.id == cid,
                                      );
                                      selectedOptions.add(
                                        SelectedOptionDraft(
                                          optionId: o.id,
                                          optionName: o.name,
                                          choiceId: c.id,
                                          choiceName: c.name,
                                          priceModifier: c.priceModifier,
                                        ),
                                      );
                                    }
                                  }

                                  final selectedTops = <SelectedToppingDraft>[];
                                  for (final t in tops) {
                                    final q = _toppingQty[t.id] ?? 0;
                                    if (q > 0) {
                                      selectedTops.add(
                                        SelectedToppingDraft(
                                          toppingId: t.id,
                                          toppingName: t.name,
                                          price: t.price,
                                          quantity: q,
                                        ),
                                      );
                                    }
                                  }

                                  Navigator.pop(
                                    context,
                                    CartItemDraft(
                                      productId: p.id,
                                      quantity: qty,
                                      selectedOptions: selectedOptions,
                                      selectedToppings: selectedTops,
                                      note: _noteCtrl.text.trim(),
                                    ),
                                  );
                                }
                              : () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Vui lòng chọn đủ option bắt buộc',
                                      ),
                                    ),
                                  );
                                },
                          child: Text(
                            'Thêm vào giỏ hàng – ${money(total)}',
                            style: TextStyle(
                              color: canSubmit ? Colors.white : Colors.black38,
                              fontWeight: FontWeight.w500,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }
}

// =====================
// Small UI widgets
// =====================

class _QtyStepper extends StatelessWidget {
  const _QtyStepper({
    required this.qty,
    required this.onMinus,
    required this.onPlus,
  });

  final int qty;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _SquareBtn(filled: false, icon: Icons.remove, onTap: onMinus),
        const SizedBox(width: 10),
        Text(
          '$qty',
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
        const SizedBox(width: 10),
        _SquareBtn(filled: true, icon: Icons.add, onTap: onPlus),
      ],
    );
  }
}

class _SquareBtn extends StatelessWidget {
  const _SquareBtn({
    required this.filled,
    required this.icon,
    required this.onTap,
  });

  final bool filled;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 25,
        height: 25,
        decoration: BoxDecoration(
          color: filled ? AppColor.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(
            color: filled ? AppColor.primary : AppColor.primary,
            width: 1.5,
          ),
        ),
        child: Icon(
          icon,
          color: filled ? Colors.white : AppColor.primary,
          size: 13,
        ),
      ),
    );
  }
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      color: const Color(0xFFF2F2F2),
      child: Text(
        title,
        style: const TextStyle(
          color: Colors.black38,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ChoiceTile extends StatelessWidget {
  const _ChoiceTile({
    required this.title,
    required this.priceText,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String title;
  final String priceText;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final box = Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: selected ? AppColor.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: selected ? AppColor.primary : Colors.black26,
          width: 1.5,
        ),
      ),
      child: selected
          ? const Icon(Icons.check, size: 18, color: Colors.white)
          : null,
    );

    return InkWell(
      onTap: enabled ? onTap : null,
      child: Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFFEEEEEE))),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      priceText,
                      style: const TextStyle(color: Colors.black54),
                    ),
                  ],
                ),
              ),
              box,
            ],
          ),
        ),
      ),
    );
  }
}

class _ToppingTile extends StatelessWidget {
  const _ToppingTile({
    required this.title,
    required this.priceText,
    required this.qty,
    required this.maxQty,
    required this.enabled,
    required this.onMinus,
    required this.onPlus,
  });

  final String title;
  final String priceText;
  final int qty;
  final int maxQty;
  final bool enabled;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFEEEEEE))),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    priceText,
                    style: const TextStyle(color: Colors.black54),
                  ),
                ],
              ),
            ),
            _MiniQty(
              qty: qty,
              maxQty: maxQty,
              enabled: enabled,
              onMinus: onMinus,
              onPlus: onPlus,
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniQty extends StatelessWidget {
  const _MiniQty({
    required this.qty,
    required this.maxQty,
    required this.enabled,
    required this.onMinus,
    required this.onPlus,
  });

  final int qty;
  final int maxQty;
  final bool enabled;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        InkWell(
          onTap: (enabled && qty > 0) ? onMinus : null,
          child: Container(
            width: 25,
            height: 25,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(3),
              border: Border.all(color: Colors.black26),
            ),
            child: const Icon(Icons.remove, size: 14),
          ),
        ),
        const SizedBox(width: 10),
        Text('$qty', style: const TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(width: 10),
        InkWell(
          onTap: (enabled && qty < maxQty) ? onPlus : null,
          child: Container(
            width: 25,
            height: 25,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(3),
              color: AppColor.primary,
            ),
            child: const Icon(Icons.add, size: 14, color: Colors.white),
          ),
        ),
      ],
    );
  }
}
