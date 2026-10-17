import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../dashboards/aggregate_dashboard_page.dart';
import '../l10n/app_localizations.dart';
import '../reports/campaign_report_page.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';
import 'campaign_dates.dart';
import 'impact_factors_page.dart';
import 'participants_page.dart';
import 'submissions_page.dart';

class CampaignWorkspacePage extends StatefulWidget {
  const CampaignWorkspacePage({
    required this.customerId,
    required this.campaignId,
    super.key,
  });

  final String customerId;
  final String campaignId;

  @override
  State<CampaignWorkspacePage> createState() => _CampaignWorkspacePageState();
}

class _CampaignWorkspacePageState extends State<CampaignWorkspacePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  Campaign? _campaign;
  List<ActionDefinition> _definitions = const [];
  String? _error;
  var _loading = true;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 6, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final client = ApiScope.of(context).client;
      final campaign = await client.getCampaign(widget.campaignId);
      final definitions =
          await client.listActionDefinitions(widget.campaignId);
      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _definitions = definitions;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = localizeApiError(l10n, error);
        _loading = false;
      });
    }
  }

  bool get _hasDates {
    final campaign = _campaign;
    return campaign != null &&
        campaign.startsOn != null &&
        campaign.startsOn!.isNotEmpty &&
        campaign.endsOn != null &&
        campaign.endsOn!.isNotEmpty;
  }

  bool get _hasActions => _definitions.isNotEmpty;

  bool get _hasAudience {
    // Empty communityIds = organisation-wide (valid). Selected list also valid.
    return _campaign != null;
  }

  bool get _canPublish =>
      _campaign?.isDraft == true && _hasDates && _hasActions && _hasAudience;

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'draft':
        return l10n.campaignStatusDraft;
      case 'published':
        return l10n.campaignStatusPublished;
      case 'started':
        return l10n.campaignStatusStarted;
      case 'completed':
        return l10n.campaignStatusCompleted;
      default:
        return status;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'draft':
        return Icons.edit_outlined;
      case 'published':
        return Icons.public_outlined;
      case 'started':
        return Icons.play_arrow;
      case 'completed':
        return Icons.check_circle_outline;
      default:
        return Icons.flag_outlined;
    }
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
  }) async {
    final l10n = AppLocalizations.of(context);
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result == true;
  }

  Future<void> _publish() async {
    final l10n = AppLocalizations.of(context);
    if (!_canPublish) {
      return;
    }
    final ok = await _confirm(
      title: l10n.publishCampaignConfirmTitle,
      body: l10n.publishCampaignConfirmBody,
      confirmLabel: l10n.publishCampaign,
    );
    if (!ok || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      final campaign = await ApiScope.of(context).client.publishCampaign(
        widget.campaignId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _busy = false;
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

  Future<void> _start() async {
    final l10n = AppLocalizations.of(context);
    final ok = await _confirm(
      title: l10n.startCampaignConfirmTitle,
      body: l10n.startCampaignConfirmBody,
      confirmLabel: l10n.startCampaign,
    );
    if (!ok || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      final campaign =
          await ApiScope.of(context).client.startCampaign(widget.campaignId);
      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _busy = false;
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

  Future<void> _complete() async {
    final l10n = AppLocalizations.of(context);
    final ok = await _confirm(
      title: l10n.completeCampaignConfirmTitle,
      body: l10n.completeCampaignConfirmBody,
      confirmLabel: l10n.completeCampaign,
    );
    if (!ok || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      final campaign = await ApiScope.of(context)
          .client
          .completeCampaign(widget.campaignId);
      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _busy = false;
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const AdminLoadingState();
    }
    final campaign = _campaign;
    if (campaign == null) {
      return AdminErrorState(
        message: _error ?? l10n.errorUnexpected,
        onRetry: _load,
      );
    }

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: campaign.name,
            subtitle: campaign.description,
            actions: [
              StatusChip(
                label: _statusLabel(l10n, campaign.status),
                icon: _statusIcon(campaign.status),
              ),
            ],
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          TabBar(
            controller: _tabs,
            isScrollable: true,
            tabs: [
              Tab(text: l10n.campaignWorkspaceOverview),
              Tab(text: l10n.campaignWorkspaceSettings),
              Tab(text: l10n.campaignWorkspaceParticipants),
              Tab(text: l10n.campaignWorkspaceSubmissions),
              Tab(text: l10n.campaignWorkspaceMilestonesImpact),
              Tab(text: l10n.campaignWorkspaceDashboardReports),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _OverviewTab(
                  campaign: campaign,
                  hasDates: _hasDates,
                  hasActions: _hasActions,
                  hasAudience: _hasAudience,
                  canPublish: _canPublish,
                  busy: _busy,
                  onPublish: _publish,
                  onStart: _start,
                  onComplete: _complete,
                ),
                _SettingsTab(
                  campaign: campaign,
                  onSaved: (updated) => setState(() => _campaign = updated),
                ),
                ParticipantsPage(campaignId: widget.campaignId),
                SubmissionsPage(campaignId: widget.campaignId),
                _MilestonesImpactTab(
                  customerId: widget.customerId,
                  campaignId: widget.campaignId,
                ),
                _DashboardReportsTab(campaignId: widget.campaignId),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({
    required this.campaign,
    required this.hasDates,
    required this.hasActions,
    required this.hasAudience,
    required this.canPublish,
    required this.busy,
    required this.onPublish,
    required this.onStart,
    required this.onComplete,
  });

  final Campaign campaign;
  final bool hasDates;
  final bool hasActions;
  final bool hasAudience;
  final bool canPublish;
  final bool busy;
  final VoidCallback onPublish;
  final VoidCallback onStart;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final range = formatCampaignDateRange(
      campaign.startsOn,
      campaign.endsOn,
      locale,
    );

    Widget checklistRow(String label, bool ready) {
      return ListTile(
        dense: true,
        leading: Icon(
          ready ? Icons.check_circle : Icons.error_outline,
          color: ready
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.error,
        ),
        title: Text(label),
        trailing: Text(
          ready ? l10n.campaignChecklistReady : l10n.campaignChecklistMissing,
        ),
      );
    }

    return ListView(
      children: [
        Text(
          '${l10n.timezoneLabel}: ${campaign.timezone}',
        ),
        if (range.isNotEmpty) Text(range),
        Text(
          '${l10n.rulesStrategyLabel}: ${campaign.configuration['rulesStrategy'] ?? '—'}',
        ),
        const SizedBox(height: 16),
        if (campaign.isDraft) ...[
          Text(
            l10n.campaignPublishChecklistTitle,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          checklistRow(l10n.campaignChecklistDates, hasDates),
          checklistRow(l10n.campaignChecklistActions, hasActions),
          checklistRow(l10n.campaignChecklistAudience, hasAudience),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: busy || !canPublish ? null : onPublish,
            child: Text(l10n.publishCampaign),
          ),
        ],
        if (campaign.status == 'published') ...[
          FilledButton(
            onPressed: busy ? null : onStart,
            child: Text(l10n.startCampaign),
          ),
        ],
        if (campaign.status == 'started') ...[
          FilledButton(
            onPressed: busy ? null : onComplete,
            child: Text(l10n.completeCampaign),
          ),
        ],
      ],
    );
  }
}

class _SettingsTab extends StatefulWidget {
  const _SettingsTab({
    required this.campaign,
    required this.onSaved,
  });

  final Campaign campaign;
  final ValueChanged<Campaign> onSaved;

  @override
  State<_SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<_SettingsTab> {
  late final TextEditingController _name;
  late final TextEditingController _description;
  late final TextEditingController _timezone;
  String? _startsOn;
  String? _endsOn;
  String? _error;
  var _busy = false;

  bool get _isDraft => widget.campaign.isDraft;
  bool get _postPublish =>
      widget.campaign.status == 'published' ||
      widget.campaign.status == 'started';

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.campaign.name);
    _description =
        TextEditingController(text: widget.campaign.description ?? '');
    _timezone = TextEditingController(text: widget.campaign.timezone);
    _startsOn = widget.campaign.startsOn;
    _endsOn = widget.campaign.endsOn;
  }

  @override
  void didUpdateWidget(covariant _SettingsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.campaign.id != widget.campaign.id ||
        oldWidget.campaign.status != widget.campaign.status) {
      _name.text = widget.campaign.name;
      _description.text = widget.campaign.description ?? '';
      _timezone.text = widget.campaign.timezone;
      _startsOn = widget.campaign.startsOn;
      _endsOn = widget.campaign.endsOn;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _timezone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final Campaign updated;
      if (_postPublish) {
        updated = await ApiScope.of(context).client.updateCampaign(
          widget.campaign.id,
          description: _description.text.trim(),
          endsOn: _endsOn,
        );
      } else {
        updated = await ApiScope.of(context).client.updateCampaign(
          widget.campaign.id,
          name: _name.text.trim(),
          description: _description.text.trim().isEmpty
              ? null
              : _description.text.trim(),
          timezone: _timezone.text.trim(),
          startsOn: _startsOn,
          endsOn: _endsOn,
        );
      }
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      widget.onSaved(updated);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.campaignSettingsSaved)),
      );
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

  Widget _lockedField({
    required String label,
    required Widget child,
    required bool locked,
  }) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            if (locked) ...[
              const Icon(Icons.lock_outline, size: 16),
              const SizedBox(width: 4),
              Text(
                l10n.campaignFieldLocked,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
        ),
        const SizedBox(height: 4),
        IgnorePointer(ignoring: locked, child: Opacity(opacity: locked ? 0.65 : 1, child: child)),
        const SizedBox(height: 12),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final lockDraftOnly = !_isDraft;

    return ListView(
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        _lockedField(
          label: l10n.campaignNameLabel,
          locked: lockDraftOnly,
          child: TextField(
            controller: _name,
            decoration: const InputDecoration(border: OutlineInputBorder()),
          ),
        ),
        _lockedField(
          label: l10n.campaignDescriptionLabel,
          locked: false,
          child: TextField(
            controller: _description,
            maxLines: 3,
            decoration: const InputDecoration(border: OutlineInputBorder()),
          ),
        ),
        _lockedField(
          label: l10n.timezoneLabel,
          locked: lockDraftOnly,
          child: TextField(
            controller: _timezone,
            decoration: const InputDecoration(border: OutlineInputBorder()),
          ),
        ),
        _lockedField(
          label: l10n.startsOnLabel,
          locked: lockDraftOnly,
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(
              _startsOn == null
                  ? l10n.campaignPickStartDate
                  : formatCampaignDate(_startsOn, locale),
            ),
            trailing: const Icon(Icons.calendar_today_outlined),
            onTap: () async {
              final picked = await pickCampaignDate(
                context: context,
                initialIso: _startsOn,
              );
              if (picked != null) {
                setState(() => _startsOn = picked);
              }
            },
          ),
        ),
        _lockedField(
          label: l10n.endsOnLabel,
          locked: false,
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(
              _endsOn == null
                  ? l10n.campaignPickEndDate
                  : formatCampaignDate(_endsOn, locale),
            ),
            trailing: const Icon(Icons.calendar_today_outlined),
            onTap: () async {
              final picked = await pickCampaignDate(
                context: context,
                initialIso: _endsOn,
              );
              if (picked != null) {
                setState(() => _endsOn = picked);
              }
            },
          ),
        ),
        if (lockDraftOnly)
          _lockedField(
            label: l10n.rulesStrategyLabel,
            locked: true,
            child: TextFormField(
              initialValue:
                  '${widget.campaign.configuration['rulesStrategy'] ?? ''}',
              decoration: const InputDecoration(border: OutlineInputBorder()),
            ),
          ),
        FilledButton(
          onPressed: _busy ? null : _save,
          child: Text(l10n.campaignSaveSettings),
        ),
      ],
    );
  }
}

