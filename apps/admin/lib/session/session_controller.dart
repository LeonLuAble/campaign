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
  bool get isPlatformAdmin => profile?.isPlatformAdmin == true;

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

  Future<SetupStatus> getSetupStatus() => api.getSetupStatus();

  Future<void> completeSetup({
    required String setupKey,
    required String email,
    required String password,
    String? displayName,
  }) async {
    await api.completeSetup(
      setupKey: setupKey,
      email: email,
      password: password,
      displayName: displayName,
    );
    await restore();
  }

  void expireLocalSession() {
    profile = null;
    customers = const [];
    customer = null;
    notifyListeners();
  }

  Future<void> logout() async {
    await api.logout();
    expireLocalSession();
  }

  Future<void> applyLocale(String locale) async {
    if (!isAuthenticated) {
      return;
    }
    profile = await api.updateMe(locale: locale);
    notifyListeners();
  }

  Future<void> refreshCustomers() async {
    customers = await api.listCustomers();
    if (customers.isEmpty) {
      customer = null;
    } else if (customer == null ||
        customers.every((row) => row.id != customer!.id)) {
      customer = customers.first;
    } else {
      customer = customers.firstWhere((row) => row.id == customer!.id);
    }
    notifyListeners();
  }

  void selectCustomer(Customer next) {
    customer = next;
    notifyListeners();
  }
}
