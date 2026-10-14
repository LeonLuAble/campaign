import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class RecordActionPage extends StatefulWidget {
  const RecordActionPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<RecordActionPage> createState() => _RecordActionPageState();
}

class _RecordActionPageState extends State<RecordActionPage> {
  List<ActionDefinition> _definitions = const [];
  List<RecordedAction> _actions = const [];
  String? _participationId;
  String? _definitionId;
  final _quantity = TextEditingController(text: '1');
  String? _error;
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_participationId == null && _error == null) {
      _load();
    }
  }

  @override
  void dispose() {
    _quantity.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final client = ApiScope.of(context).client;
    final userId = ApiScope.of(context).session.profile?.id;
    try {
      final definitions = await client.listActionDefinitions(widget.campaignId);
      final rows = await client.listParticipations(widget.campaignId);
      final mine = rows.where((row) => row.userId == userId && row.isEnrolled);
      final participationId = mine.isEmpty ? null : mine.first.id;
      final actions = participationId == null
          ? <RecordedAction>[]
          : await client.listParticipationActions(participationId);
      setState(() {
        _definitions = definitions.where((row) => row.isActive).toList();
        _participationId = participationId;
        _actions = actions;
        _definitionId = _definitions.isEmpty ? null : _definitions.first.id;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    }
  }

  Future<void> _record() async {
    final l10n = AppLocalizations.of(context);
    final quantity = int.tryParse(_quantity.text.trim());
    if (quantity == null || quantity < 1) {
      setState(() => _error = l10n.quantityInvalid);
      return;
    }
    final participationId = _participationId;
    final definitionId = _definitionId;
    if (participationId == null || definitionId == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.recordAction(
        participationId: participationId,
        actionDefinitionId: definitionId,
        quantity: quantity,
        idempotencyKey: '${participationId}-${definitionId}-${DateTime.now().microsecondsSinceEpoch}',
      );
      await _load();
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _cancel(String actionId) async {
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.cancelAction(actionId);
      await _load();
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
      appBar: AppBar(title: Text(l10n.recordActionTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null) Text(_error!),
          ..._definitions.map(
            (definition) => RadioListTile<String>(
              title: Text(definition.name),
              subtitle: Text(definition.unit),
              value: definition.id,
              groupValue: _definitionId,
              onChanged: (value) => setState(() => _definitionId = value),
            ),
          ),
          TextField(
            controller: _quantity,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: l10n.quantityLabel),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _record,
            child: Text(l10n.recordButton),
          ),
          const SizedBox(height: 24),
          ..._actions.map(
            (action) => ListTile(
              title: Text('${action.occurredOn} · ${formatNumber(action.quantity)}'),
              subtitle: Text(action.status),
              trailing: action.isCancelled
                  ? null
                  : TextButton(
                      onPressed: _busy ? null : () => _cancel(action.id),
                      child: Text(l10n.cancelAction),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
