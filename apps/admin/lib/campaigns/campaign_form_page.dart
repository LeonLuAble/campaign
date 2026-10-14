import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class CampaignFormPage extends StatefulWidget {
  const CampaignFormPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<CampaignFormPage> createState() => _CampaignFormPageState();
}

class _CampaignFormPageState extends State<CampaignFormPage> {
  List<CampaignTemplate> _templates = const [];
  List<CampaignScope> _scopes = const [];
  String? _templateId;
  String? _scopeId;
  final _name = TextEditingController();
  final _timezone = TextEditingController(text: 'Asia/Kuala_Lumpur');
  final _startsOn = TextEditingController();
  final _endsOn = TextEditingController();
  final _rulesStrategy = TextEditingController(text: 'vegetarian');
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
    _name.dispose();
    _timezone.dispose();
    _startsOn.dispose();
    _endsOn.dispose();
    _rulesStrategy.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final client = ApiScope.of(context).client;
    try {
      final templates = await client.listTemplates(widget.customerId);
      final scopes = await client.listScopes(widget.customerId);
      setState(() {
        _templates = templates;
        _scopes = scopes;
        _templateId = templates.isEmpty ? null : templates.first.id;
        _scopeId = scopes.isEmpty ? null : scopes.first.id;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = localizeApiError(AppLocalizations.of(context), error);
        _loading = false;
      });
    }
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    if (_name.text.trim().isEmpty || _templateId == null || _scopeId == null) {
      setState(() => _error = l10n.nameRequired);
      return;
    }
    try {
      final created = await ApiScope.of(context).client.createCampaign(
        customerId: widget.customerId,
        templateId: _templateId!,
        scopeId: _scopeId!,
        name: _name.text.trim(),
        timezone: _timezone.text.trim(),
        startsOn: _startsOn.text.trim().isEmpty ? null : _startsOn.text.trim(),
        endsOn: _endsOn.text.trim().isEmpty ? null : _endsOn.text.trim(),
        configuration: _rulesStrategy.text.trim().isEmpty
            ? null
            : {'rulesStrategy': _rulesStrategy.text.trim()},
      );
      if (mounted) {
        context.push(
          '/customers/${widget.customerId}/campaigns/${created.id}',
        );
      }
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.createCampaign)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                DropdownButtonFormField<String>(
                  // ignore: deprecated_member_use
                  value: _templateId,
                  decoration: InputDecoration(labelText: l10n.templateLabel),
                  items: _templates
                      .map(
                        (row) => DropdownMenuItem(
                          value: row.id,
                          child: Text(row.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _templateId = value),
                ),
                DropdownButtonFormField<String>(
                  // ignore: deprecated_member_use
                  value: _scopeId,
                  decoration: InputDecoration(labelText: l10n.scopeLabel),
                  items: _scopes
                      .map(
                        (row) => DropdownMenuItem(
                          value: row.id,
                          child: Text(row.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _scopeId = value),
                ),
                TextField(
                  controller: _name,
                  decoration: InputDecoration(labelText: l10n.campaignNameLabel),
                ),
                TextField(
                  controller: _timezone,
                  decoration: InputDecoration(labelText: l10n.timezoneLabel),
                ),
                TextField(
                  controller: _startsOn,
                  decoration: InputDecoration(labelText: l10n.startsOnLabel),
                ),
                TextField(
                  controller: _endsOn,
                  decoration: InputDecoration(labelText: l10n.endsOnLabel),
                ),
                TextField(
                  controller: _rulesStrategy,
                  decoration: InputDecoration(labelText: l10n.rulesStrategyLabel),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _create,
                  child: Text(l10n.createCampaign),
                ),
                if (_error != null) Text(_error!),
              ],
            ),
    );
  }
}
