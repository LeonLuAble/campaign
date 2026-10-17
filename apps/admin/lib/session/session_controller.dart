import 'package:api_client/api_client.dart';
import 'package:flutter/foundation.dart';

class SessionController extends ChangeNotifier {
  SessionController({required this.api});

  final CampaignApiClient api;
  UserProfile? profile;
  Customer? customer;
  List<Customer> customers = const [];
  CustomerAccess? access;
  bool ready = false;
  bool _accessLoading = false;

  bool get isAuthenticated => profile != null;
  bool get isPlatformAdmin => profile?.isPlatformAdmin == true;
  bool get accessLoading => _accessLoading;

  Set<String> get permissionKeys =>
      access?.permissionKeys.toSet() ?? const <String>{};

  bool hasPermission(String key) => permissionKeys.contains(key);

  bool hasAnyPermission(Iterable<String> keys) {
    final set = permissionKeys;
    for (final key in keys) {
      if (set.contains(key)) {
        return true;
      }
    }
    return false;
  }

  Future<void> restore() async {
    try {
      profile = await api.getMe();
      customers = await api.listCustomers();
      customer = customers.isEmpty ? null : customers.first;
      if (customer != null) {
        await _loadAccess(customer!.id);
      } else {
        access = null;
      }
    } on ApiException {
      profile = null;
      customers = const [];
      customer = null;
      access = null;
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
    access = null;
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
      access = null;
    } else if (customer == null ||
        customers.every((row) => row.id != customer!.id)) {
      customer = customers.first;
      await _loadAccess(customer!.id);
    } else {
      customer = customers.firstWhere((row) => row.id == customer!.id);
      await _loadAccess(customer!.id);
    }
    notifyListeners();
  }

  Future<void> selectCustomer(Customer next) async {
    customer = next;
    notifyListeners();
    await _loadAccess(next.id);
    notifyListeners();
  }

  /// Ensures access is loaded for [customerId] (e.g. deep links).
  Future<void> ensureAccess(String customerId) async {
    if (access != null && customer?.id == customerId) {
      return;
    }
    final match = customers.where((row) => row.id == customerId).firstOrNull;
    if (match != null) {
      customer = match;
    }
    await _loadAccess(customerId);
    notifyListeners();
  }

  Future<void> _loadAccess(String customerId) async {
    _accessLoading = true;
    notifyListeners();
    try {
      access = await api.getCustomerAccess(customerId);
    } on ApiException {
      access = null;
    } finally {
      _accessLoading = false;
    }
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final iterator = this.iterator;
    if (iterator.moveNext()) {
      return iterator.current;
    }
    return null;
  }
}
