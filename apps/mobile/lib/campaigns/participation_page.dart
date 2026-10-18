import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import 'campaign_helpers.dart';

/// Post-join participation summary with check-in entry (M4 builds check-in).
class ParticipationPage extends StatefulWidget {
  const ParticipationPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<ParticipationPage> createState() => _ParticipationPageState();
}

class _ParticipationPageState extends State<ParticipationPage> {
  Campaign? _campaign;
  Participation? _participation;
  Commitment? _commitment;
  CommitmentOptions? _options;
  String? _error;
  var _loading = true;
  var _busy = false;
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
    final userId = ApiScope.of(context).session.profile?.id;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final campaign = await client.getCampaign(widget.campaignId);
      final options = await client.getCommitmentOptions(widget.campaignId);
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
      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _participation = mine;
        _commitment = commitment;
        _options = options;
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

  String _commitmentLabel(AppLocalizations l10n) {
    final commitment = _commitment;
    if (commitment == null) {
      return l10n.noPledgeYet;
    }
    final options = _options;
    if (options != null && commitment.typeKey != null) {
      final match =
          options.choices.where((row) => row.key == commitment.typeKey);
      if (match.isNotEmpty) {
        return choiceDisplayName(match.first);
      }
    }
    return commitment.typeKey ?? l10n.meAnonymousName;
  }

  Future<void> _withdraw() async {
    final l10n = AppLocalizations.of(context);
    final participation = _participation;
    if (participation == null || !participation.isEnrolled) {
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.withdrawTitle),
        content: Text(l10n.withdrawConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.cancelLabel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.withdrawConfirm),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.withdrawParticipation(participation.id);
      if (!mounted) {
        return;
      }
      context.go('/campaigns/${widget.campaignId}');
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
    final tokens = AppTokens.of(context);
    final campaign = _campaign;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.participationTitle)),
      body: _loading && campaign == null
          ? ListView(
              padding: EdgeInsets.all(tokens.spaceLg),
              children: const [LoadingSkeleton(lines: 5)],
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
                  : ListView(
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
                        Text(l10n.campaignDatesLabel(formatCampaignDates(campaign))),
                        SizedBox(height: tokens.spaceLg),
                        Text(
                          l10n.myCommitmentHeading,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        SizedBox(height: tokens.spaceSm),
                        if (_commitment == null)
                          Text(l10n.noPledgeYet)
                        else ...[
                          Text(
                            _commitmentLabel(l10n),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          SizedBox(height: tokens.spaceXs),
                          Text(
                            l10n.achievedOfTarget(
                              '0',
                              formatNumber(_commitment!.targetValue),
                              _commitment!.unit,
                            ),
                          ),
                        ],
                        SizedBox(height: tokens.spaceXl),
                        if (_participation?.isEnrolled == true) ...[
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
                          SizedBox(height: tokens.spaceMd),
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
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: () => context.push(
                                '/campaigns/${widget.campaignId}/community',
                              ),
                              child: Text(l10n.openCommunityView),
                            ),
                          ),
                          SizedBox(height: tokens.spaceMd),
                          SizedBox(
                            height: 48,
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: () => context.push(
                                '/campaigns/${widget.campaignId}/join?change=1',
                              ),
                              child: Text(l10n.changePledgeTitle),
                            ),
                          ),
                          SizedBox(height: tokens.spaceMd),
                          SizedBox(
                            height: 48,
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _busy ? null : _withdraw,
                              child: Text(l10n.withdrawTitle),
                            ),
                          ),
                        ] else ...[
                          EmptyState(message: l10n.notEnrolledHint),
                          SizedBox(height: tokens.spaceMd),
                          SizedBox(
                            height: 48,
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () => context.go(
                                '/campaigns/${widget.campaignId}/join',
                              ),
                              child: Text(l10n.joinCampaign),
                            ),
                          ),
                        ],
                        SizedBox(height: tokens.spaceLg),
                        SizedBox(
                          height: 48,
                          child: TextButton(
                            onPressed: () =>
                                context.go('/campaigns/${widget.campaignId}'),
                            child: Text(l10n.backToCampaign),
                          ),
                        ),
                      ],
                    ),
    );
  }
}
