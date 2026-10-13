import 'package:flutter/widgets.dart';

import 'app_config.dart';

class AppConfigScope extends InheritedWidget {
  const AppConfigScope({required this.config, required super.child, super.key});

  final AppConfig config;

  static AppConfig of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppConfigScope>();
    assert(scope != null, 'AppConfigScope is missing');
    return scope!.config;
  }

  @override
  bool updateShouldNotify(AppConfigScope oldWidget) {
    return oldWidget.config != config;
  }
}