class _MilestonesImpactTab extends StatelessWidget {
  const _MilestonesImpactTab({
    required this.customerId,
    required this.campaignId,
  });

  final String customerId;
  final String campaignId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(l10n.campaignMilestonesComingSoon),
        ),
        SizedBox(
          height: 480,
          child: ImpactFactorsPage(
            customerId: customerId,
            campaignId: campaignId,
          ),
        ),
      ],
    );
  }
}

class _DashboardReportsTab extends StatefulWidget {
  const _DashboardReportsTab({required this.campaignId});

  final String campaignId;

  @override
  State<_DashboardReportsTab> createState() => _DashboardReportsTabState();
}

class _DashboardReportsTabState extends State<_DashboardReportsTab> {
  var _showReport = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SegmentedButton<bool>(
          segments: [
            ButtonSegment(
              value: false,
              label: Text(l10n.openCampaignDashboard),
              icon: const Icon(Icons.dashboard_outlined),
            ),
            ButtonSegment(
              value: true,
              label: Text(l10n.openCampaignReport),
              icon: const Icon(Icons.table_chart_outlined),
            ),
          ],
          selected: {_showReport},
          onSelectionChanged: (value) {
            setState(() => _showReport = value.first);
          },
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _showReport
              ? CampaignReportPage(campaignId: widget.campaignId)
              : AggregateDashboardPage(
                  scope: 'campaign',
                  campaignId: widget.campaignId,
                ),
        ),
      ],
    );
  }
}
