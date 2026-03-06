enum SearchKind { product, topping }

class SearchItem {
  final SearchKind kind;
  final String id;
  final String name;
  final String desc;
  final String? imageUrl;
  final num price;
  final num? basePrice; // nếu product có sale
  final bool isAvailable;
  final int sectionIndex; // để scroll đến section nếu muốn
  final int entryIndex;   // để scroll đến item cụ thể nếu muốn

  const SearchItem({
    required this.kind,
    required this.id,
    required this.name,
    required this.desc,
    required this.imageUrl,
    required this.price,
    required this.basePrice,
    required this.isAvailable,
    required this.sectionIndex,
    required this.entryIndex,
  });
}