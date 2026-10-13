import 'package:flutter/widgets.dart';

class LocaleScope extends InheritedWidget {
  const LocaleScope({
    required this.locale,
    required this.onLocaleChanged,
    required super.child,
    super.key,
  });

  final Locale locale;
  final ValueChanged<Locale> onLocaleChanged;

  static LocaleScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<LocaleScope>();
    assert(scope != null, 'LocaleScope is missing');
    return scope!;
  }

  @override
  bool updateShouldNotify(LocaleScope oldWidget) => locale != oldWidget.locale;
}
