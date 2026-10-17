import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

class RolesPage extends StatefulWidget {
  const RolesPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<RolesPage> createState() => _RolesPageState();
}

class _RolesPageState extends State<RolesPage> {
  List<Role> _roles = const [];
  String? _error;
  var _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final roles =
          await ApiScope.of(context).client.listRoles(widget.customerId);
      if (!mounted) {
        return;
      }
      setState(() {
        _roles = roles;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.navRoles,
            subtitle: l10n.rolesSubtitle,
            actions: [
              OutlinedButton.icon(
                onPressed: () =>
                    context.go('/customers/${widget.customerId}/people'),
                icon: const Icon(Icons.arrow_back),
                label: Text(l10n.backToPeople),
              ),
            ],
          ),
          if (_loading)
            const Expanded(child: LoadingSkeleton(lines: 5))
          else if (_error != null)
            Expanded(
              child: ErrorState(
                message: _error!,
                retryLabel: l10n.retry,
                onRetry: _load,
              ),
            )
          else if (_roles.isEmpty)
            Expanded(child: EmptyState(message: l10n.noRoles))
          else
            Expanded(
              child: ListView.separated(
                itemCount: _roles.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final role = _roles[index];
                  return Card(
                    child: ExpansionTile(
                      title: Text(role.name),
                      subtitle: Text(
                        [
                          role.key,
                          if (role.isSystem) l10n.systemRoleBadge,
                        ].join(' · '),
                      ),
                      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      children: [
                        if (role.description != null &&
                            role.description!.trim().isNotEmpty)
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(role.description!),
                            ),
                          ),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            l10n.rolePermissionsHeading,
                            style: theme.textTheme.titleSmall,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final key in role.permissionKeys)
                              Chip(label: Text(key)),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
