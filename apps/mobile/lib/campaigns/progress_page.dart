import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

/// Personal progress: history, uncapped ring, own outcomes, community aggregate.
class ProgressPage extends StatefulWidget {
  const ProgressPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<ProgressPage> createState() => _ProgressPageState();
}

class _ProgressPageState extends State<ProgressPage> {
  ParticipantProgress? _progress;
  ParticipantDashboard? _dashboard;
  AggregateDashboard? _community;
  List<RecordedAction> _actions = const [];
  String? _error;
  var _loading = true;
  var _requested = false;

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
    final client = ApiScope.of(context).client;
    final session = ApiScope.of(context).session;
    final userId = session.profile?.id;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await client.listParticipations(widget.campaignId);
      final mine = rows.where((row) => row.userId == userId && row.isEnrolled);
      if (mine.isEmpty) {
        setState(() {
          _loading = false;
          _error = l10n.notEnrolledHint;
        });
        return;
      }
      final participationId = mine.first.id;
      final progress = await client.getProgress(participationId);
      ParticipantDashboard? dashboard;
      try {
        dashboard = await client.getParticipantDashboard(participationId);
      } catch (_) {}
      final actions = await client.listParticipationActions(participationId);
      AggregateDashboard? community;
      try {
        final communityId =
            mine.first.communityId ?? session.selectedCommunityId;
        if (communityId != null) {
          community = await client.getCommunityDashboard(
            campaignId: widget.campaignId,
            communityId: communityId,
          );
        } else {
          community = await client.getCampaignDashboard(widget.campaignId);
        }
      } catch (_) {
        try {
          community = await client.getCampaignDashboard(widget.campaignId);
        } catch (_) {}
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _progress = progress;
        _dashboard = dashboard;
        _community = community;
        _actions = actions
            .where((row) => !row.isCancelled)
            .toList()
          ..sort((a, b) => b.occurredOn.compareTo(a.occurredOn));
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

  String _progressStatusLabel(AppLocalizations l10n, ParticipantProgress progress) {
    final percent = progress.completionPercent ?? 0;
    final status = progress.completionStatus;
    if (percent > 100 || status == 'exceeded') {
      return l10n.dashboardProgressStatusExceeded;
    }
    if (percent >= 100 || status == 'achieved') {
      return l10n.dashboardProgressStatusAchieved;
    }
    if (percent <= 0 || status == 'not_started' || status == 'none') {
      return l10n.dashboardProgressStatusNotStarted;
    }
    return l10n.dashboardProgressStatusInProgress;
  }

  String _actionStatusLabel(AppLocalizations l10n, RecordedAction action) {
    final submission = action.submission?.status;
    if (submission == 'rejected') {
      return l10n.checkInStatusRejected;
    }
    if (submission == 'submitted' || submission == 'pending') {
      return l10n.checkInStatusPending;
    }
    return l10n.checkInStatusDone;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final progress = _progress;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.progressTitle),
        actions: [
          IconButton(
            tooltip: l10n.openCheckIn,
            onPressed: () =>
                context.push('/campaigns/${widget.campaignId}/check-in'),
            icon: const Icon(Icons.edit_calendar_outlined),
          ),
        ],
      ),
      body: _loading && progress == null
          ? ListView(
              padding: EdgeInsets.all(tokens.spaceLg),
              children: const [LoadingSkeleton(lines: 8)],
            )
          : _error != null && progress == null
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
              : progress == null
                  ? EmptyState(message: l10n.emptyDashboard)
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
                          Text(
                            l10n.progressSection,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          SizedBox(height: tokens.spaceMd),
                          Semantics(
                            label: _progressStatusLabel(l10n, progress),
                            value:
                                '${progress.completionPercent ?? 0}%',
                            child: Row(
                              children: [
                                ProgressRing(
                                  completion:
                                      (progress.completionPercent ?? 0) / 100,
                                  label: _progressStatusLabel(l10n, progress),
                                  size: 96,
                                ),
                                SizedBox(width: tokens.spaceLg),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _progressStatusLabel(l10n, progress),
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium,
                                      ),
                                      SizedBox(height: tokens.spaceXs),
                                      Text(
                                        l10n.achievedOfTarget(
                                          formatNumber(progress.achievedValue),
                                          formatNumber(progress.targetValue),
                                          progress.unit ?? '',
                                        ),
                                      ),
                                      if (progress.completionPercent != null)
                                        Text(
                                          l10n.completionLabel(
                                            '${progress.completionPercent}%',
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
                            l10n.checkInHistoryHeading,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          SizedBox(height: tokens.spaceSm),
                          if (_actions.isEmpty)
                            EmptyState(message: l10n.checkInHistoryEmpty)
                          else
                            for (final action in _actions) ...[
                              Card(
                                child: ListTile(
                                  contentPadding:
                                      EdgeInsets.all(tokens.spaceMd),
                                  title: Text(action.occurredOn),
                                  subtitle: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      SizedBox(height: tokens.spaceXs),
                                      StatusChip(
                                        label:
                                            _actionStatusLabel(l10n, action),
                                        icon: Icons.calendar_today_outlined,
                                      ),
                                      Text(
                                        l10n.checkInQuantityLabel(
                                          formatNumber(action.quantity),
                                        ),
                                      ),
                                      if (action.submission?.status ==
                                              'rejected' &&
                                          (action.submission?.reviewNote
                                                  ?.isNotEmpty ??
                                              false))
                                        Text(
                                          l10n.checkInRejectedReason(
                                            action.submission!.reviewNote!,
                                          ),
                                        ),
                                    ],
                                  ),
                                  minVerticalPadding: 12,
                                ),
                              ),
                              SizedBox(height: tokens.spaceSm),
                            ],
                          if (_dashboard != null &&
                              _dashboard!.outcomes.isNotEmpty) ...[
                            SizedBox(height: tokens.spaceLg),
                            Text(
                              l10n.myImpactHeading,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            for (final outcome in _dashboard!.outcomes)
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
                          ],
                          if (_community != null) ...[
                            SizedBox(height: tokens.spaceLg),
                            Text(
                              l10n.communityProgressHeading,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            Text(
                              l10n.achievedOfTarget(
                                formatNumber(
                                  _community!.progress.achievedValue,
                                ),
                                formatNumber(
                                  _community!.progress.targetValue,
                                ),
                                _community!.progress.unit ?? '',
                              ),
                            ),
                            Text(
                              l10n.anonymousTotalsNote,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                          SizedBox(height: tokens.spaceXl),
                          SizedBox(
                            height: 48,
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () => context.push(
                                '/campaigns/${widget.campaignId}/check-in',
                              ),
                              child: Text(l10n.openCheckIn),
                            ),
                          ),
                        ],
                      ),
                    ),
    );
  }
}
