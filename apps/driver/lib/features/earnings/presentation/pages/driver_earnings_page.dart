import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/di/providers.dart';
import 'package:driver/features/earnings/data/models/driver_earnings_models.dart';

class DriverEarningsPage extends ConsumerStatefulWidget {
  const DriverEarningsPage({super.key});

  @override
  ConsumerState<DriverEarningsPage> createState() => _DriverEarningsPageState();
}

class _DriverEarningsPageState extends ConsumerState<DriverEarningsPage> {
  Future<void> _pickDate(DateTime current) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColor.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: AppColor.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      await ref.read(driverEarningsControllerProvider.notifier).setDate(picked);
    }
  }

  String _formatCurrency(int value) {
    final isNegative = value < 0;
    final abs = value.abs();
    final s = abs.toString();
    final buffer = StringBuffer();

    for (int i = 0; i < s.length; i++) {
      final position = s.length - i;
      buffer.write(s[i]);
      if (position > 1 && position % 3 == 1) {
        buffer.write('.');
      }
    }

    return '${isNegative ? '-' : ''}${buffer.toString()} đ';
  }

  String _two(int n) => n.toString().padLeft(2, '0');

  String _formatDate(DateTime date) {
    return '${_two(date.day)}/${_two(date.month)}/${date.year}';
  }

  String _rangeLabel(DriverEarningsRange range, DateTime selectedDate) {
    switch (range) {
      case DriverEarningsRange.day:
        return 'Ngày ${_formatDate(selectedDate)}';
      case DriverEarningsRange.week:
        final start = selectedDate.subtract(
          Duration(days: selectedDate.weekday - 1),
        );
        final end = start.add(const Duration(days: 6));
        return '${_formatDate(start)} - ${_formatDate(end)}';
      case DriverEarningsRange.month:
        return 'Tháng ${_two(selectedDate.month)}/${selectedDate.year}';
    }
  }

  IconData _entryIcon(DriverEarningsHistoryType type) {
    switch (type) {
      case DriverEarningsHistoryType.trip:
        return Icons.delivery_dining_rounded;
      case DriverEarningsHistoryType.deduction:
        return Icons.remove_circle_outline_rounded;
      case DriverEarningsHistoryType.withdrawal:
        return Icons.account_balance_wallet_rounded;
      case DriverEarningsHistoryType.unknown:
        return Icons.receipt_long_rounded;
    }
  }

  Color _entryColor(DriverEarningsHistoryItem entry) {
    if (!entry.isPositive) return AppColor.danger;

    switch (entry.type) {
      case DriverEarningsHistoryType.trip:
        return AppColor.success;
      case DriverEarningsHistoryType.withdrawal:
        return AppColor.info;
      case DriverEarningsHistoryType.deduction:
        return AppColor.danger;
      case DriverEarningsHistoryType.unknown:
        return AppColor.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(driverEarningsControllerProvider);
    final topPadding = MediaQuery.of(context).padding.top;
    final summary = state.summary;

    ref.listen(driverEarningsControllerProvider, (previous, next) {
      final prevError = previous?.error;
      final nextError = next.error;

      if (nextError != null && nextError != prevError) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(nextError)));
      }
    });

    return Scaffold(
      backgroundColor: AppColor.background,
      body: RefreshIndicator(
        onRefresh: () => ref
            .read(driverEarningsControllerProvider.notifier)
            .load(refresh: true),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Container(
                padding: EdgeInsets.fromLTRB(16, topPadding + 12, 16, 18),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColor.headerGradStart, AppColor.headerGradEnd],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.vertical(
                    bottom: Radius.circular(28),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Thu nhập',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(.16),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: Colors.white.withOpacity(.16),
                            ),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.account_balance_wallet_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                              SizedBox(width: 6),
                              Text(
                                'Ví tài xế',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x14000000),
                            blurRadius: 20,
                            offset: Offset(0, 10),
                          ),
                        ],
                      ),
                      child: state.isLoading && summary == null
                          ? const SizedBox(
                              height: 180,
                              child: Center(child: CircularProgressIndicator()),
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CupertinoSlidingSegmentedControl<
                                  DriverEarningsRange
                                >(
                                  groupValue: state.range,
                                  thumbColor: AppColor.primary,
                                  backgroundColor: AppColor.primaryLight,
                                  children: const {
                                    DriverEarningsRange.day: Padding(
                                      padding: EdgeInsets.symmetric(
                                        vertical: 8,
                                      ),
                                      child: Text(
                                        'Ngày',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    DriverEarningsRange.week: Padding(
                                      padding: EdgeInsets.symmetric(
                                        vertical: 8,
                                      ),
                                      child: Text(
                                        'Tuần',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    DriverEarningsRange.month: Padding(
                                      padding: EdgeInsets.symmetric(
                                        vertical: 8,
                                      ),
                                      child: Text(
                                        'Tháng',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  },
                                  onValueChanged: (value) {
                                    if (value != null) {
                                      ref
                                          .read(
                                            driverEarningsControllerProvider
                                                .notifier,
                                          )
                                          .setRange(value);
                                    }
                                  },
                                ),
                                const SizedBox(height: 16),
                                InkWell(
                                  borderRadius: BorderRadius.circular(16),
                                  onTap: () => _pickDate(state.selectedDate),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColor.surfaceWarm,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: AppColor.border,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.calendar_month_rounded,
                                          size: 20,
                                          color: AppColor.primary,
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            _rangeLabel(
                                              state.range,
                                              state.selectedDate,
                                            ),
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: AppColor.textPrimary,
                                            ),
                                          ),
                                        ),
                                        const Icon(
                                          Icons.chevron_right_rounded,
                                          color: AppColor.textMuted,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 18),
                                const Text(
                                  'Tổng thu nhập',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: AppColor.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _formatCurrency(summary?.total ?? 0),
                                  style: const TextStyle(
                                    fontSize: 34,
                                    height: 1.1,
                                    fontWeight: FontWeight.w800,
                                    color: AppColor.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColor.success.withOpacity(
                                          .10,
                                        ),
                                        borderRadius: BorderRadius.circular(
                                          999,
                                        ),
                                      ),
                                      child: const Text(
                                        'Đã đối soát tạm tính',
                                        style: TextStyle(
                                          color: AppColor.success,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${summary?.tripCount ?? 0} chuyến',
                                      style: const TextStyle(
                                        color: AppColor.textSecondary,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          title: 'Tiền chuyến',
                          value: _formatCurrency(summary?.tripIncome ?? 0),
                          icon: Icons.local_shipping_rounded,
                          tint: AppColor.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          title: 'Khấu trừ',
                          value: _formatCurrency(summary?.deduction ?? 0),
                          icon: Icons.remove_circle_outline_rounded,
                          tint: AppColor.danger,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          title: 'Số chuyến',
                          value: '${summary?.tripCount ?? 0}',
                          icon: Icons.route_rounded,
                          tint: AppColor.info,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          title: 'Đánh giá TB',
                          value: ((summary?.averageRating ?? 0) == 0)
                              ? 'Chưa có đánh giá'
                              : (summary!.averageRating.toStringAsFixed(1)),
                          icon: Icons.star_rounded,
                          tint: AppColor.warning,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Lịch sử thu nhập',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColor.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (state.isLoading && state.items.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColor.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColor.border),
                      ),
                      child: const Center(child: CircularProgressIndicator()),
                    )
                  else if (state.items.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColor.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColor.border),
                      ),
                      child: const Column(
                        children: [
                          Icon(
                            Icons.inbox_outlined,
                            size: 48,
                            color: AppColor.textMuted,
                          ),
                          SizedBox(height: 12),
                          Text(
                            'Chưa có giao dịch nào',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColor.textPrimary,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Khi tài xế hoàn thành đơn hoặc có khấu trừ, dữ liệu sẽ hiển thị ở đây.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColor.textSecondary,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ...state.items.map((e) {
                      final color = _entryColor(e);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _EarningHistoryTile(
                          title: e.title,
                          subtitle: e.subtitle,
                          time: e.occurredAt,
                          amount: e.amount,
                          isPositive: e.isPositive,
                          color: color,
                          icon: _entryIcon(e.type),
                          formatter: _formatCurrency,
                        ),
                      );
                    }),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color tint;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.tint,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColor.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 38,
            width: 38,
            decoration: BoxDecoration(
              color: tint.withOpacity(.10),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: tint, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              color: AppColor.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColor.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _EarningHistoryTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final DateTime? time;
  final int amount;
  final bool isPositive;
  final Color color;
  final IconData icon;
  final String Function(int value) formatter;

  const _EarningHistoryTile({
    required this.title,
    required this.subtitle,
    required this.time,
    required this.amount,
    required this.isPositive,
    required this.color,
    required this.icon,
    required this.formatter,
  });

  String _two(int n) => n.toString().padLeft(2, '0');

  String _timeText(DateTime? value) {
    if (value == null) return '--';
    return '${_two(value.hour)}:${_two(value.minute)} • ${_two(value.day)}/${_two(value.month)}/${value.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColor.border),
      ),
      child: Row(
        children: [
          Container(
            height: 44,
            width: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(.10),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColor.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColor.textSecondary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _timeText(time),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColor.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '${isPositive ? '+' : '-'}${formatter(amount)}',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: isPositive ? AppColor.success : AppColor.danger,
            ),
          ),
        ],
      ),
    );
  }
}
