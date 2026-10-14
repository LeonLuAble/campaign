import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class ImpactFactorsPage extends StatefulWidget {
  const ImpactFactorsPage({
    required this.customerId,
    required this.campaignId,
    super.key,
  });

  final String customerId;
  final String campaignId;

  @override
  State<ImpactFactorsPage> createState() => _ImpactFactorsPageState();
}

class _ImpactFactorsPageState extends State<ImpactFactorsPage> {
  List<ImpactFactor> _factors = const [];
  final _sourceUnit = TextEditingController(text: 'days');
  final _metric = TextEditingController(text: 'co2_kg');
  final _outcomeUnit = TextEditingController(text: 'kg');
  final _value = TextEditingController();
  final _source = TextEditingController();
  final _effectiveFrom = TextEditingController(text: '2026-01-01');
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
    _sourceUnit.dispose();
    _metric.dispose();
    _outcomeUnit.dispose();
    _value.dispose();
    _source.dispose();
    _effectiveFrom.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final rows = await ApiScope.of(context).client.listImpactFactors(
        customerId: widget.customerId,
        campaignId: widget.campaignId,
      );
      setState(() {
        _factors = rows;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = localizeApiError(AppLocalizations.of(context), error);
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    final factorValue = num.tryParse(_value.text.trim());
    if (factorValue == null || _source.text.trim().isEmpty) {
      setState(() => _error = AppLocalizations.of(context).errorValidation);
      return;
    }
    try {
      await ApiScope.of(context).client.createImpactFactor(
        customerId: widget.customerId,
        campaignId: widget.campaignId,
        sourceUnit: _sourceUnit.text.trim(),
        outcomeMetric: _metric.text.trim(),
        outcomeUnit: _outcomeUnit.text.trim(),
        factorValue: factorValue,
        source: _source.text.trim(),
        effectiveFrom: _effectiveFrom.text.trim(),
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
      appBar: AppBar(title: Text(l10n.impactFactorsTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ..._factors.map(
                  (row) => ListTile(
                    title: Text('${row.outcomeMetric}: ${formatNumber(row.factorValue)} ${row.outcomeUnit}'),
                    subtitle: Text(row.source),
                  ),
                ),
                TextField(
                  controller: _sourceUnit,
                  decoration: InputDecoration(labelText: l10n.sourceUnitLabel),
                ),
                TextField(
                  controller: _metric,
                  decoration: InputDecoration(labelText: l10n.outcomeMetricLabel),
                ),
                TextField(
                  controller: _outcomeUnit,
                  decoration: InputDecoration(labelText: l10n.outcomeUnitLabel),
                ),
                TextField(
                  controller: _value,
                  decoration: InputDecoration(labelText: l10n.factorValueLabel),
                ),
                TextField(
                  controller: _source,
                  decoration: InputDecoration(labelText: l10n.citationLabel),
                ),
                TextField(
                  controller: _effectiveFrom,
                  decoration: InputDecoration(labelText: l10n.effectiveFromLabel),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _save,
                  child: Text(l10n.saveImpactFactor),
                ),
                if (_error != null) Text(_error!),
              ],
            ),
    );
  }
}
