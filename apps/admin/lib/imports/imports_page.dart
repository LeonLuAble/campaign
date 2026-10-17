import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

/// Import history with entry to the CSV wizard.
class ImportsPage extends StatefulWidget {
  const ImportsPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<ImportsPage> createState() => _ImportsPageState();
}

class _ImportsPageState extends State<ImportsPage> {
  List<UserImport> _imports = const [];
  String? _error;
  var _loading = true;

  bool get _canCreate =>
      ApiScope.of(context).session.hasPermission('user_imports.create');
  bool get _canRead =>
      ApiScope.of(context).session.hasPermission('user_imports.read');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!_canRead) {
      setState(() {
        _loading = false;
        _imports = const [];
      });
      return;
    }
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows =
          await ApiScope.of(context).client.listUserImports(widget.customerId);
      if (!mounted) {
        return;
      }
      setState(() {
        _imports = rows;
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

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'uploaded':
        return l10n.importStatusUploaded;
      case 'mapped':
        return l10n.importStatusMapped;
      case 'validated':
        return l10n.importStatusValidated;
      case 'confirmed':
        return l10n.importStatusConfirmed;
      case 'failed':
        return l10n.importStatusFailed;
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (!_canRead && !_canCreate) {
      return AdminPageBody(
        child: EmptyState(message: l10n.errorForbidden),
      );
    }

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.navImports,
            subtitle: l10n.importsSubtitle,
            actions: [
              if (_canCreate)
                FilledButton.icon(
                  onPressed: () => context.go(
                    '/customers/${widget.customerId}/import/new',
                  ),
                  icon: const Icon(Icons.upload_file_outlined),
                  label: Text(l10n.newImport),
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
          else if (_imports.isEmpty)
            Expanded(
              child: EmptyState(message: l10n.noImportsYet),
            )
          else
            Expanded(
              child: AppDataTable<UserImport>(
                columns: [
                  AppDataColumn(
                    id: 'file',
                    label: l10n.importColumnFile,
                  ),
                  AppDataColumn(
                    id: 'status',
                    label: l10n.importColumnStatus,
                  ),
                  AppDataColumn(
                    id: 'date',
                    label: l10n.importColumnDate,
                  ),
                  AppDataColumn(
                    id: 'counts',
                    label: l10n.importColumnCounts,
                  ),
                ],
                rows: _imports,
                emptyMessage: l10n.noImportsYet,
                cellsBuilder: (context, row) {
                  final counts = row.counts;
                  final errors = counts.invalid + counts.review;
                  return [
                    Text(row.originalFilename),
                    StatusChip(
                      label: _statusLabel(l10n, row.status),
                      icon: row.status == 'confirmed'
                          ? Icons.check_circle_outline
                          : Icons.hourglass_top,
                    ),
                    Text(row.createdAt?.split('T').first ?? '—'),
                    Text(
                      l10n.importCountsSummary(
                        counts.created,
                        counts.matched,
                        errors,
                      ),
                    ),
                  ];
                },
              ),
            ),
        ],
      ),
    );
  }
}
