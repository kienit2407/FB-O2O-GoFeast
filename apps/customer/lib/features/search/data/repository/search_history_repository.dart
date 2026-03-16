import 'package:hive_ce/hive.dart';

class SearchHistoryRepository {
  static const _boxName = 'search_history_box';
  static const _key = 'recent_keywords';
  static const _maxItems = 10;

  Future<Box> _openBox() async {
    if (Hive.isBoxOpen(_boxName)) {
      return Hive.box(_boxName);
    }
    return Hive.openBox(_boxName);
  }

  String _normalize(String value) => value.trim().toLowerCase();

  Future<List<String>> getRecent() async {
    final box = await _openBox();
    final raw = box.get(_key, defaultValue: <String>[]);
    return List<String>.from(raw as List);
  }

  Future<void> push(String keyword) async {
    final value = keyword.trim();
    if (value.isEmpty) return;

    final box = await _openBox();
    final current = List<String>.from(
      box.get(_key, defaultValue: <String>[]) as List,
    );

    current.removeWhere((e) => _normalize(e) == _normalize(value));
    current.insert(0, value);

    if (current.length > _maxItems) {
      current.removeRange(_maxItems, current.length);
    }

    await box.put(_key, current);
  }

  Future<void> remove(String keyword) async {
    final box = await _openBox();
    final current = List<String>.from(
      box.get(_key, defaultValue: <String>[]) as List,
    );
    current.removeWhere((e) => _normalize(e) == _normalize(keyword));
    await box.put(_key, current);
  }

  Future<void> clear() async {
    final box = await _openBox();
    await box.put(_key, <String>[]);
  }
}
