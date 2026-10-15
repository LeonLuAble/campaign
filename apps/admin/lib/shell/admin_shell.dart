import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';
import '../locale/locale_scope.dart';
import '../session/api_scope.dart';
import '../session/session_controller.dart';

const double adminShellBreakpoint = 900;

enum AdminSection { customers, communities, campaigns, imports, reports }

class AdminShell extends StatelessWidget {
  const AdminShell({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= adminShellBreakpoint;
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final location = GoRouterState.of(context).uri.path;
    final destinations = _destinations(l10n, session);
    final selected = _selectedIndex(location, destinations, session);
    final railIndex = destinations.isEmpty
        ? 0
        : selected.clamp(0, destinations.length - 1);

    if (wide) {
      return Scaffold(
        appBar: _TopBar(session: session),
        body: Row(
          children: [
            if (destinations.isNotEmpty)
              NavigationRail(
                selectedIndex: railIndex,
                labelType: NavigationRailLabelType.all,
                onDestinationSelected: (index) =>
                    _go(context, destinations[index], session),
                destinations: [
                  for (final dest in destinations)
                    NavigationRailDestination(
                      icon: Icon(dest.icon),
                      label: Text(dest.label),
                    ),
                ],
              ),
            if (destinations.isNotEmpty) const VerticalDivider(width: 1),
            Expanded(child: child),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: _TopBar(session: session),
      drawer: destinations.isEmpty
          ? null
          : Drawer(
              child: SafeArea(
                child: ListView(
                  children: [
                    DrawerHeader(
                      child: Text(
                        l10n.appTitle,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    for (var i = 0; i < destinations.length; i++)
                      ListTile(
                        leading: Icon(destinations[i].icon),
                        title: Text(destinations[i].label),
                        selected: i == railIndex,
                        onTap: () {
                          Navigator.of(context).pop();
                          _go(context, destinations[i], session);
                        },
                      ),
                  ],
                ),
              ),
            ),
      body: child,
    );
  }

  List<_NavDest> _destinations(AppLocalizations l10n, SessionController session) {
    final items = <_NavDest>[];
    if (session.isPlatformAdmin) {
      items.add(
        _NavDest(
          section: AdminSection.customers,
          label: l10n.navCustomers,
          icon: Icons.apartment_outlined,
        ),
      );
    }
    if (session.customer != null || session.customers.isNotEmpty) {
      items.addAll([
        _NavDest(
          section: AdminSection.communities,
          label: l10n.navCommunities,
          icon: Icons.account_tree_outlined,
        ),
        _NavDest(
          section: AdminSection.campaigns,
          label: l10n.navCampaigns,
          icon: Icons.flag_outlined,
        ),
        _NavDest(
          section: AdminSection.imports,
          label: l10n.navImports,
          icon: Icons.upload_file_outlined,
        ),
        _NavDest(
          section: AdminSection.reports,
          label: l10n.navReports,
          icon: Icons.assessment_outlined,
        ),
      ]);
    }
    return items;
  }

  int _selectedIndex(
    String location,
    List<_NavDest> destinations,
    SessionController session,
  ) {
    AdminSection? section;
    if (location == '/' || location == '/customers') {
      section = AdminSection.customers;
    } else if (location.contains('/communities') &&
        !location.contains('/dashboard')) {
      section = AdminSection.communities;
    } else if (location.contains('/import')) {
      section = AdminSection.imports;
    } else if (location.contains('/report') || location.endsWith('/reports')) {
      section = AdminSection.reports;
    } else if (location.contains('/campaigns')) {
      section = AdminSection.campaigns;
    } else if (location.startsWith('/customers/') &&
        session.isPlatformAdmin &&
        !location.contains('/communities') &&
        !location.contains('/campaigns') &&
        !location.contains('/import')) {
      section = AdminSection.customers;
    }
    if (section == null) {
      return destinations.isEmpty ? -1 : 0;
    }
    return destinations.indexWhere((d) => d.section == section);
  }

  void _go(BuildContext context, _NavDest dest, SessionController session) {
    final customerId = session.customer?.id ??
        (session.customers.isNotEmpty ? session.customers.first.id : null);
    switch (dest.section) {
      case AdminSection.customers:
        context.go('/');
      case AdminSection.communities:
        if (customerId != null) {
          context.go('/customers/$customerId/communities');
        }
      case AdminSection.campaigns:
        if (customerId != null) {
          context.go('/customers/$customerId/campaigns');
        }
      case AdminSection.imports:
        if (customerId != null) {
          context.go('/customers/$customerId/import');
        }
      case AdminSection.reports:
        if (customerId != null) {
          context.go('/customers/$customerId/reports');
        }
    }
  }
}

class _NavDest {
  const _NavDest({
    required this.section,
    required this.label,
    required this.icon,
  });

  final AdminSection section;
  final String label;
  final IconData icon;
}

class _TopBar extends StatelessWidget implements PreferredSizeWidget {
  const _TopBar({required this.session});

  final SessionController session;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final localeScope = LocaleScope.of(context);
    final customers = session.customers;
    final selected = session.customer;

    return AppBar(
      title: Text(l10n.appTitle),
      actions: [
        if (customers.length > 1 || session.isPlatformAdmin)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: selected?.id,
                hint: Text(l10n.selectCustomer),
                items: [
                  for (final customer in customers)
                    DropdownMenuItem(
                      value: customer.id,
                      child: Text(customer.name),
                    ),
                ],
                onChanged: customers.isEmpty
                    ? null
                    : (id) {
                        if (id == null) {
                          return;
                        }
                        final match =
                            customers.where((row) => row.id == id).firstOrNull;
                        if (match != null) {
                          session.selectCustomer(match);
                          context.go('/customers/${match.id}/campaigns');
                        }
                      },
              ),
            ),
          )
        else if (selected != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Center(child: Text(selected.name)),
          ),
        PopupMenuButton<String>(
          tooltip: l10n.languageLabel,
          onSelected: (value) async {
            final locale =
                value == 'zh' ? AppLocales.zhHans : AppLocales.en;
            localeScope.onLocaleChanged(locale);
            await session.applyLocale(AppLocales.toApi(locale));
          },
          itemBuilder: (context) => [
            PopupMenuItem(value: 'en', child: Text(l10n.languageEnglish)),
            PopupMenuItem(value: 'zh', child: Text(l10n.languageChinese)),
          ],
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                const Icon(Icons.language),
                const SizedBox(width: 4),
                Text(l10n.languageLabel),
              ],
            ),
          ),
        ),
        PopupMenuButton<String>(
          onSelected: (value) {
            if (value == 'logout') {
              session.logout();
            }
          },
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'logout',
              child: Text(l10n.logout),
            ),
          ],
          icon: const Icon(Icons.account_circle_outlined),
        ),
        const SizedBox(width: 8),
      ],
    );
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
