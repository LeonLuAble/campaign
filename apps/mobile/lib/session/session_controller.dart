import 'package:api_client/api_client.dart';
import 'package:flutter/foundation.dart';

class SessionController extends ChangeNotifier {
  SessionController({required this.api});

  final CampaignApiClient api;

  UserProfile? profile;
  Customer? customer;
  List<Customer> customers = const [];
  CustomerAccess? access;
  List<Community> communities = const [];
  String? selectedCommunityId;
  bool ready = false;

  /// Set when the session ends because of refresh-token reuse.
  String? sessionEndedCode;

  bool get isAuthenticated => profile != null;

  String? get selectedCommunityName {
    final id = selectedCommunityId;
    if (id == null) {
      return null;
    }
    final matches = communities.where((row) => row.id == id);
    return matches.isEmpty ? null : matches.first.name;
  }

  List<Community> get selectableCommunities {
    final ids = access?.communityIds ?? const <String>[];
    if (ids.isEmpty) {
      return const [];
    }
    return communities.where((row) => ids.contains(row.id)).toList();
  }

  Future<void> restore() async {
    try {
      profile = await api.getMe();
      customers = await api.listCustomers();
      customer = customers.isEmpty
          ? null
          : (customer != null &&
                  customers.any((row) => row.id == customer!.id)
              ? customers.firstWhere((row) => row.id == customer!.id)
              : customers.first);
      await _loadTenantContext();
      sessionEndedCode = null;
    } on ApiException catch (error) {
      profile = null;
      customers = const [];
      customer = null;
      access = null;
      communities = const [];
      selectedCommunityId = null;
      if (error.isTokenReused) {
        sessionEndedCode = 'TOKEN_REUSED';
      }
    } finally {
      ready = true;
      notifyListeners();
    }
  }

  Future<void> _loadTenantContext() async {
    final current = customer;
    if (current == null) {
      access = null;
      communities = const [];
      selectedCommunityId = null;
      return;
    }
    try {
      access = await api.getCustomerAccess(current.id);
      communities = await api.listCommunities(current.id);
      final selectable = selectableCommunities;
      if (selectable.isEmpty) {
        selectedCommunityId = null;
      } else if (selectedCommunityId == null ||
          selectable.every((row) => row.id != selectedCommunityId)) {
        selectedCommunityId = selectable.first.id;
      }
    } on ApiException {
      access = null;
      communities = const [];
      selectedCommunityId = null;
    }
  }

  Future<void> login({
    required String identifier,
    required String password,
  }) async {
    sessionEndedCode = null;
    await api.login(identifier: identifier, password: password);
    await restore();
  }

  Future<void> socialLogin({
    required String provider,
    required String idToken,
  }) async {
    sessionEndedCode = null;
    await api.socialLogin(provider: provider, idToken: idToken);
    await restore();
  }

  void expireLocalSession({String? code}) {
    profile = null;
    customers = const [];
    customer = null;
    access = null;
    communities = const [];
    selectedCommunityId = null;
    if (code != null) {
      sessionEndedCode = code;
    }
    notifyListeners();
  }

  Future<void> logout() async {
    await api.logout();
    expireLocalSession();
  }

  Future<void> selectCustomer(Customer next) async {
    customer = next;
    selectedCommunityId = null;
    await _loadTenantContext();
    notifyListeners();
  }

  void selectCommunity(String? communityId) {
    selectedCommunityId = communityId;
    notifyListeners();
  }

  Future<void> applyLocale(String locale) async {
    if (!isAuthenticated) {
      return;
    }
    profile = await api.updateMe(locale: locale);
    notifyListeners();
  }

  void clearSessionEndedCode() {
    sessionEndedCode = null;
    notifyListeners();
  }
}
