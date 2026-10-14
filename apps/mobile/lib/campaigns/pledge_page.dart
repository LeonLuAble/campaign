import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class PledgePage extends StatefulWidget {
  const PledgePage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<PledgePage> createState() => _PledgePageState();
}

class _PledgePageState extends State<PledgePage> {
  CommitmentOptions? _options;
  String? _participationId;
  String? _selectedKey;
  final _target = TextEditingController();
  String? _unit;
  String? _error;
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_options == null) {
      _load();
    }
  }

  @override
  void dispose() {
    _target.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final client = ApiScope.of(context).client;
    final userId = ApiScope.of(context).session.profile?.id;
    try {
      final options = await client.getCommitmentOptions(widget.campaignId);
      final rows = await client.listParticipations(widget.campaignId);
      final mine = rows.where((row) => row.userId == userId && row.isEnrolled);
      setState(() {
        _options = options;
        _participationId = mine.isEmpty ? null : mine.first.id;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    }
  }

  String _choiceDetail(AppLocalizations l10n, CommitmentChoice choice) {
    final unit = choice.usesCampaignDuration
        ? l10n.usesCampaignDuration
        : choice.canonicalUnit;
    if (choice.suggestedTarget == null) {
      return unit;
    }
    return '$unit · ${formatNumber(choice.suggestedTarget!)}';
  }

  void _select(CommitmentChoice choice) {
    setState(() {
      _selectedKey = choice.key;
      _unit = choice.canonicalUnit;
      if (choice.suggestedTarget != null) {
        _target.text = formatNumber(choice.suggestedTarget!);
      }
    });
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    final target = int.tryParse(_target.text.trim());
    if (target == null || target < 1) {
      setState(() => _error = l10n.targetInvalid);
      return;
    }
    final participationId = _participationId;
    final unit = _unit;
    if (participationId == null || unit == null) {
      setState(() => _error = l10n.errorValidation);
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.createCommitment(
        participationId: participationId,
        typeKey: _selectedKey,
        targetValue: target,
        unit: unit,
      );
      if (mounted) {
        context.go('/campaigns/${widget.campaignId}');
      }
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final options = _options;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.pledgeTitle)),
      body: options == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Text(_error!),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(l10n.selectChoice),
                const SizedBox(height: 8),
                RadioGroup<String>(
                  groupValue: _selectedKey,
                  onChanged: (value) {
                    final match = options.choices.where(
                      (row) => row.key == value,
                    );
                    if (match.isNotEmpty) {
                      _select(match.first);
                    }
                  },
                  child: Column(
                    children: [
                      for (final choice in options.choices)
                        RadioListTile<String>(
                          title: Text(choice.name),
                          subtitle: Text(_choiceDetail(l10n, choice)),
                          value: choice.key,
                        ),
                    ],
                  ),
                ),
                if (options.choices.isEmpty)
                  TextField(
                    decoration: InputDecoration(labelText: l10n.unitLabel),
                    onChanged: (value) => _unit = value,
                  ),
                TextField(
                  controller: _target,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: l10n.targetValueLabel),
                ),
                if (_error != null) Text(_error!),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : _save,
                  child: Text(l10n.pledgeButton),
                ),
              ],
            ),
    );
  }
}
