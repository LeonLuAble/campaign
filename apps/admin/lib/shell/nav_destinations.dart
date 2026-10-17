import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/session_controller.dart';

/// Stable ids for shell destinations (also used as StatefulShell branch keys).
abstract final class AdminNavId {
  static const platform = 'platform';
  static const overview = 'overview';
  static const people = 'people';
  static const communities = 'communities';
  static const campaigns = 'campaigns';
  static const imports = 'imports';
  static const reports = 'reports';
}

class AdminNavItem {
  const AdminNavItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.locationBuilder,
    this.requiredPermissions = const [],
    this.platformAdminOnly = false,
  });

  final String id;
  final String label;
  final IconData icon;
  final String Function(String? customerId) locationBuilder;
  final List<String> requiredPermissions;
  final bool platformAdminOnly;

  AppShellDestination toShellDestination() => AppShellDestination(
        id: id,
        label: label,
        icon: icon,
      );
}

List<AdminNavItem> buildAdminNavItems(
  AppLocalizations l10n,
  SessionController session,
) {
  final items = <AdminNavItem>[];
  if (session.isPlatformAdmin) {
    items.add(
      AdminNavItem(
        id: AdminNavId.platform,
        label: l10n.navCustomers,
        icon: Icons.apartment_outlined,
        locationBuilder: (_) => '/platform/customers',
        platformAdminOnly: true,
      ),
    );
  }

  final hasCustomer =
      session.customer != null || session.customers.isNotEmpty;
  if (!hasCustomer) {
    return items;
  }

  void addTenant({
    required String id,
    required String label,
    required IconData icon,
    required String Function(String customerId) path,
    required List<String> permissions,
  }) {
    // Hide once access is known and the caller lacks any required key.
    if (session.access != null && !session.hasAnyPermission(permissions)) {
      return;
    }
    items.add(
      AdminNavItem(
        id: id,
        label: label,
        icon: icon,
        locationBuilder: (customerId) {
          final idValue = customerId ??
              session.customer?.id ??
              session.customers.first.id;
          return path(idValue);
        },
        requiredPermissions: permissions,
      ),
    );
  }

  addTenant(
    id: AdminNavId.overview,
    label: l10n.navOverview,
    icon: Icons.dashboard_outlined,
    path: (id) => '/customers/$id',
    permissions: const ['customers.read', 'campaigns.read', 'communities.read'],
  );
  addTenant(
    id: AdminNavId.people,
    label: l10n.navPeople,
    icon: Icons.people_outline,
    path: (id) => '/customers/$id/people',
    permissions: const ['memberships.read'],
  );
  addTenant(
    id: AdminNavId.communities,
    label: l10n.navCommunities,
    icon: Icons.account_tree_outlined,
    path: (id) => '/customers/$id/communities',
    permissions: const ['communities.read'],
  );
  addTenant(
    id: AdminNavId.campaigns,
    label: l10n.navCampaigns,
    icon: Icons.flag_outlined,
    path: (id) => '/customers/$id/campaigns',
    permissions: const ['campaigns.read'],
  );
  addTenant(
    id: AdminNavId.imports,
    label: l10n.navImports,
    icon: Icons.upload_file_outlined,
    path: (id) => '/customers/$id/import',
    permissions: const ['user_imports.read', 'user_imports.create'],
  );
  addTenant(
    id: AdminNavId.reports,
    label: l10n.navReports,
    icon: Icons.assessment_outlined,
    path: (id) => '/customers/$id/reports',
    permissions: const ['reports.read'],
  );

  return items;
}

int selectedNavIndex(String location, List<AdminNavItem> items) {
  String? id;
  if (location == '/' ||
      location == '/customers' ||
      location.startsWith('/platform/')) {
    id = AdminNavId.platform;
  } else if (location.contains('/people')) {
    id = AdminNavId.people;
  } else if (location.contains('/communities') &&
      !location.contains('/dashboard')) {
    id = AdminNavId.communities;
  } else if (location.contains('/import')) {
    id = AdminNavId.imports;
  } else if (location.contains('/report') || location.endsWith('/reports')) {
    id = AdminNavId.reports;
  } else if (location.contains('/campaigns')) {
    id = AdminNavId.campaigns;
  } else if (RegExp(r'^/customers/[^/]+/?$').hasMatch(location)) {
    id = AdminNavId.overview;
  }
  if (id == null) {
    return items.isEmpty ? 0 : 0;
  }
  final index = items.indexWhere((item) => item.id == id);
  return index < 0 ? 0 : index;
}
