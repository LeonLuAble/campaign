import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../session/session_controller.dart';
import '../util/format.dart';
import 'campaign_helpers.dart';

class CampaignDetailPage extends StatefulWidget {
  const CampaignDetailPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<CampaignDetailPage> createState() => _CampaignDetailPageState();
}

class _CampaignDetailPageState extends State<CampaignDetailPage> {
  Campaign? _campaign;
  Participation? _participation;
  Commitment? _commitment;
  CampaignRuleStrategy? _strategy;
  AggregateDashboard? _dashboard;
  String? _communityLabel;
  String? _error;
  var _loading = true;
  String? _loadedForUserId;
  SessionController? _session;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final session = ApiScope.of(context).session;
    if (_session != session) {
      _session?.removeListener(_onSessionChanged);
      _session = session;
      _session!.addListener(_onSessionChanged);
    }
    _ensureLoaded(session);
  }

  @override
  void dispose() {
    _session?.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    final session = _session;
    if (session == null || !mounted) {
      return;
    }
    _ensureLoaded(session);
  }

  void _ensureLoaded(SessionController session) {
    if (!session.ready) {
      return;
    }
    final userId = session.profile?.id;
    if (_loadedForUserId == userId && _campaign != null) {
      return;
    }
    _load();
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final client = ApiScope.of(context).client;
    final userId = session.profile?.id;
    _loadedForUserId = userId;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final campaign = await client.getCampaign(widget.campaignId);
      final rows = await client.listParticipations(widget.campaignId);
      Participation? mine;
      for (final row in rows) {
        if (row.userId == userId) {
          mine = row;
          break;
        }
      }
      Commitment? commitment;
      if (mine != null) {
        final commitments = await client.listCommitments(mine.id);
        if (commitments.isNotEmpty) {
          commitment = commitments.first;
        }
      }
      CampaignRuleStrategy? strategy;
      final strategyKey = campaign.configuration['rulesStrategy']?.toString();
      if (strategyKey != null && strategyKey.isNotEmpty) {
        final strategies =
            await client.listCampaignRuleStrategies(campaign.customerId);
        final match = strategies.where((row) => row.key == strategyKey);
        if (match.isNotEmpty) {
          strategy = match.first;
        }
      }
      AggregateDashboard? dashboard;
      try {
        dashboard = await client.getCampaignDashboard(widget.campaignId);
      } catch (_) {}

      String? communityLabel = session.selectedCommunityName;
      if (communityLabel == null && campaign.communityIds.isNotEmpty) {
        try {
          final communities =
              await client.listCommunities(campaign.customerId);
          final names = communities
              .where((row) => campaign.communityIds.contains(row.id))
              .map((row) => row.name)
              .toList();
          if (names.isNotEmpty) {
            communityLabel = names.join(', ');
          }
        } catch (_) {}
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _participation = mine;
        _commitment = commitment;
        _strategy = strategy;
        _dashboard = dashboard;
        _communityLabel = communityLabel;
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final campaign = _campaign;

    return Scaffold(
      appBar: AppBar(
        title: Text(campaign?.name ?? l10n.campaignsTitle),
      ),
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
                            Text(
                              _error!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                            SizedBox(height: tokens.spaceMd),
                          ],
                          Text(
                            campaign.name,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          SizedBox(height: tokens.spaceSm),
                          StatusChip(
                            label: campaignStatusLabel(l10n, campaign.status),
                            icon: campaignStatusIcon(campaign.status),
                          ),
                          SizedBox(height: tokens.spaceMd),
                          Text(
                            l10n.campaignDatesLabel(formatCampaignDates(campaign)),
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                          if (_communityLabel != null) ...[
                            SizedBox(height: tokens.spaceXs),
                            Text(l10n.homeCommunityLabel(_communityLabel!)),
                          ],
                          if (campaign.description != null &&
                              campaign.description!.trim().isNotEmpty) ...[
                            SizedBox(height: tokens.spaceLg),
                            Text(
                              l10n.campaignDescriptionHeading,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            Text(campaign.description!),
                          ],
                          if (_strategy != null) ...[
                            SizedBox(height: tokens.spaceLg),
                            Text(
                              l10n.howItWorksHeading,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            Text(
                              _strategy!.label,
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            SizedBox(height: tokens.spaceXs),
                            Text(_strategy!.description),
                          ],
                          if (_dashboard != null) ...[
                            SizedBox(height: tokens.spaceLg),
                            Text(
                              l10n.communityProgressHeading,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            Semantics(
                              label: l10n.communityProgressHeading,
                              child: Row(
                                children: [
                                  ProgressRing(
                                    completion:
                                        (_dashboard!.progress.completionPercent ??
                                                0) /
                                            100,
                                    label: l10n.completionLabel(
                                      '${_dashboard!.progress.completionPercent ?? 0}%',
                                    ),
                                    size: 72,
                                  ),
                                  SizedBox(width: tokens.spaceLg),
                                  Expanded(
                                    child: Text(
                                      l10n.achievedOfTarget(
                                        formatNumber(
                                          _dashboard!.progress.achievedValue,
                                        ),
                                        formatNumber(
                                          _dashboard!.progress.targetValue,
                                        ),
                                        _dashboard!.progress.unit ?? '',
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (_dashboard!.outcomes.isNotEmpty) ...[
                              SizedBox(height: tokens.spaceMd),
                              for (final outcome in _dashboard!.outcomes)
                                Padding(
                                  padding: EdgeInsets.only(bottom: tokens.spaceSm),
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
                            Text(
                              l10n.anonymousTotalsNote,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                          SizedBox(height: tokens.spaceXl),
                          ..._actionButtons(l10n, campaign),
                        ],
                      ),
                    ),
    );
  }

  List<Widget> _actionButtons(AppLocalizations l10n, Campaign campaign) {
    final enrolled = _participation?.isEnrolled == true;
    final hasCommitment = _commitment != null;
    final widgets = <Widget>[];

    if (enrolled) {
      widgets.add(
        SizedBox(
          height: 48,
          width: double.infinity,
          child: FilledButton(
            onPressed: () => context.push(
              '/campaigns/${widget.campaignId}/participation',
            ),
            child: Text(
              hasCommitment
                  ? l10n.viewParticipation
                  : l10n.continueToPledge,
            ),
          ),
        ),
      );
      if (!hasCommitment) {
        widgets.add(const SizedBox(height: 12));
        widgets.add(
          SizedBox(
            height: 48,
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () =>
                  context.push('/campaigns/${widget.campaignId}/join'),
              child: Text(l10n.openPledge),
            ),
          ),
        );
      }
    } else if (campaign.canJoin) {
      widgets.add(
        SizedBox(
          height: 48,
          width: double.infinity,
          child: FilledButton(
            onPressed: () =>
                context.push('/campaigns/${widget.campaignId}/join'),
            child: Text(l10n.joinCampaign),
          ),
        ),
      );
    } else if (campaign.status == 'completed') {
      widgets.add(
        EmptyState(message: l10n.errorCampaignEnded),
      );
    } else {
      widgets.add(
        EmptyState(message: l10n.errorCampaignNotOpen),
      );
    }

    if (_participation?.status == 'withdrawn') {
      widgets.insert(
        0,
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(l10n.withdrawnLabel),
        ),
      );
    }

    return widgets;
  }
}
