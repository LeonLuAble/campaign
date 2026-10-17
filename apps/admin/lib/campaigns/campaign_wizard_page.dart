import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';
import 'campaign_dates.dart';
import 'community_multi_picker.dart';

class _DraftActionDefinition {
  _DraftActionDefinition({
    required this.key,
    required this.name,
    required this.unit,
  });

  String key;
  String name;
  String unit;
}

class CampaignWizardPage extends StatefulWidget {
  const CampaignWizardPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<CampaignWizardPage> createState() => _CampaignWizardPageState();
}

class _CampaignWizardPageState extends State<CampaignWizardPage> {
  static const _stepBasics = 0;
  static const _stepSchedule = 1;
  static const _stepRules = 2;
  static const _stepAudience = 3;
  static const _stepActions = 4;
  static const _stepReview = 5;

  final _nameZh = TextEditingController();
  final _descriptionZh = TextEditingController();
  final _nameEn = TextEditingController();
  final _descriptionEn = TextEditingController();
  final _timezoneSearch = TextEditingController();

  var _step = _stepBasics;
  var _busy = false;
  String? _fieldError;
  String? _apiError;

  String _timezone = 'Asia/Kuala_Lumpur';
  String? _startsOn;
  String? _endsOn;

  List<CampaignRuleStrategy> _strategies = const [];
  String? _strategyKey;
  String _reviewMode = 'auto';

  var _audienceCustomerWide = true;
  Set<String> _selectedCommunityIds = {};
  List<Community> _communities = const [];

  List<_DraftActionDefinition> _actions = [];

