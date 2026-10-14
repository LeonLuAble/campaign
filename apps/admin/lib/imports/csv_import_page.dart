import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class CsvImportPage extends StatefulWidget {
  const CsvImportPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<CsvImportPage> createState() => _CsvImportPageState();
}

class _CsvImportPageState extends State<CsvImportPage> {
  UserImport? _import;
  UserImportPreview? _preview;
  List<UserImportRow> _rows = const [];
  final _emailColumn = TextEditingController(text: 'email');
  final _mobileColumn = TextEditingController(text: 'mobile');
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _emailColumn.dispose();
    _mobileColumn.dispose();
    super.dispose();
  }

  Future<void> _upload() async {
    final l10n = AppLocalizations.of(context);
    final picker = ApiScope.of(context).pickCsv;
    final file = picker == null ? null : await picker();
    if (file == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      final uploaded = await ApiScope.of(context).client.uploadUserImport(
        customerId: widget.customerId,
        filename: file.name,
        bytes: file.bytes,
      );
      setState(() {
        _import = uploaded;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _map() async {
    final current = _import;
    if (current == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      final mapped = await ApiScope.of(context).client.mapUserImport(
        current.id,
        mapping: {
          'email': _emailColumn.text.trim(),
          'mobile': _mobileColumn.text.trim(),
        },
      );
      setState(() => _import = mapped);
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _validate() async {
    final current = _import;
    if (current == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      final validated = await ApiScope.of(context).client.validateUserImport(
        current.id,
      );
      setState(() => _import = validated);
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _previewRows() async {
    final current = _import;
    if (current == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      final preview = await ApiScope.of(context).client.previewUserImport(
        current.id,
      );
      setState(() {
        _preview = preview;
        _import = preview.importRecord;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _confirm() async {
    final current = _import;
    if (current == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      final confirmed = await ApiScope.of(context).client.confirmUserImport(
        current.id,
      );
      final rows = await ApiScope.of(context).client.listUserImportRows(
        current.id,
      );
      setState(() {
        _import = confirmed;
        _rows = rows;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.importTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          FilledButton(
            onPressed: _busy ? null : _upload,
            child: Text(l10n.uploadCsv),
          ),
          if (_import != null) ...[
            const SizedBox(height: 12),
            Text(_import!.originalFilename),
            Text(_import!.status),
            TextField(
              controller: _emailColumn,
              decoration: InputDecoration(labelText: l10n.emailColumn),
            ),
            TextField(
              controller: _mobileColumn,
              decoration: InputDecoration(labelText: l10n.mobileColumn),
            ),
            OutlinedButton(
              onPressed: _busy ? null : _map,
              child: Text(l10n.mapFields),
            ),
            OutlinedButton(
              onPressed: _busy ? null : _validate,
              child: Text(l10n.validateImport),
            ),
            OutlinedButton(
              onPressed: _busy ? null : _previewRows,
              child: Text(l10n.previewImport),
            ),
            FilledButton(
              onPressed: _busy ? null : _confirm,
              child: Text(l10n.confirmImport),
            ),
          ],
          if (_preview != null)
            ..._preview!.rows.map(
              (row) => ListTile(
                title: Text(row.email ?? row.mobile ?? '${row.rowNumber}'),
                subtitle: Text(row.status),
              ),
            ),
          if (_rows.isNotEmpty) ...[
            Text(l10n.importResult, style: Theme.of(context).textTheme.titleMedium),
            ..._rows.map(
              (row) => ListTile(
                title: Text(row.email ?? row.mobile ?? '${row.rowNumber}'),
                subtitle: Text(row.status),
              ),
            ),
          ],
          if (_error != null) Text(_error!),
        ],
      ),
    );
  }
}
