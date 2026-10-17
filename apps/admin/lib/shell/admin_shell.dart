import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';
import '../locale/locale_scope.dart';
import '../session/api_scope.dart';
import '../session/session_controller.dart';
import 'nav_destinations.dart';

class AdminShell extends StatefulWidget {
  const AdminShell({
    required this.navigationShell,
    super.key,
  });

  final StatefulNavigationShell navigationShell;

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  String? _syncedCustomerId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final session = ApiScope.of(context).session;
    final location = GoRouterState.of(context).uri.path;
    final pathCustomer = _customerIdFromPath(location);
    if (pathCustomer != null &&
        pathCustomer != _syncedCustomerId &&
        pathCustomer != session.customer?.id &&
        session.customers.any((row) => row.id == pathCustomer)) {
      _syncedCustomerId = pathCustomer;
      final match =
          session.customers.firstWhere((row) => row.id == pathCustomer);
      session.selectCustomer(match);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final location = GoRouterState.of(context).uri.path;

    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final items = buildAdminNavItems(l10n, session);
        final selected = selectedNavIndex(location, items);
        final customerId = session.customer?.id ??
            (session.customers.isNotEmpty ? session.customers.first.id : null);

        return AppShell(
          destinations: [
            for (final item in items) item.toShellDestination(),
          ],
          selectedIndex: selected,
          onDestinationSelected: (index) {
            final dest = items[index];
            context.go(dest.locationBuilder(customerId));
          },
          skipToContentLabel: l10n.skipToContent,
          drawerHeader: Text(
            l10n.appTitle,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          title: _Breadcrumbs(location: location, session: session),
          actions: [
            _CustomerSwitcher(session: session, location: location),
            _LanguageToggle(session: session),
            _UserMenu(session: session),
            const SizedBox(width: 8),
          ],
          body: widget.navigationShell,
        );
      },
    );
  }

  String? _customerIdFromPath(String location) {
    final match = RegExp(r'^/customers/([^/]+)').firstMatch(location);
    return match?.group(1);
  }
}

class _Breadcrumbs extends StatelessWidget {
  const _Breadcrumbs({required this.location, required this.session});

  final String location;
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final crumbs = <String>[];
    if (location == '/' || location == '/customers') {
      crumbs.add(l10n.navCustomers);
    } else {
      final customerName = session.customer?.name ?? l10n.customersTitle;
      crumbs.add(customerName);
      if (location.contains('/people')) {
        crumbs.add(l10n.navPeople);
      } else if (location.contains('/communities')) {
        crumbs.add(l10n.navCommunities);
        if (location.contains('/dashboard')) {
          crumbs.add(l10n.communityDashboardTitle);
        }
      } else if (location.contains('/import')) {
        crumbs.add(l10n.navImports);
      } else if (location.contains('/reports') || location.contains('/report')) {
        crumbs.add(l10n.navReports);
      } else if (location.contains('/campaigns')) {
        crumbs.add(l10n.navCampaigns);
        if (location.contains('/participants')) {
          crumbs.add(l10n.participantsTitle);
        } else if (location.contains('/submissions')) {
          crumbs.add(l10n.submissionsTitle);
        } else if (location.contains('/impact-factors')) {
          crumbs.add(l10n.impactFactorsTitle);
        } else if (location.contains('/dashboard')) {
          crumbs.add(l10n.campaignDashboardTitle);
        } else if (location.endsWith('/new')) {
          crumbs.add(l10n.createCampaign);
        }
      } else if (RegExp(r'^/customers/[^/]+/?$').hasMatch(location)) {
        crumbs.add(l10n.navOverview);
      }
    }

    return Semantics(
      header: true,
      child: Wrap(
        spacing: 4,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          for (var i = 0; i < crumbs.length; i++) ...[
            if (i > 0)
              Icon(
                Icons.chevron_right,
                size: 16,
                color: Theme.of(context).colorScheme.outline,
              ),
            Text(
              crumbs[i],
              style: i == crumbs.length - 1
                  ? Theme.of(context).textTheme.titleMedium
                  : Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CustomerSwitcher extends StatelessWidget {
  const _CustomerSwitcher({
    required this.session,
    required this.location,
  });

  final SessionController session;
  final String location;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final customers = session.customers;
    final selected = session.customer;
    final onPlatform = location == '/' || location == '/customers';
    final showSwitcher = customers.length > 1 ||
        (session.isPlatformAdmin && customers.isNotEmpty);

    if (!showSwitcher) {
      if (selected == null || onPlatform) {
        return const SizedBox.shrink();
      }
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Center(child: Text(selected.name)),
      );
    }

    final value = onPlatform && session.isPlatformAdmin
        ? '__platform__'
        : selected?.id;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          hint: Text(l10n.selectCustomer),
          items: [
            if (session.isPlatformAdmin)
              DropdownMenuItem(
                value: '__platform__',
                child: Text(l10n.platformConsole),
              ),
            for (final customer in customers)
              DropdownMenuItem(
                value: customer.id,
                child: Text(customer.name),
              ),
          ],
          onChanged: (id) async {
            if (id == null) {
              return;
            }
            if (id == '__platform__') {
              context.go('/');
              return;
            }
            final match = customers.where((row) => row.id == id).firstOrNull;
            if (match != null) {
              await session.selectCustomer(match);
              if (context.mounted) {
                context.go('/customers/${match.id}');
              }
            }
          },
        ),
      ),
    );
  }
}

class _LanguageToggle extends StatelessWidget {
  const _LanguageToggle({required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final localeScope = LocaleScope.of(context);
    return PopupMenuButton<String>(
      tooltip: l10n.languageLabel,
      onSelected: (value) async {
        final locale = value == 'zh' ? AppLocales.zhHans : AppLocales.en;
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
    );
  }
}

class _UserMenu extends StatelessWidget {
  const _UserMenu({required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return PopupMenuButton<String>(
      tooltip: session.profile?.displayName ?? l10n.logout,
      onSelected: (value) {
        if (value == 'logout') {
          session.logout();
        }
        if (value == 'profile') {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(l10n.profileComingSoon)),
          );
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'profile',
          child: Text(l10n.userProfile),
        ),
        PopupMenuItem(
          value: 'logout',
          child: Text(l10n.logout),
        ),
      ],
      icon: const Icon(Icons.account_circle_outlined),
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