  var _loadingMeta = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadMeta());
  }

  @override
  void dispose() {
    _nameZh.dispose();
    _descriptionZh.dispose();
    _nameEn.dispose();
    _descriptionEn.dispose();
    _timezoneSearch.dispose();
    super.dispose();
  }

  Future<void> _loadMeta() async {
    final l10n = AppLocalizations.of(context);
    try {
      final client = ApiScope.of(context).client;
      final results = await Future.wait([
        client.listCampaignRuleStrategies(widget.customerId),
        client.listCommunities(widget.customerId),
      ]);
      if (!mounted) {
        return;
      }
      final strategies = results[0] as List<CampaignRuleStrategy>;
      final communities = results[1] as List<Community>;
      setState(() {
        _strategies = strategies;
        _communities = communities;
        _strategyKey = strategies.any((row) => row.key == 'vegetarian')
            ? 'vegetarian'
            : (strategies.isEmpty ? null : strategies.first.key);
        _loadingMeta = false;
        if (_strategyKey != null) {
          _applyRecommendedFor(_strategyKey!);
        }
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingMeta = false;
        _apiError = localizeApiError(l10n, error);
      });
    }
  }

  CampaignRuleStrategy? get _selectedStrategy {
    final key = _strategyKey;
    if (key == null) {
      return null;
    }
    final matches = _strategies.where((row) => row.key == key);
    return matches.isEmpty ? null : matches.first;
  }

  void _applyRecommendedFor(String key) {
    final matches = _strategies.where((row) => row.key == key);
    if (matches.isEmpty) {
      return;
    }
    final strategy = matches.first;
    _actions = [
      for (final row in strategy.recommendedActionDefinitions)
        _DraftActionDefinition(key: row.key, name: row.name, unit: row.unit),
    ];
    final modes = strategy.reviewModes;
    if (modes.isNotEmpty && !modes.contains(_reviewMode)) {
      _reviewMode = modes.first;
    }
  }

  List<String> get _steps {
    final l10n = AppLocalizations.of(context);
    return [
      l10n.campaignStepBasics,
      l10n.campaignStepSchedule,
      l10n.campaignStepRules,
      l10n.campaignStepAudience,
      l10n.campaignStepActions,
      l10n.campaignStepReview,
    ];
  }

  bool _validateCurrent(AppLocalizations l10n) {
    switch (_step) {
      case _stepBasics:
        if (_nameZh.text.trim().isEmpty) {
          setState(() => _fieldError = l10n.nameRequired);
          return false;
        }
      case _stepSchedule:
        if (_startsOn == null ||
            _startsOn!.isEmpty ||
            _endsOn == null ||
            _endsOn!.isEmpty) {
          setState(() => _fieldError = l10n.campaignDatesRequired);
          return false;
        }
      case _stepRules:
        if (_strategyKey == null) {
          setState(() => _fieldError = l10n.campaignStrategyRequired);
          return false;
        }
      case _stepAudience:
        if (!_audienceCustomerWide && _selectedCommunityIds.isEmpty) {
          setState(() => _fieldError = l10n.campaignAudienceRequired);
          return false;
        }
      case _stepActions:
        if (_actions.isEmpty ||
            _actions.any(
              (row) => row.name.trim().isEmpty || row.unit.trim().isEmpty,
            )) {
          setState(() => _fieldError = l10n.campaignActionsRequired);
          return false;
        }
    }
    setState(() => _fieldError = null);
    return true;
  }

  Future<void> _next() async {
    final l10n = AppLocalizations.of(context);
    if (!_validateCurrent(l10n)) {
      return;
    }
    if (_step < _stepReview) {
      setState(() => _step += 1);
      return;
    }
    await _create();
  }

  Future<(String templateId, String scopeId)> _ensureTemplateAndScope(
    CampaignApiClient client,
  ) async {
    final templates = await client.listTemplates(widget.customerId);
    final template = templates.isEmpty
        ? await client.createTemplate(
            customerId: widget.customerId,
            name: 'Environmental Action',
            key: 'environmental_action',
          )
        : templates.first;
    final scopes = await client.listScopes(
      widget.customerId,
      templateId: template.id,
    );
    final scope = scopes.isEmpty
        ? await client.createScope(
            customerId: widget.customerId,
            templateId: template.id,
            name: 'Default',
            key: 'default',
          )
        : scopes.first;
    return (template.id, scope.id);
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _apiError = null;
    });
    try {
      final client = ApiScope.of(context).client;
      final ids = await _ensureTemplateAndScope(client);
      final enName = _nameEn.text.trim();
      final enDescription = _descriptionEn.text.trim();
      final translations = (enName.isEmpty && enDescription.isEmpty)
          ? null
          : CampaignContentTranslations(
              en: CampaignEnglishTranslations(
                name: enName.isEmpty ? null : enName,
                description: enDescription.isEmpty ? null : enDescription,
              ),
            );
      final created = await client.createCampaign(
        customerId: widget.customerId,
        templateId: ids.$1,
        scopeId: ids.$2,
        name: _nameZh.text.trim(),
        description: _descriptionZh.text.trim().isEmpty
            ? null
            : _descriptionZh.text.trim(),
        timezone: _timezone,
        startsOn: _startsOn,
        endsOn: _endsOn,
        communityIds:
            _audienceCustomerWide ? const [] : _selectedCommunityIds.toList(),
        configuration: {
          'rulesStrategy': _strategyKey,
          'submissionReview': _reviewMode,
        },
        translations: translations,
      );
      for (final action in _actions) {
        await client.createActionDefinition(
          campaignId: created.id,
          name: action.name.trim(),
          unit: action.unit.trim(),
          key: action.key.trim().isEmpty ? null : action.key.trim(),
        );
      }
      if (!mounted) {
        return;
      }
      context.go(
        '/customers/${widget.customerId}/campaigns/${created.id}',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _apiError = localizeApiError(l10n, error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_loadingMeta) {
      return const AdminLoadingState();
    }
    return AdminPageBody(
      child: WizardStepper(
        steps: _steps,
        currentStep: _step,
        busy: _busy,
        nextEnabled: !_busy,
        nextLabel: _step == _stepReview
            ? l10n.campaignCreateAsDraft
            : l10n.wizardNext,
        backLabel: l10n.wizardBack,
        onBack: _step == 0 || _busy
            ? null
            : () => setState(() {
                  _step -= 1;
                  _fieldError = null;
                }),
        onNext: _next,
        body: ListView(
          children: [
            AdminPageHeader(title: l10n.campaignWizardTitle),
            if (_fieldError != null) ...[
              Text(
                _fieldError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 8),
            ],
            if (_apiError != null) ...[
              Text(
                _apiError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 8),
            ],
            _buildStepBody(l10n),
          ],
        ),
      ),
    );
  }

  Widget _buildStepBody(AppLocalizations l10n) {
    switch (_step) {
      case _stepBasics:
        return _basicsStep(l10n);
      case _stepSchedule:
        return _scheduleStep(l10n);
      case _stepRules:
        return _rulesStep(l10n);
      case _stepAudience:
        return _audienceStep(l10n);
      case _stepActions:
        return _actionsStep(l10n);
      case _stepReview:
        return _reviewStep(l10n);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _basicsStep(AppLocalizations l10n) {
    return Column(
      children: [
        TextField(
          controller: _nameZh,
          decoration: InputDecoration(
            labelText: l10n.campaignNameZhLabel,
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _descriptionZh,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: l10n.campaignDescriptionZhLabel,
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _nameEn,
          decoration: InputDecoration(
            labelText: l10n.campaignNameEnLabel,
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _descriptionEn,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: l10n.campaignDescriptionEnLabel,
            border: const OutlineInputBorder(),
          ),
        ),
      ],
    );
  }

  Widget _scheduleStep(AppLocalizations l10n) {
    final locale = Localizations.localeOf(context);
    final query = _timezoneSearch.text.trim().toLowerCase();
    final zones = campaignTimezoneOptions
        .where((zone) => query.isEmpty || zone.toLowerCase().contains(query))
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(l10n.startsOnLabel),
          subtitle: Text(
            _startsOn == null
                ? l10n.campaignPickStartDate
                : formatCampaignDate(_startsOn, locale),
          ),
          trailing: const Icon(Icons.calendar_today_outlined),
          onTap: () async {
            final picked = await pickCampaignDate(
              context: context,
              initialIso: _startsOn,
              helpText: l10n.campaignPickStartDate,
            );
            if (picked != null) {
              setState(() => _startsOn = picked);
            }
          },
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(l10n.endsOnLabel),
          subtitle: Text(
            _endsOn == null
                ? l10n.campaignPickEndDate
                : formatCampaignDate(_endsOn, locale),
          ),
          trailing: const Icon(Icons.calendar_today_outlined),
          onTap: () async {
            final picked = await pickCampaignDate(
              context: context,
              initialIso: _endsOn,
              helpText: l10n.campaignPickEndDate,
            );
            if (picked != null) {
              setState(() => _endsOn = picked);
            }
          },
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _timezoneSearch,
          decoration: InputDecoration(
            labelText: l10n.campaignTimezoneSearch,
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.search),
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          // ignore: deprecated_member_use
          value: zones.contains(_timezone) ? _timezone : null,
          decoration: InputDecoration(
            labelText: l10n.timezoneLabel,
            border: const OutlineInputBorder(),
          ),
          items: [
            for (final zone in zones)
              DropdownMenuItem(value: zone, child: Text(zone)),
          ],
          onChanged: (value) {
            if (value != null) {
              setState(() => _timezone = value);
            }
          },
        ),
      ],
    );
  }

  Widget _rulesStep(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.campaignRulesStrategyHint),
        const SizedBox(height: 12),
        for (final strategy in _strategies)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            color: _strategyKey == strategy.key
                ? Theme.of(context).colorScheme.primaryContainer
                : null,
            child: InkWell(
              onTap: () => setState(() {
                _strategyKey = strategy.key;
                _applyRecommendedFor(strategy.key);
              }),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _strategyKey == strategy.key
                              ? Icons.radio_button_checked
                              : Icons.radio_button_off,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            strategy.label,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(strategy.description),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _audienceStep(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        RadioListTile<bool>(
          title: Text(l10n.campaignAudienceCustomerWide),
          value: true,
          // ignore: deprecated_member_use
          groupValue: _audienceCustomerWide,
          // ignore: deprecated_member_use
          onChanged: (value) {
            if (value != null) {
              setState(() => _audienceCustomerWide = value);
            }
          },
        ),
        RadioListTile<bool>(
          title: Text(l10n.campaignAudienceSelected),
          value: false,
          // ignore: deprecated_member_use
          groupValue: _audienceCustomerWide,
          // ignore: deprecated_member_use
          onChanged: (value) {
            if (value != null) {
              setState(() => _audienceCustomerWide = value);
            }
          },
        ),
        if (!_audienceCustomerWide) ...[
          const SizedBox(height: 8),
          Text(l10n.campaignAudiencePickCommunities),
          CommunityMultiPicker(
            communities: _communities,
            selectedIds: _selectedCommunityIds,
            onChanged: (ids) => setState(() => _selectedCommunityIds = ids),
          ),
        ],
      ],
    );
  }

  Widget _actionsStep(AppLocalizations l10n) {
    final strategy = _selectedStrategy;
    final modes = strategy?.reviewModes ?? const ['auto', 'manual'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.campaignActionDefinitionsTitle,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        if (strategy != null &&
            strategy.recommendedActionDefinitions.isNotEmpty)
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
              onPressed: () => setState(() {
                _applyRecommendedFor(strategy.key);
              }),
              child: Text(l10n.campaignApplyRecommendedActions),
            ),
          ),
        const SizedBox(height: 8),
        for (var i = 0; i < _actions.length; i++) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  TextFormField(
                    initialValue: _actions[i].name,
                    decoration: InputDecoration(
                      labelText: l10n.campaignActionNameLabel,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (value) => _actions[i].name = value,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    initialValue: _actions[i].key,
                    decoration: InputDecoration(
                      labelText: l10n.campaignActionKeyLabel,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (value) => _actions[i].key = value,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    initialValue: _actions[i].unit,
                    decoration: InputDecoration(
                      labelText: l10n.campaignActionUnitLabel,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (value) => _actions[i].unit = value,
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => setState(() => _actions.removeAt(i)),
                      child: Text(l10n.campaignRemoveActionDefinition),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        OutlinedButton.icon(
          onPressed: () => setState(() {
            _actions.add(
              _DraftActionDefinition(key: '', name: '', unit: ''),
            );
          }),
          icon: const Icon(Icons.add),
          label: Text(l10n.campaignAddActionDefinition),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.campaignReviewModeLabel,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        if (modes.contains('auto'))
          RadioListTile<String>(
            title: Text(l10n.campaignReviewModeAuto),
            subtitle: Text(l10n.campaignReviewModeAutoHelp),
            value: 'auto',
            // ignore: deprecated_member_use
            groupValue: _reviewMode,
            // ignore: deprecated_member_use
            onChanged: (value) {
              if (value != null) {
                setState(() => _reviewMode = value);
              }
            },
          ),
        if (modes.contains('manual'))
          RadioListTile<String>(
            title: Text(l10n.campaignReviewModeManual),
            subtitle: Text(l10n.campaignReviewModeManualHelp),
            value: 'manual',
            // ignore: deprecated_member_use
            groupValue: _reviewMode,
            // ignore: deprecated_member_use
            onChanged: (value) {
              if (value != null) {
                setState(() => _reviewMode = value);
              }
            },
          ),
      ],
    );
  }

  Widget _reviewStep(AppLocalizations l10n) {
    final locale = Localizations.localeOf(context);
    final strategy = _selectedStrategy;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.campaignReviewSummary),
        const SizedBox(height: 12),
        _reviewRow(l10n.campaignNameZhLabel, _nameZh.text.trim()),
        if (_descriptionZh.text.trim().isNotEmpty)
          _reviewRow(
            l10n.campaignDescriptionZhLabel,
            _descriptionZh.text.trim(),
          ),
        if (_nameEn.text.trim().isNotEmpty)
          _reviewRow(l10n.campaignNameEnLabel, _nameEn.text.trim()),
        _reviewRow(
          l10n.startsOnLabel,
          formatCampaignDate(_startsOn, locale),
        ),
        _reviewRow(l10n.endsOnLabel, formatCampaignDate(_endsOn, locale)),
        _reviewRow(l10n.timezoneLabel, _timezone),
        _reviewRow(
          l10n.rulesStrategyLabel,
          strategy?.label ?? _strategyKey ?? '',
        ),
        _reviewRow(
          l10n.campaignReviewModeLabel,
          _reviewMode == 'manual'
              ? l10n.campaignReviewModeManual
              : l10n.campaignReviewModeAuto,
        ),
        _reviewRow(
          l10n.campaignStepAudience,
          _audienceCustomerWide
              ? l10n.campaignAudienceCustomerWide
              : '${l10n.campaignAudienceSelected} (${_selectedCommunityIds.length})',
        ),
        _reviewRow(
          l10n.campaignActionDefinitionsTitle,
          _actions.map((row) => '${row.name} (${row.unit})').join(', '),
        ),
      ],
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 160,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
