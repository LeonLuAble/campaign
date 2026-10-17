import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

class PlatformCustomersPage extends StatefulWidget {
  const PlatformCustomersPage({super.key});

  @override
  State<PlatformCustomersPage> createState() => _PlatformCustomersPageState();
}

class _PlatformCustomersPageState extends State<PlatformCustomersPage> {
  final _search = TextEditingController();
  List<PlatformCustomerSummary>? _rows;
  String? _error;
  var _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    if (!session.isPlatformAdmin) {
      setState(() {
        _loading = false;
        _error = l10n.errorForbidden;
        _rows = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows =
          await ApiScope.of(context).client.listPlatformCustomers();
      if (!mounted) {
        return;
      }
      setState(() {
        _rows = rows;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = localizeApiError(l10n, error);
        _rows = null;
      });
    }
  }

  List<PlatformCustomerSummary> get _filtered {
    final rows = _rows ?? const <PlatformCustomerSummary>[];
    final q = _search.text.trim().toLowerCase();
    if (q.isEmpty) {
      return rows;
    }
    return [
      for (final row in rows)
        if (row.name.toLowerCase().contains(q) ||
            row.slug.toLowerCase().contains(q))
          row,
    ];
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) {
      return '—';
    }
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) {
      return iso;
    }
    final local = parsed.toLocal();
    final y = local.year.toString().padLeft(4, '0');
    final m = local.month.toString().padLeft(2, '0');
    final d = local.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final theme = Theme.of(context);

    if (!session.isPlatformAdmin) {
      return AdminPageBody(
        child: ErrorState(
          message: l10n.errorForbidden,
          retryLabel: l10n.retry,
        ),
      );
    }

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.platformCustomersTitle,
            subtitle: l10n.platformCustomersSubtitle,
            actions: [
              FilledButton.icon(
                onPressed: () => context.go('/platform/customers/new'),
                icon: const Icon(Icons.add),
                label: Text(l10n.createCustomer),
              ),
            ],
          ),
          TextField(
            controller: _search,
            decoration: InputDecoration(
              labelText: l10n.searchCustomers,
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          Expanded(child: _buildBody(l10n, theme)),
        ],
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n, ThemeData theme) {
    if (_loading) {
      return const AdminLoadingState();
    }
    if (_error != null) {
      return ErrorState(
        message: _error!,
        retryLabel: l10n.retry,
        onRetry: _load,
      );
    }
    final rows = _filtered;
    if (rows.isEmpty) {
      return EmptyState(
        message: _search.text.trim().isEmpty
            ? l10n.noPlatformCustomers
            : l10n.noSearchResults,
        action: _search.text.trim().isEmpty
            ? FilledButton(
                onPressed: () => context.go('/platform/customers/new'),
                child: Text(l10n.createCustomer),
              )
            : null,
      );
    }

    return ListView.separated(
      itemCount: rows.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final row = rows[index];
        final statusLabel =
            row.isActive ? l10n.statusActive : l10n.statusInactive;
        return ListTile(
          title: Text(row.name),
          subtitle: Text(
            [
              row.slug,
              statusLabel,
              _formatDate(row.createdAt),
              '${l10n.adminCountLabel}: ${row.adminCount}',
              '${l10n.pendingInvitesLabel}: ${row.pendingAdminInvites}',
            ].join(' · '),
          ),
          trailing: StatusChip(
            label: statusLabel,
            icon: row.isActive
                ? Icons.check_circle_outline
                : Icons.pause_circle_outline,
            color: row.isActive
                ? theme.colorScheme.primary
                : theme.colorScheme.outline,
            backgroundColor: row.isActive
                ? theme.colorScheme.primaryContainer
                : theme.colorScheme.surfaceContainerHighest,
          ),
          onTap: () => context.go('/platform/customers/${row.id}'),
        );
      },
    );
  }
}
