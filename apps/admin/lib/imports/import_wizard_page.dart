import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../people/community_picker_field.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';
import 'download_csv.dart';
import 'import_mapping.dart';

class ImportWizardPage extends StatefulWidget {
  const ImportWizardPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<ImportWizardPage> createState() => _ImportWizardPageState();
}

class _ImportWizardPageState extends State<ImportWizardPage> {
  static const _stepUpload = 0;
  static const _stepMap = 1;
  static const _stepValidate = 2;
  static const _stepPreview = 3;
  static const _stepConfirm = 4;

  var _step = _stepUpload;
  var _busy = false;
  var _confirmed = false;
  String? _error;
  String? _fileError;

  String? _pickedName;
  List<int>? _pickedBytes;
  String? _defaultCommunityId;
  List<Community> _communities = const [];

  UserImport? _import;
  Map<String, String> _mapping = {};
  List<UserImportRow> _rows = const [];

  bool get _canCreate =>
      ApiScope.of(context).session.hasPermission('user_imports.create');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCommunities());
  }

  Future<void> _loadCommunities() async {
    try {
      final rows =
          await ApiScope.of(context).client.listCommunities(widget.customerId);
      if (!mounted) {
        return;
      }
      setState(() => _communities = rows);
    } catch (_) {
      // Optional for upload; mapping still works without picker.
    }
  }

  List<String> get _steps {
    final l10n = AppLocalizations.of(context);
    return [
      l10n.importStepUpload,
      l10n.importStepMap,
      l10n.importStepValidate,
      l10n.importStepPreview,
      l10n.importStepConfirm,
    ];
  }

  Future<void> _downloadTemplate() async {
    downloadTextFile(
      filename: 'user-import-template.csv',
      content: importTemplateCsv,
    );
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context).templateDownloaded)),
    );
  }

  Future<void> _pickFile() async {
    final l10n = AppLocalizations.of(context);
    final picker = ApiScope.of(context).pickCsv;
    if (picker == null) {
      setState(() => _fileError = l10n.importPickerUnavailable);
      return;
    }
    final file = await picker();
    if (file == null) {
      return;
    }
    if (!looksLikeCsvFilename(file.name)) {
      setState(() {
        _pickedName = null;
        _pickedBytes = null;
        _fileError = l10n.importBadFileType;
      });
      return;
    }
    if (isEmptyCsvBytes(file.bytes)) {
      setState(() {
        _pickedName = null;
        _pickedBytes = null;
        _fileError = l10n.importEmptyFile;
      });
      return;
    }
    final headers = parseCsvHeaders(file.bytes);
    if (headers.isEmpty) {
      setState(() {
        _pickedName = null;
        _pickedBytes = null;
        _fileError = l10n.importEmptyFile;
      });
      return;
    }
    setState(() {
      _pickedName = file.name;
      _pickedBytes = file.bytes;
      _fileError = null;
      _error = null;
    });
  }

  Future<void> _uploadAndAdvance() async {
    final l10n = AppLocalizations.of(context);
    final bytes = _pickedBytes;
    final name = _pickedName;
    if (bytes == null || name == null) {
      setState(() => _fileError = l10n.importFileRequired);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final uploaded = await ApiScope.of(context).client.uploadUserImport(
            customerId: widget.customerId,
            filename: name,
            bytes: bytes,
            communityId: _defaultCommunityId,
          );
      final suggested = detectCanonicalMapping(uploaded.headers);
      if (!mounted) {
        return;
      }
      if (!mappingCoversIdentifier(suggested) &&
          !uploaded.headers.any((h) {
            final n = normalizeImportHeader(h);
            return n == 'email' || n == 'mobile';
          })) {
        // Still allow mapping step so user can map oddly named columns.
      }
      setState(() {
        _import = uploaded;
        _mapping = suggested;
        _busy = false;
        _step = _stepMap;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  Future<void> _saveMappingAndValidate() async {
    final l10n = AppLocalizations.of(context);
    final current = _import;
    if (current == null) {
      return;
    }
    final cleaned = <String, String>{
      for (final entry in _mapping.entries)
        if (entry.value.trim().isNotEmpty) entry.key: entry.value.trim(),
    };
    if (!mappingCoversIdentifier(cleaned)) {
      setState(() => _error = l10n.importMissingRequiredColumns);
      return;
    }
    final client = ApiScope.of(context).client;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final mapped = await client.mapUserImport(
        current.id,
        mapping: cleaned,
      );
      final validated = await client.validateUserImport(mapped.id);
      final preview = await client.previewUserImport(validated.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _import = preview.importRecord;
        _rows = preview.rows;
        _mapping = cleaned;
        _busy = false;
        _step = _stepValidate;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  Future<void> _confirmImport() async {
    final l10n = AppLocalizations.of(context);
    final current = _import;
    if (current == null || _confirmed || _busy) {
      return;
    }
    final client = ApiScope.of(context).client;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final confirmed = await client.confirmUserImport(current.id);
      final rows = await client.listUserImportRows(current.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _import = confirmed;
        _rows = rows;
        _busy = false;
        _confirmed = true;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  void _downloadErrors() {
    final l10n = AppLocalizations.of(context);
    final problemRows = _rows
        .where((row) => row.status == 'invalid' || row.status == 'review')
        .toList();
    final buffer = StringBuffer('row_number,status,error_code,error_message,email,mobile\n');
    for (final row in problemRows) {
      buffer.writeln(
        [
          row.rowNumber,
          row.status,
          _csvEscape(row.errorCode ?? ''),
          _csvEscape(row.errorMessage ?? ''),
          _csvEscape(row.email ?? ''),
          _csvEscape(row.mobile ?? ''),
        ].join(','),
      );
    }
    downloadTextFile(
      filename: 'import-errors-${_import?.id ?? 'rows'}.csv',
      content: buffer.toString(),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.errorCsvDownloaded)),
    );
  }

  String _csvEscape(String value) {
    if (value.contains(',') || value.contains('"') || value.contains('\n')) {
      return '"${value.replaceAll('"', '""')}"';
    }
    return value;
  }

  Future<void> _onNext() async {
    switch (_step) {
      case _stepUpload:
        await _uploadAndAdvance();
      case _stepMap:
        await _saveMappingAndValidate();
      case _stepValidate:
        setState(() => _step = _stepPreview);
      case _stepPreview:
        setState(() => _step = _stepConfirm);
      case _stepConfirm:
        await _confirmImport();
    }
  }

  void _onBack() {
    if (_busy || _confirmed) {
      return;
    }
    if (_step <= _stepUpload) {
      context.go('/customers/${widget.customerId}/import');
      return;
    }
    setState(() {
      _error = null;
      if (_step == _stepValidate) {
        _step = _stepMap;
      } else {
        _step -= 1;
      }
    });
  }

  String _nextLabel(AppLocalizations l10n) {
    switch (_step) {
      case _stepUpload:
        return l10n.wizardNext;
      case _stepMap:
        return l10n.validateImport;
      case _stepValidate:
        return l10n.previewImport;
      case _stepPreview:
        return l10n.wizardNext;
      case _stepConfirm:
        return l10n.confirmImport;
      default:
        return l10n.wizardNext;
    }
  }

  bool get _nextEnabled {
    if (_busy || _confirmed) {
      return false;
    }
    switch (_step) {
      case _stepUpload:
        return _pickedBytes != null && _fileError == null;
      case _stepMap:
        return mappingCoversIdentifier(_mapping);
      case _stepConfirm:
        return !_confirmed;
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (!_canCreate) {
      return AdminPageBody(
        child: EmptyState(message: l10n.errorForbidden),
      );
    }

    if (_confirmed && _import != null) {
      return AdminPageBody(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: _ResultBody(
                importRecord: _import!,
                rows: _rows,
                onDownloadErrors: _downloadErrors,
                onDone: () =>
                    context.go('/customers/${widget.customerId}/import'),
              ),
            ),
          ],
        ),
      );
    }

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.newImport,
            subtitle: l10n.importWizardSubtitle,
            actions: [
              OutlinedButton(
                onPressed: _busy
                    ? null
                    : () =>
                        context.go('/customers/${widget.customerId}/import'),
                child: Text(l10n.backToImports),
              ),
            ],
          ),
          Expanded(
            child: WizardStepper(
              steps: _steps,
              currentStep: _step,
              nextLabel: _nextLabel(l10n),
              backLabel: l10n.wizardBack,
              onBack: _onBack,
              onNext: _onNext,
              nextEnabled: _nextEnabled,
              busy: _busy,
              body: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_error != null) ...[
                      Text(
                        _error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    switch (_step) {
                      _stepUpload => _UploadStep(
                          fileName: _pickedName,
                          fileError: _fileError,
                          communityId: _defaultCommunityId,
                          communities: _communities,
                          onPick: _pickFile,
                          onDownloadTemplate: _downloadTemplate,
                          onCommunityChanged: (id) =>
                              setState(() => _defaultCommunityId = id),
                        ),
                      _stepMap => _MapStep(
                          headers: _import?.headers ?? const [],
                          mapping: _mapping,
                          missingRequired: !mappingCoversIdentifier(_mapping),
                          onChanged: (field, header) {
                            setState(() {
                              _error = null;
                              if (header == null || header.isEmpty) {
                                _mapping.remove(field);
                              } else {
                                _mapping[field] = header;
                              }
                            });
                          },
                        ),
                      _stepValidate => _RowsStep(
                          title: l10n.importValidateHeading,
                          counts: _import?.counts,
                          rows: _rows
                              .where(
                                (row) =>
                                    row.status == 'invalid' ||
                                    row.status == 'review',
                              )
                              .toList(),
                          emptyMessage: l10n.importNoProblemRows,
                          showReviewNote: true,
                        ),
                      _stepPreview => _RowsStep(
                          title: l10n.importPreviewHeading,
                          counts: _import?.counts,
                          rows: _rows,
                          emptyMessage: l10n.importNoRows,
                          showReviewNote: true,
                        ),
                      _ => _ConfirmStep(counts: _import?.counts),
                    },
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UploadStep extends StatelessWidget {
  const _UploadStep({
    required this.fileName,
    required this.fileError,
    required this.communityId,
    required this.communities,
    required this.onPick,
    required this.onDownloadTemplate,
    required this.onCommunityChanged,
  });

  final String? fileName;
  final String? fileError;
  final String? communityId;
  final List<Community> communities;
  final VoidCallback onPick;
  final VoidCallback onDownloadTemplate;
  final ValueChanged<String?> onCommunityChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.importUploadHint),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed: onDownloadTemplate,
              icon: const Icon(Icons.download_outlined),
              label: Text(l10n.downloadImportTemplate),
            ),
            FilledButton.tonalIcon(
              onPressed: onPick,
              icon: const Icon(Icons.upload_file_outlined),
              label: Text(l10n.uploadCsv),
            ),
          ],
        ),
        if (fileName != null) ...[
          const SizedBox(height: 12),
          Text(l10n.importSelectedFile(fileName!)),
        ],
        if (fileError != null) ...[
          const SizedBox(height: 8),
          Text(
            fileError!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        const SizedBox(height: 16),
        CommunityPickerField(
          communities: communities,
          value: communityId,
          label: l10n.importDefaultCommunity,
          allowClear: true,
          onChanged: onCommunityChanged,
        ),
      ],
    );
  }
}

class _MapStep extends StatelessWidget {
  const _MapStep({
    required this.headers,
    required this.mapping,
    required this.onChanged,
    required this.missingRequired,
  });

  final List<String> headers;
  final Map<String, String> mapping;
  final void Function(String field, String? header) onChanged;
  final bool missingRequired;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    String labelFor(String field) {
      switch (field) {
        case 'email':
          return l10n.canonicalEmail;
        case 'mobile':
          return l10n.canonicalMobile;
        case 'externalId':
          return l10n.canonicalExternalId;
        case 'firstName':
          return l10n.canonicalFirstName;
        case 'lastName':
          return l10n.canonicalLastName;
        case 'displayName':
          return l10n.canonicalDisplayName;
        case 'communityId':
          return l10n.canonicalCommunityId;
        case 'communityPath':
          return l10n.canonicalCommunityPath;
        default:
          return field;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.importMapHint),
        if (missingRequired) ...[
          const SizedBox(height: 8),
          Text(
            l10n.importMissingRequiredColumns,
            style: TextStyle(color: theme.colorScheme.error),
          ),
        ],
        const SizedBox(height: 12),
        for (final field in canonicalImportFields) ...[
          DropdownButtonFormField<String?>(
            isExpanded: true,
            // ignore: deprecated_member_use
            value: mapping[field],
            decoration: InputDecoration(
              labelText: labelFor(field),
              border: const OutlineInputBorder(),
            ),
            items: [
              DropdownMenuItem(
                value: null,
                child: Text(l10n.mappingUnmapped),
              ),
              for (final header in headers)
                DropdownMenuItem(
                  value: header,
                  child: Text(header, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (value) => onChanged(field, value),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _RowsStep extends StatelessWidget {
  const _RowsStep({
    required this.title,
    required this.rows,
    required this.emptyMessage,
    required this.showReviewNote,
    this.counts,
  });

  final String title;
  final UserImportCounts? counts;
  final List<UserImportRow> rows;
  final String emptyMessage;
  final bool showReviewNote;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final reviewRows =
        rows.where((row) => row.status == 'review').toList(growable: false);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: theme.textTheme.titleMedium),
        if (counts != null) ...[
          const SizedBox(height: 8),
          Text(
            l10n.importValidateSummary(
              counts!.valid,
              counts!.invalid,
              counts!.review,
            ),
          ),
        ],
        if (showReviewNote && reviewRows.isNotEmpty) ...[
          const SizedBox(height: 12),
          Material(
            color: theme.colorScheme.secondaryContainer,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(l10n.importReviewInstruction),
            ),
          ),
        ],
        const SizedBox(height: 12),
        if (rows.isEmpty)
          Text(emptyMessage)
        else
          ...rows.map(
            (row) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                l10n.importRowTitle(
                  row.rowNumber,
                  row.email ?? row.mobile ?? '—',
                ),
              ),
              subtitle: Text(
                [
                  row.status,
                  if (row.errorCode != null) row.errorCode!,
                  if (row.errorMessage != null) row.errorMessage!,
                ].join(' · '),
              ),
            ),
          ),
      ],
    );
  }
}

class _ConfirmStep extends StatelessWidget {
  const _ConfirmStep({this.counts});

  final UserImportCounts? counts;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final c = counts;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.importConfirmHint),
        if (c != null) ...[
          const SizedBox(height: 12),
          Text(
            l10n.importConfirmSummary(
              c.valid,
              c.invalid + c.review,
            ),
          ),
        ],
      ],
    );
  }
}

