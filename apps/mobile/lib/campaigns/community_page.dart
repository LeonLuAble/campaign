import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import 'celebration_banner.dart';
import 'community_helpers.dart';

/// Collective community progress: tree, TREE, outcomes, chart — aggregate only.
class CommunityPage extends StatefulWidget {
  const CommunityPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<CommunityPage> createState() => _CommunityPageState();
}

class _CommunityPageState extends State<CommunityPage> {
  Campaign? _campaign;
  List<Community> _communities = const [];
  String? _focusCommunityId;
  AggregateDashboard? _communityDashboard;
  AggregateDashboard? _campaignDashboard;
  InboxNotification? _celebration;
  String? _error;
  var _loading = true;
  var _granularity = 'day';
  var _requested = false;
  var _celebrationDismissed = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_requested) {
      _requested = true;
      _load();
    }
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final client = ApiScope.of(context).client;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final campaign = await client.getCampaign(widget.campaignId);
      final communities = await client.listCommunities(campaign.customerId);
      final focusId = _focusCommunityId ??
          session.selectedCommunityId ??
          (communities.isEmpty ? null : communities.first.id);

      AggregateDashboard? communityDash;
      if (focusId != null) {
        try {
          communityDash = await client.getCommunityDashboard(
            campaignId: widget.campaignId,
            communityId: focusId,
            granularity: _granularity,
          );
        } catch (_) {}
      }
      final campaignDash = await client.getCampaignDashboard(
        widget.campaignId,
        granularity: _granularity,
      );

      InboxNotification? celebration;
      if (!_celebrationDismissed) {
        try {
          final notes = await client.listNotifications(campaign.customerId);
          final match = notes.where(isCelebrationNotification);
          if (match.isNotEmpty) {
            celebration = match.first;
          }
        } catch (_) {}
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _communities = communities;
        _focusCommunityId = focusId;
        _communityDashboard = communityDash;
        _campaignDashboard = campaignDash;
        _celebration = celebration;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  String _progressStatus(AppLocalizations l10n, DashboardProgress progress) {
    final percent = progress.completionPercent ?? 0;
    final status = progress.completionStatus;
    if (percent > 100 || status == 'exceeded') {
      return l10n.dashboardProgressStatusExceeded;
    }
    if (percent >= 100 || status == 'achieved') {
      return l10n.dashboardProgressStatusAchieved;
    }
    if (percent <= 0) {
      return l10n.dashboardProgressStatusNotStarted;
    }
    return l10n.dashboardProgressStatusInProgress;
  }

  Future<void> _selectCommunity(String id) async {
    setState(() => _focusCommunityId = id);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final campaign = _campaign;
    final campaignDash = _campaignDashboard;
    final communityDash = _communityDashboard ?? campaignDash;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.communityViewTitle)),
      body: _loading && campaign == null
          ? ListView(
              padding: EdgeInsets.all(tokens.spaceLg),
              children: const [LoadingSkeleton(lines: 8)],
            )
          : _error != null && campaign == null
              ? ListView(
                  padding: EdgeInsets.all(tokens.spaceLg),
                  children: [
                    ErrorState(
                      message: _error!,
                      onRetry: _load,
                      retryLabel: l10n.retry,
                    ),
                  ],
                )
              : campaign == null
                  ? EmptyState(message: l10n.errorNotFound)
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: EdgeInsets.all(tokens.spaceLg),
                        children: [
                          if (_error != null) ...[
                            ErrorState(
                              message: _error!,
                              onRetry: _load,
                              retryLabel: l10n.retry,
                            ),
                            SizedBox(height: tokens.spaceMd),
                          ],
                          if (_celebration != null) ...[
                            CelebrationBanner(
                              title: isMilestoneNotification(_celebration!)
                                  ? l10n.milestoneReachedTitle
                                  : l10n.campaignCompleteTitle,
                              body: _celebration!.body.isNotEmpty
                                  ? _celebration!.body
                                  : _celebration!.title,
                              dismissLabel: l10n.celebrationDismiss,
                              onDismiss: () => setState(() {
                                _celebrationDismissed = true;
                                _celebration = null;
                              }),
                            ),
                            SizedBox(height: tokens.spaceLg),
                          ],
                          if (campaign.status == 'completed') ...[
                            CelebrationBanner(
                              title: l10n.campaignCompleteTitle,
                              body: l10n.campaignCompleteBody(campaign.name),
                            ),
                            SizedBox(height: tokens.spaceLg),
                          ],
                          Text(
                            campaign.name,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          SizedBox(height: tokens.spaceXs),
                          Text(l10n.anonymousTotalsNote),
                          SizedBox(height: tokens.spaceLg),
                          Text(
                            l10n.communityTreeHeading,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          SizedBox(height: tokens.spaceSm),
                          if (_communities.isEmpty)
                            EmptyState(message: l10n.communityTreeEmpty)
                          else
                            Card(
                              child: Padding(
                                padding: EdgeInsets.all(tokens.spaceSm),
                                child: TreeListView<Community>(
                                  nodes: communitySubtree(
                                    communities: _communities,
                                    rootId: _focusCommunityId,
                                  ),
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  expandTooltip: l10n.expandCommunity,
                                  collapseTooltip: l10n.collapseCommunity,
                                  labelBuilder: (node) => node.data.name,
                                  semanticsLabelBuilder: (node) =>
                                      l10n.communityNodeSemantics(node.data.name),
                                  actionsBuilder: (node) => [
                                    TreeListAction(
                                      id: 'focus',
                                      label: l10n.viewCommunityProgress,
                                      icon: Icons.insights_outlined,
                                      onSelected: () =>
                                          _selectCommunity(node.id),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          SizedBox(height: tokens.spaceXl),
                          if (communityDash != null) ...[
                            Text(
                              l10n.communityProgressHeading,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceMd),
                            Semantics(
                              label: _progressStatus(
                                l10n,
                                communityDash.progress,
                              ),
                              value:
                                  '${communityDash.progress.completionPercent ?? 0}%',
                              child: Row(
                                children: [
                                  ProgressRing(
                                    completion:
                                        (communityDash.progress.completionPercent ??
                                                0) /
                                            100,
                                    label: _progressStatus(
                                      l10n,
                                      communityDash.progress,
                                    ),
                                    size: 88,
                                  ),
                                  SizedBox(width: tokens.spaceLg),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _progressStatus(
                                            l10n,
                                            communityDash.progress,
                                          ),
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleMedium,
                                        ),
                                        Text(
                                          l10n.achievedOfTarget(
                                            formatNumber(
                                              communityDash
                                                  .progress.achievedValue,
                                            ),
                                            formatNumber(
                                              communityDash.progress.targetValue,
                                            ),
                                            communityDash.progress.unit ?? '',
                                          ),
                                        ),
                                        if (communityDash
                                                .progress.participantCount !=
                                            null)
                                          Text(
                                            l10n.participantCountLabel(
                                              '${communityDash.progress.participantCount}',
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(height: tokens.spaceXl),
                            Text(
                              l10n.visualizationSection,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            TreeVisualization(
                              displayName:
                                  communityDash.visualization.displayName,
                              completionLabel: l10n.completionLabel(
                                '${communityDash.visualization.completionPercent ?? 0}%',
                              ),
                              completionPercent:
                                  communityDash.visualization.completionPercent,
                              isActive: communityDash.visualization.isActive,
                              inactiveLabel: l10n.treeInactive,
                              axis: Axis.vertical,
                            ),
                            SizedBox(height: tokens.spaceXl),
                            Text(
                              l10n.outcomesSection,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            if (communityDash.outcomes.isEmpty)
                              Text(l10n.noOutcomes)
                            else
                              for (final outcome in communityDash.outcomes)
                                Padding(
                                  padding:
                                      EdgeInsets.only(bottom: tokens.spaceSm),
                                  child: MetricTile(
                                    label: outcome.outcomeMetric,
                                    value: l10n.outcomeValueLabel(
                                      formatNumber(outcome.value),
                                      outcome.outcomeUnit,
                                    ),
                                    caption: outcome.contributions.isEmpty
                                        ? null
                                        : l10n.factorSourceLabel(
                                            outcome.contributions.first.source,
                                          ),
                                    icon: Icons.eco_outlined,
                                  ),
                                ),
                            SizedBox(height: tokens.spaceXl),
                            Text(
                              l10n.timeSeriesSection,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            SegmentedButton<String>(
                              segments: [
                                ButtonSegment(
                                  value: 'day',
                                  label: Text(l10n.granularityDay),
                                ),
                                ButtonSegment(
                                  value: 'week',
                                  label: Text(l10n.granularityWeek),
                                ),
                              ],
                              selected: {_granularity},
                              onSelectionChanged: (value) async {
                                setState(() => _granularity = value.first);
                                await _load();
                              },
                            ),
                            SizedBox(height: tokens.spaceMd),
                            TimeSeriesChart(
                              buckets: dashboardTimeBuckets(communityDash),
                              chartModeLabel: l10n.chartModeLabel,
                              tableModeLabel: l10n.tableModeLabel,
                              emptyLabel: l10n.timeSeriesEmpty,
                              semanticsLabel: l10n.timeSeriesSemantics,
                              initialShowTable:
                                  MediaQuery.disableAnimationsOf(context),
                            ),
                          ],
                          if (campaignDash != null &&
                              communityDash != null &&
                              !identical(campaignDash, communityDash)) ...[
                            SizedBox(height: tokens.spaceXl),
                            Text(
                              l10n.campaignWideProgressHeading,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            Text(
                              l10n.achievedOfTarget(
                                formatNumber(campaignDash.progress.achievedValue),
                                formatNumber(campaignDash.progress.targetValue),
                                campaignDash.progress.unit ?? '',
                              ),
                            ),
                          ],
                          SizedBox(height: tokens.spaceXl),
                          SizedBox(
                            height: 48,
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: () => context.push(
                                '/campaigns/${widget.campaignId}/progress',
                              ),
                              child: Text(l10n.openProgress),
                            ),
                          ),
                          SizedBox(height: tokens.spaceMd),
                          SizedBox(
                            height: 48,
                            child: TextButton(
                              onPressed: () => context.go(
                                '/campaigns/${widget.campaignId}',
                              ),
                              child: Text(l10n.backToCampaign),
                            ),
                          ),
                        ],
                      ),
                    ),
    );
  }
}
