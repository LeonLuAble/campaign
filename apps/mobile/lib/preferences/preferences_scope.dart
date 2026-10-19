import 'package:flutter/widgets.dart';

import 'preferences_controller.dart';

class PreferencesScope extends InheritedNotifier<PreferencesController> {
  const PreferencesScope({
    required PreferencesController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static PreferencesController of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<PreferencesScope>();
    assert(scope != null, 'PreferencesScope not found in the tree');
    return scope!.notifier!;
  }

  static PreferencesController? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<PreferencesScope>()
        ?.notifier;
  }
}
