class MerchantPromotionSummaryItem {
  final String id;
  final String? merchantId;
  final String? merchantName;
  final String name;
  final String description;
  final String? bannerUrl;
  final String sponsor;
  final String scope;
  final String applyLevel;
  final String activationType;
  final String discountType;
  final num discountValue;
  final num maxDiscount;
  final num minOrderAmount;
  final String? validFrom;
  final String? validTo;
  final bool canStackWithVoucher;
  final bool hasVoucher;
  final int voucherCount;
  final PromotionUserState userState;
  final PromotionVoucherPreview? firstVoucher;

  const MerchantPromotionSummaryItem({
    required this.id,
    required this.merchantId,
    required this.merchantName,
    required this.name,
    required this.description,
    required this.bannerUrl,
    required this.sponsor,
    required this.scope,
    required this.applyLevel,
    required this.activationType,
    required this.discountType,
    required this.discountValue,
    required this.maxDiscount,
    required this.minOrderAmount,
    required this.validFrom,
    required this.validTo,
    required this.canStackWithVoucher,
    required this.hasVoucher,
    required this.voucherCount,
    required this.userState,
    required this.firstVoucher,
  });

  factory MerchantPromotionSummaryItem.fromJson(Map<String, dynamic> j) {
    return MerchantPromotionSummaryItem(
      id: (j['id'] ?? '').toString(),
      merchantId: j['merchant_id']?.toString(),
      merchantName: j['merchant_name']?.toString(),
      name: (j['name'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      bannerUrl: j['banner_url']?.toString(),
      sponsor: (j['sponsor'] ?? '').toString(),
      scope: (j['scope'] ?? '').toString(),
      applyLevel: (j['apply_level'] ?? '').toString(),
      activationType: (j['activation_type'] ?? '').toString(),
      discountType: (j['discount_type'] ?? '').toString(),
      discountValue: (j['discount_value'] as num?) ?? 0,
      maxDiscount: (j['max_discount'] as num?) ?? 0,
      minOrderAmount: (j['min_order_amount'] as num?) ?? 0,
      validFrom: j['valid_from']?.toString(),
      validTo: j['valid_to']?.toString(),
      canStackWithVoucher: j['can_stack_with_voucher'] == true,
      hasVoucher: j['has_voucher'] == true,
      voucherCount: (j['voucher_count'] as num?)?.toInt() ?? 0,
      userState: PromotionUserState.fromJson(
        ((j['user_state'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      firstVoucher: j['first_voucher'] is Map
          ? PromotionVoucherPreview.fromJson(
              (j['first_voucher'] as Map).cast<String, dynamic>(),
            )
          : null,
    );
  }
}

class PromotionVoucherPreview {
  final String id;
  final String code;
  final int perUserLimit;
  final int totalUsageLimit;
  final int currentUsage;
  final bool isSaved;
  final int usedCount;

  const PromotionVoucherPreview({
    required this.id,
    required this.code,
    required this.perUserLimit,
    required this.totalUsageLimit,
    required this.currentUsage,
    required this.isSaved,
    required this.usedCount,
  });

  factory PromotionVoucherPreview.fromJson(Map<String, dynamic> j) {
    return PromotionVoucherPreview(
      id: (j['id'] ?? '').toString(),
      code: (j['code'] ?? '').toString(),
      perUserLimit: (j['per_user_limit'] as num?)?.toInt() ?? 0,
      totalUsageLimit: (j['total_usage_limit'] as num?)?.toInt() ?? 0,
      currentUsage: (j['current_usage'] as num?)?.toInt() ?? 0,
      isSaved: j['is_saved'] == true,
      usedCount: (j['used_count'] as num?)?.toInt() ?? 0,
    );
  }
}

class PromotionUserState {
  final int promotionUsedCount;
  final int promotionPerUserLimit;
  final bool isUserLimitReached;

  const PromotionUserState({
    required this.promotionUsedCount,
    required this.promotionPerUserLimit,
    required this.isUserLimitReached,
  });

  factory PromotionUserState.fromJson(Map<String, dynamic> j) {
    return PromotionUserState(
      promotionUsedCount: (j['promotion_used_count'] as num?)?.toInt() ?? 0,
      promotionPerUserLimit:
          (j['promotion_per_user_limit'] as num?)?.toInt() ?? 0,
      isUserLimitReached: j['is_user_limit_reached'] == true,
    );
  }
}

class PromotionDetail {
  final String id;
  final String? merchantId;
  final String? merchantName;
  final String? merchantLogoUrl;
  final String? merchantAddress;
  final String name;
  final String description;
  final String? bannerUrl;
  final String sponsor;
  final String scope;
  final String applyLevel;
  final String activationType;
  final String discountType;
  final num discountValue;
  final num maxDiscount;
  final num minOrderAmount;
  final String? validFrom;
  final String? validTo;
  final List<String> allowedOrderTypes;
  final List<String> allowedPaymentMethods;
  final bool canStackWithVoucher;
  final PromotionUserState userState;

  const PromotionDetail({
    required this.id,
    required this.merchantId,
    required this.merchantName,
    required this.merchantLogoUrl,
    required this.merchantAddress,
    required this.name,
    required this.description,
    required this.bannerUrl,
    required this.sponsor,
    required this.scope,
    required this.applyLevel,
    required this.activationType,
    required this.discountType,
    required this.discountValue,
    required this.maxDiscount,
    required this.minOrderAmount,
    required this.validFrom,
    required this.validTo,
    required this.allowedOrderTypes,
    required this.allowedPaymentMethods,
    required this.canStackWithVoucher,
    required this.userState,
  });

  factory PromotionDetail.fromJson(Map<String, dynamic> j) {
    return PromotionDetail(
      id: (j['id'] ?? '').toString(),
      merchantId: j['merchant_id']?.toString(),
      merchantName: j['merchant_name']?.toString(),
      merchantLogoUrl: j['merchant_logo_url']?.toString(),
      merchantAddress: j['merchant_address']?.toString(),
      name: (j['name'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      bannerUrl: j['banner_url']?.toString(),
      sponsor: (j['sponsor'] ?? '').toString(),
      scope: (j['scope'] ?? '').toString(),
      applyLevel: (j['apply_level'] ?? '').toString(),
      activationType: (j['activation_type'] ?? '').toString(),
      discountType: (j['discount_type'] ?? '').toString(),
      discountValue: (j['discount_value'] as num?) ?? 0,
      maxDiscount: (j['max_discount'] as num?) ?? 0,
      minOrderAmount: (j['min_order_amount'] as num?) ?? 0,
      validFrom: j['valid_from']?.toString(),
      validTo: j['valid_to']?.toString(),
      allowedOrderTypes: ((j['allowed_order_types'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(),
      allowedPaymentMethods:
          ((j['allowed_payment_methods'] as List?) ?? const [])
              .map((e) => e.toString())
              .toList(),
      canStackWithVoucher: j['can_stack_with_voucher'] == true,
      userState: PromotionUserState.fromJson(
        ((j['user_state'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
    );
  }
}

class PromotionVoucherItem {
  final String id;
  final String code;
  final String? startDate;
  final String? endDate;
  final int totalUsageLimit;
  final int perUserLimit;
  final int currentUsage;
  final bool isSaved;
  final int usedCount;
  final bool isUserLimitReached;
  final int? remainingUserUses;

  const PromotionVoucherItem({
    required this.id,
    required this.code,
    required this.startDate,
    required this.endDate,
    required this.totalUsageLimit,
    required this.perUserLimit,
    required this.currentUsage,
    required this.isSaved,
    required this.usedCount,
    required this.isUserLimitReached,
    required this.remainingUserUses,
  });

  factory PromotionVoucherItem.fromJson(Map<String, dynamic> j) {
    return PromotionVoucherItem(
      id: (j['id'] ?? '').toString(),
      code: (j['code'] ?? '').toString(),
      startDate: j['start_date']?.toString(),
      endDate: j['end_date']?.toString(),
      totalUsageLimit: (j['total_usage_limit'] as num?)?.toInt() ?? 0,
      perUserLimit: (j['per_user_limit'] as num?)?.toInt() ?? 0,
      currentUsage: (j['current_usage'] as num?)?.toInt() ?? 0,
      isSaved: j['is_saved'] == true,
      usedCount: (j['used_count'] as num?)?.toInt() ?? 0,
      isUserLimitReached: j['is_user_limit_reached'] == true,
      remainingUserUses: (j['remaining_user_uses'] as num?)?.toInt(),
    );
  }
}

class PromotionDetailResponse {
  final PromotionDetail promotion;
  final List<PromotionVoucherItem> vouchers;

  const PromotionDetailResponse({
    required this.promotion,
    required this.vouchers,
  });

  factory PromotionDetailResponse.fromJson(Map<String, dynamic> j) {
    return PromotionDetailResponse(
      promotion: PromotionDetail.fromJson(
        ((j['promotion'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      vouchers: ((j['vouchers'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => PromotionVoucherItem.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class SavedVoucherItem {
  final String userVoucherId;
  final String voucherId;
  final String promotionId;
  final String? merchantId;
  final String? merchantName;
  final String? merchantLogoUrl;
  final String voucherCode;
  final String promotionName;
  final String description;
  final String? bannerUrl;
  final String sponsor;
  final String scope;
  final String applyLevel;
  final String activationType;
  final String discountType;
  final num discountValue;
  final num maxDiscount;
  final num minOrderAmount;
  final String? validFrom;
  final String? validTo;
  final String? voucherStartDate;
  final String? voucherEndDate;
  final int totalUsageLimit;
  final int perUserLimit;
  final int currentUsage;
  final int promotionPerUserLimit;
  final int promotionUsedCount;
  final int usedCount;
  final bool isSaved;
  final bool isUsed;
  final String? savedAt;
  final String? usedAt;
  final int? remainingUserUses;

  const SavedVoucherItem({
    required this.userVoucherId,
    required this.voucherId,
    required this.promotionId,
    required this.merchantId,
    required this.merchantName,
    required this.merchantLogoUrl,
    required this.voucherCode,
    required this.promotionName,
    required this.description,
    required this.bannerUrl,
    required this.sponsor,
    required this.scope,
    required this.applyLevel,
    required this.activationType,
    required this.discountType,
    required this.discountValue,
    required this.maxDiscount,
    required this.minOrderAmount,
    required this.validFrom,
    required this.validTo,
    required this.voucherStartDate,
    required this.voucherEndDate,
    required this.totalUsageLimit,
    required this.perUserLimit,
    required this.currentUsage,
    required this.promotionPerUserLimit,
    required this.promotionUsedCount,
    required this.usedCount,
    required this.isSaved,
    required this.isUsed,
    required this.savedAt,
    required this.usedAt,
    required this.remainingUserUses,
  });

  factory SavedVoucherItem.fromJson(Map<String, dynamic> j) {
    return SavedVoucherItem(
      userVoucherId: (j['user_voucher_id'] ?? '').toString(),
      voucherId: (j['voucher_id'] ?? '').toString(),
      promotionId: (j['promotion_id'] ?? '').toString(),
      merchantId: j['merchant_id']?.toString(),
      merchantName: j['merchant_name']?.toString(),
      merchantLogoUrl: j['merchant_logo_url']?.toString(),
      voucherCode: (j['voucher_code'] ?? '').toString(),
      promotionName: (j['promotion_name'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      bannerUrl: j['banner_url']?.toString(),
      sponsor: (j['sponsor'] ?? '').toString(),
      scope: (j['scope'] ?? '').toString(),
      applyLevel: (j['apply_level'] ?? '').toString(),
      activationType: (j['activation_type'] ?? '').toString(),
      discountType: (j['discount_type'] ?? '').toString(),
      discountValue: (j['discount_value'] as num?) ?? 0,
      maxDiscount: (j['max_discount'] as num?) ?? 0,
      minOrderAmount: (j['min_order_amount'] as num?) ?? 0,
      validFrom: j['valid_from']?.toString(),
      validTo: j['valid_to']?.toString(),
      voucherStartDate: j['voucher_start_date']?.toString(),
      voucherEndDate: j['voucher_end_date']?.toString(),
      totalUsageLimit: (j['total_usage_limit'] as num?)?.toInt() ?? 0,
      perUserLimit: (j['per_user_limit'] as num?)?.toInt() ?? 0,
      currentUsage: (j['current_usage'] as num?)?.toInt() ?? 0,
      promotionPerUserLimit:
          (j['promotion_per_user_limit'] as num?)?.toInt() ?? 0,
      promotionUsedCount: (j['promotion_used_count'] as num?)?.toInt() ?? 0,
      usedCount: (j['used_count'] as num?)?.toInt() ?? 0,
      isSaved: j['is_saved'] == true,
      isUsed: j['is_used'] == true,
      savedAt: j['saved_at']?.toString(),
      usedAt: j['used_at']?.toString(),
      remainingUserUses: (j['remaining_user_uses'] as num?)?.toInt(),
    );
  }
}
class PopupPromotionItem {
  final String id;
  final String name;
  final String description;
  final String? bannerUrl;
  final String sponsor;
  final String scope;
  final String applyLevel;
  final String activationType;
  final String discountType;
  final num discountValue;
  final num maxDiscount;
  final num minOrderAmount;
  final String? validFrom;
  final String? validTo;
  final bool canStackWithVoucher;
  final PromotionUserState userState;

  const PopupPromotionItem({
    required this.id,
    required this.name,
    required this.description,
    required this.bannerUrl,
    required this.sponsor,
    required this.scope,
    required this.applyLevel,
    required this.activationType,
    required this.discountType,
    required this.discountValue,
    required this.maxDiscount,
    required this.minOrderAmount,
    required this.validFrom,
    required this.validTo,
    required this.canStackWithVoucher,
    required this.userState,
  });

  factory PopupPromotionItem.fromJson(Map<String, dynamic> j) {
    return PopupPromotionItem(
      id: (j['id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      bannerUrl: j['banner_url']?.toString(),
      sponsor: (j['sponsor'] ?? '').toString(),
      scope: (j['scope'] ?? '').toString(),
      applyLevel: (j['apply_level'] ?? '').toString(),
      activationType: (j['activation_type'] ?? '').toString(),
      discountType: (j['discount_type'] ?? '').toString(),
      discountValue: (j['discount_value'] as num?) ?? 0,
      maxDiscount: (j['max_discount'] as num?) ?? 0,
      minOrderAmount: (j['min_order_amount'] as num?) ?? 0,
      validFrom: j['valid_from']?.toString(),
      validTo: j['valid_to']?.toString(),
      canStackWithVoucher: j['can_stack_with_voucher'] == true,
      userState: PromotionUserState.fromJson(
        ((j['user_state'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
    );
  }
}