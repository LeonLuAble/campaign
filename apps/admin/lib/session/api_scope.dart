import 'package:api_client/api_client.dart';
import 'package:flutter/widgets.dart';

import 'session_controller.dart';

typedef PickCsv = Future<({String name, List<int> bytes})?> Function();

class ApiScope extends InheritedWidget {
  const ApiScope({
    required this.client,
    required this.session,
    required super.child,
    this.pickCsv,
    super.key,
  });

  final CampaignApiClient client;
  final SessionController session;
  final PickCsv? pickCsv;

  static ApiScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ApiScope>();
    assert(scope != null, 'ApiScope is missing');
    return scope!;
  }

  @override
  bool updateShouldNotify(ApiScope oldWidget) {
    return oldWidget.client != client || oldWidget.session != session;
  }
}
