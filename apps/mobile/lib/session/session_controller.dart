import 'package:api_client/api_client.dart';
import 'package:flutter/foundation.dart';

class SessionController extends ChangeNotifier {
  SessionController({required this.api});

  final CampaignApiClient api;

  UserProfile? profile;
  Customer? customer;
  List<Customer> customers = const [];
  bool ready = false;

  bool get isAuthenticated => profile != null;

  Future<void> restore() async {
    try {
      profile = await api.getMe();
      customers = await api.listCustomers();
      customer = customers.isEmpty ? null : customers.first;
    } on ApiException {
      profile = null;
      customers = const [];
      customer = null;
    } finally {
      ready = true;
      notifyListeners();
    }
  }

  Future<void> login({
    required String identifier,
    required String password,
  }) async {
    await api.login(identifier: identifier, password: password);
    await restore();
  }

  Future<void> socialLogin({
    required String provider,
    required String idToken,
  }) async {
    await api.socialLogin(provider: provider, idToken: idToken);
    await restore();
  }

  Future<void> logout() async {
    await api.logout();
    profile = null;
    customers = const [];
    customer = null;
    notifyListeners();
  }

  void selectCustomer(Customer next) {
    customer = next;
    notifyListeners();
  }

  Future<void> applyLocale(String locale) async {
    if (!isAuthenticated) {
      return;
    }
    profile = await api.updateMe(locale: locale);
    notifyListeners();
  }
}
