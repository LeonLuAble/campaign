import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../widgets/admin_ui.dart';

class OverviewPage extends StatefulWidget {
  const OverviewPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<OverviewPage> createState() => _OverviewPageState();
}

class _OverviewPageState extends State<OverviewPage> {
  var _loading = true;
  String? _error;
  int _communityCount = 0;
  int _memberCount = 0;
  final Map<String, int> _campaignsByStatus = {};
  var _canReadMembers = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void didUpdateWidget(covariant OverviewPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.customerId != widget.customerId) {
      _load();
    }
  }

  Future<void> _load() async {
    final scope = ApiScope.of(context);
    final session = scope.session;
    await session.ensureAccess(widget.customerId);
    final canMembers = session.hasPermission('memberships.read');
    final canCommunities = session.hasPermission('communities.read');
    final canCampaigns = session.hasPermission('campaigns.read');

    setState(() {
      _loading = true;
      _error = null;
      _canReadMembers = canMembers;
    });

    try {
      final api = scope.client;
      var communities = <Community>[];
      var campaigns = <Campaign>[];
      var members = 0;

      if (canCommunities) {
        communities = await api.listCommunities(widget.customerId);
      }
      if (canCampaigns) {
        campaigns = await api.listCampaigns(widget.customerId);
      }
      if (canMembers) {
        final page = await api.listMemberships(widget.customerId, limit: 200);
        members = page.items.length;
      }

      final byStatus = <String, int>{};
      for (final campaign in campaigns) {
        byStatus.update(campaign.status, (value) => value + 1, ifAbsent: () => 1);
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _communityCount = communities.length;
        _memberCount = members;
        _campaignsByStatus
          ..clear()
          ..addAll(byStatus);
        _loading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final session = ApiScope.of(context).session;
    final name = session.customers
            .where((row) => row.id == widget.customerId)
            .map((row) => row.name)
            .firstOrNull ??
        l10n.navOverview;

    return AdminPageBody(
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          children: [
            AdminPageHeader(title: name, subtitle: l10n.overviewSubtitle),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: LoadingSkeleton(lines: 5),
              )
            else if (_error != null)
              ErrorState(
                message: _error!,
                retryLabel: l10n.retry,
                onRetry: _load,
              )
            else ...[
              Wrap(
                spacing: tokens.spaceMd,
                runSpacing: tokens.spaceMd,
                children: [
                  PermissionGate(
                    permissionKeys: session.permissionKeys,
                    anyOf: const ['memberships.read'],
                    child: SizedBox(
                      width: 200,
                      child: MetricTile(
                        label: l10n.metricMembers,
                        value: '$_memberCount',
                        icon: Icons.people_outline,
                      ),
                    ),
                  ),
                  PermissionGate(
                    permissionKeys: session.permissionKeys,
                    anyOf: const ['communities.read'],
                    child: SizedBox(
                      width: 200,
                      child: MetricTile(
                        label: l10n.metricCommunities,
                        value: '$_communityCount',
                        icon: Icons.account_tree_outlined,
                      ),
                    ),
                  ),
                  PermissionGate(
                    permissionKeys: session.permissionKeys,
                    anyOf: const ['campaigns.read'],
                    child: Wrap(
                      spacing: tokens.spaceMd,
                      runSpacing: tokens.spaceMd,
                      children: [
                        for (final entry in _campaignsByStatus.entries)
                          SizedBox(
                            width: 200,
                            child: MetricTile(
                              label: l10n.metricCampaignsByStatus(entry.key),
                              value: '${entry.value}',
                              icon: Icons.flag_outlined,
                            ),
                          ),
                        if (_campaignsByStatus.isEmpty)
                          SizedBox(
                            width: 200,
                            child: MetricTile(
                              label: l10n.metricCampaigns,
                              value: '0',
                              icon: Icons.flag_outlined,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: tokens.spaceXl),
              Text(
                l10n.nextStepsTitle,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              SizedBox(height: tokens.spaceMd),
              _NextStepsChecklist(
                customerId: widget.customerId,
                hasCommunities: _communityCount > 0,
                hasMembers: !_canReadMembers || _memberCount > 0,
                hasCampaigns: _campaignsByStatus.isNotEmpty,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _NextStepsChecklist extends StatelessWidget {
  const _NextStepsChecklist({
    required this.customerId,
    required this.hasCommunities,
    required this.hasMembers,
    required this.hasCampaigns,
  });

  final String customerId;
  final bool hasCommunities;
  final bool hasMembers;
  final bool hasCampaigns;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final steps = <_Step>[
      _Step(
        done: hasCommunities,
        label: l10n.nextStepCommunities,
        visible: session.hasPermission('communities.create') ||
            session.hasPermission('communities.read'),
        onTap: () => context.go('/customers/$customerId/communities'),
      ),
      _Step(
        done: hasMembers,
        label: l10n.nextStepPeople,
        visible: session.hasAnyPermission(const [
          'memberships.read',
          'user_imports.create',
          'memberships.create',
        ]),
        onTap: () => context.go('/customers/$customerId/import'),
      ),
      _Step(
        done: hasCampaigns,
        label: l10n.nextStepCampaign,
        visible: session.hasPermission('campaigns.create') ||
            session.hasPermission('campaigns.read'),
        onTap: () => context.go('/customers/$customerId/campaigns'),
      ),
    ].where((step) => step.visible).toList();

    if (steps.isEmpty) {
      return EmptyState(message: l10n.overviewEmptyPermissions);
    }

    final allDone = steps.every((step) => step.done);
    if (allDone) {
      return EmptyState(
        message: l10n.nextStepsComplete,
        icon: Icons.check_circle_outline,
      );
    }

    return Card(
      child: Column(
        children: [
          for (final step in steps)
            ListTile(
              leading: Icon(
                step.done ? Icons.check_circle : Icons.radio_button_unchecked,
                color: step.done
                    ? AppTokens.of(context).success
                    : Theme.of(context).colorScheme.outline,
              ),
              title: Text(step.label),
              trailing: step.done
                  ? null
                  : const Icon(Icons.chevron_right),
              onTap: step.done ? null : step.onTap,
            ),
        ],
      ),
    );
  }
}

class _Step {
  const _Step({
    required this.done,
    required this.label,
    required this.visible,
    required this.onTap,
  });

  final bool done;
  final String label;
  final bool visible;
  final VoidCallback onTap;
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final iterator = this.iterator;
    if (iterator.moveNext()) {
      return iterator.current;
    }
    return null;
  }
}
