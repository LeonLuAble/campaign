import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class SubmissionsPage extends StatefulWidget {
  const SubmissionsPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<SubmissionsPage> createState() => _SubmissionsPageState();
}

class _SubmissionsPageState extends State<SubmissionsPage> {
  List<RecordedAction> _actions = const [];
  final _note = TextEditingController();
  String? _error;
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading) {
      _load();
    }
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final rows = await ApiScope.of(context).client.listCampaignActions(
        widget.campaignId,
      );
      setState(() {
        _actions = rows;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = localizeApiError(AppLocalizations.of(context), error);
        _loading = false;
      });
    }
  }

  Future<void> _reject(RecordedAction action) async {
    final submission = action.submission;
    if (submission == null) {
      return;
    }
    try {
      await ApiScope.of(context).client.rejectSubmission(
        submission.id,
        note: _note.text.trim().isEmpty ? null : _note.text.trim(),
      );
      await _load();
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.submissionsTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  controller: _note,
                  decoration: InputDecoration(labelText: l10n.rejectNoteLabel),
                ),
                if (_error != null) Text(_error!),
                ..._actions.map(
                  (action) => ListTile(
                    title: Text('${action.occurredOn} · ${action.status}'),
                    subtitle: Text(action.submission?.status ?? ''),
                    trailing: action.submission == null
                        ? null
                        : TextButton(
                            onPressed: () => _reject(action),
                            child: Text(l10n.rejectSubmission),
                          ),
                  ),
                ),
              ],
            ),
    );
  }
}