class _ResultBody extends StatelessWidget {
  const _ResultBody({
    required this.importRecord,
    required this.rows,
    required this.onDownloadErrors,
    required this.onDone,
  });

  final UserImport importRecord;
  final List<UserImportRow> rows;
  final VoidCallback onDownloadErrors;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final counts = importRecord.counts;
    final problemRows = rows
        .where((row) => row.status == 'invalid' || row.status == 'review')
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AdminPageHeader(title: l10n.importResult),
        Text(
          l10n.importResultSummary(
            counts.created,
            counts.matched,
            counts.invalid + counts.review,
          ),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 16),
        if (problemRows.isNotEmpty) ...[
          Text(l10n.importReviewInstruction),
          const SizedBox(height: 8),
          ...problemRows.map(
            (row) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                l10n.importRowTitle(
                  row.rowNumber,
                  row.email ?? row.mobile ?? '—',
                ),
              ),
              subtitle: Text(row.errorMessage ?? row.errorCode ?? row.status),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: onDownloadErrors,
            icon: const Icon(Icons.download_outlined),
            label: Text(l10n.downloadErrorCsv),
          ),
        ],
        const Spacer(),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton(
            onPressed: onDone,
            child: Text(l10n.backToImports),
          ),
        ),
      ],
    );
  }
}
