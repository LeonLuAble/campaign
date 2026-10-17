import 'package:flutter/material.dart';

/// Hides [child] when none of [anyOf] appear in [permissionKeys].
///
/// Convenience only — the API remains the authority for authorization.
class PermissionGate extends StatelessWidget {
  const PermissionGate({
    required this.permissionKeys,
    required this.anyOf,
    required this.child,
    this.fallback = const SizedBox.shrink(),
    super.key,
  });

  final Iterable<String> permissionKeys;
  final Iterable<String> anyOf;
  final Widget child;
  final Widget fallback;

  bool get allowed {
    final keys = permissionKeys is Set<String>
        ? permissionKeys as Set<String>
        : permissionKeys.toSet();
    for (final key in anyOf) {
      if (keys.contains(key)) {
        return true;
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return allowed ? child : fallback;
  }
}
