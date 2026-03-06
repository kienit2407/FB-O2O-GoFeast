class ProductConfigResponse {
  final ProductConfigProduct product;
  final List<ProductConfigOption> options;
  final List<ProductConfigTopping> toppings;

  ProductConfigResponse({
    required this.product,
    required this.options,
    required this.toppings,
  });

  factory ProductConfigResponse.fromJson(Map<String, dynamic> j) {
    return ProductConfigResponse(
      product: ProductConfigProduct.fromJson(j['product']),
      options: (j['options'] as List? ?? [])
          .map((x) => ProductConfigOption.fromJson(x))
          .toList(),
      toppings: (j['toppings'] as List? ?? [])
          .map((x) => ProductConfigTopping.fromJson(x))
          .toList(),
    );
  }
}

class ProductConfigProduct {
  final String id;
  final String name;
  final int price;
  final int? basePrice;
  final bool isAvailable;
  final bool hasOptions;

  ProductConfigProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.basePrice,
    required this.isAvailable,
    required this.hasOptions,
  });

  factory ProductConfigProduct.fromJson(Map<String, dynamic> j) {
    return ProductConfigProduct(
      id: j['id'],
      name: j['name'] ?? '',
      price: (j['price'] ?? 0).toInt(),
      basePrice: j['base_price'] == null
          ? null
          : (j['base_price'] as num).toInt(),
      isAvailable: j['is_available'] == true,
      hasOptions: j['has_options'] == true,
    );
  }
}

enum OptionType { single, multiple }

class ProductConfigOption {
  final String id;
  final String name;
  final OptionType type;
  final bool isRequired;
  final int minSelect;
  final int maxSelect;
  final int sortOrder;
  final List<ProductConfigChoice> choices;

  ProductConfigOption({
    required this.id,
    required this.name,
    required this.type,
    required this.isRequired,
    required this.minSelect,
    required this.maxSelect,
    required this.sortOrder,
    required this.choices,
  });

  factory ProductConfigOption.fromJson(Map<String, dynamic> j) {
    final t = (j['type'] ?? 'single').toString();
    return ProductConfigOption(
      id: j['id'],
      name: j['name'] ?? '',
      type: (t == 'multiple') ? OptionType.multiple : OptionType.single,
      isRequired: j['is_required'] == true,
      minSelect: (j['min_select'] ?? 0).toInt(),
      maxSelect: (j['max_select'] ?? 1).toInt(),
      sortOrder: (j['sort_order'] ?? 0).toInt(),
      choices: (j['choices'] as List? ?? [])
          .map((x) => ProductConfigChoice.fromJson(x))
          .toList(),
    );
  }
}

class ProductConfigChoice {
  final String id;
  final String name;
  final int priceModifier;
  final bool isAvailable;

  ProductConfigChoice({
    required this.id,
    required this.name,
    required this.priceModifier,
    required this.isAvailable,
  });

  factory ProductConfigChoice.fromJson(Map<String, dynamic> j) {
    return ProductConfigChoice(
      id: j['id'],
      name: j['name'] ?? '',
      priceModifier: (j['price_modifier'] ?? 0).toInt(),
      isAvailable: j['is_available'] == true,
    );
  }
}

class ProductConfigTopping {
  final String id;
  final String name;
  final String? description;
  final int price;
  final bool isAvailable;
  final int maxQuantity;

  ProductConfigTopping({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.isAvailable,
    required this.maxQuantity,
  });

  factory ProductConfigTopping.fromJson(Map<String, dynamic> j) {
    return ProductConfigTopping(
      id: j['id'],
      name: j['name'] ?? '',
      description: j['description'],
      price: (j['price'] ?? 0).toInt(),
      isAvailable: j['is_available'] == true,
      maxQuantity: (j['max_quantity'] ?? 1).toInt(),
    );
  }
}

// =====================
// Draft return to caller
// =====================

class CartItemDraft {
  final String productId;
  final int quantity;
  final List<SelectedOptionDraft> selectedOptions;
  final List<SelectedToppingDraft> selectedToppings;
  final String note;

  CartItemDraft({
    required this.productId,
    required this.quantity,
    required this.selectedOptions,
    required this.selectedToppings,
    required this.note,
  });
}

class SelectedOptionDraft {
  final String optionId;
  final String optionName;
  final String choiceId;
  final String choiceName;
  final int priceModifier;

  SelectedOptionDraft({
    required this.optionId,
    required this.optionName,
    required this.choiceId,
    required this.choiceName,
    required this.priceModifier,
  });
}

class SelectedToppingDraft {
  final String toppingId;
  final String toppingName;
  final int price;
  final int quantity;

  SelectedToppingDraft({
    required this.toppingId,
    required this.toppingName,
    required this.price,
    required this.quantity,
  });
}
