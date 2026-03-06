import 'package:flutter/material.dart';

class UnfocusHelers extends StatelessWidget {
  const UnfocusHelers({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child:  child,
    );
  }
}