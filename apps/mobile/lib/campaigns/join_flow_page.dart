import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import 'campaign_helpers.dart';

/// Join + pledge: pick a localized commitment, confirm, enroll, then save pledge.
class JoinFlowPage extends StatefulWidget {
  const JoinFlowPage({
    required this.campaignId,
    this.changeOnly = false,
    super.key,
  });

  final String campaignId;
  final bool changeOnly;

  @override
  State<JoinFlowPage> createState() => _JoinFlowPageState();
}

class _JoinFlowPageState extends State<JoinFlowPage> {
  Campaign? _campaign;
  CommitmentOptions? _options;
  Participation? _participation;
  String? _selectedKey;
  final _target = TextEditingController();
  String? _error;
  var _loading = true;
  var _busy = false;
  var _confirming = false;
  var _requested = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_requested) {
      _requested = true;
      _load();
    }
  }

  @override
  void dispose() {
    _target.dispose();
    super.dispose();
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
      if (!mounted) {
        return;
      }
      if (mine?.isEnrolled == true && !widget.changeOnly) {
        final commitments = await client.listCommitments(mine!.id);
        if (commitments.isNotEmpty && mounted) {
          context.go('/campaigns/${widget.campaignId}/participation');
          return;
        }
      }
      setState(() {
        _campaign = campaign;
        _options = options;
        _participation = mine;
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

  CommitmentChoice? get _selected {
    final key = _selectedKey;
    final options = _options;
    if (key == null || options == null) {
      return null;
    }
    final match = options.choices.where((row) => row.key == key);
    return match.isEmpty ? null : match.first;
  }

  void _select(CommitmentChoice choice) {
    setState(() {
      _selectedKey = choice.key;
      _error = null;
      if (choice.suggestedTarget != null && !choice.usesCampaignDuration) {
        _target.text = formatNumber(choice.suggestedTarget!);
      } else {
        _target.clear();
      }
    });
  }

  Future<void> _openConfirm() async {
    final l10n = AppLocalizations.of(context);
    final campaign = _campaign;
    final choice = _selected;
    if (campaign == null || choice == null) {
      setState(() => _error = l10n.selectChoice);
      return;
    }
    try {
      resolveCommitmentTarget(
        choice: choice,
        campaign: campaign,
        manualTargetText: _target.text,
      );
    } on FormatException {
      setState(() => _error = l10n.targetInvalid);
      return;
    }
    setState(() {
      _confirming = true;
      _error = null;
    });
  }

  Future<void> _confirmJoin() async {
    final l10n = AppLocalizations.of(context);
    final client = ApiScope.of(context).client;
    final campaign = _campaign;
    final choice = _selected;
    if (campaign == null || choice == null) {
      return;
    }

    if (!widget.changeOnly && !campaign.canJoin) {
      setState(() {
        _error = campaign.status == 'completed'
            ? l10n.errorCampaignEnded
            : l10n.errorCampaignNotOpen;
        _confirming = false;
      });
      return;
    }

    late final num target;
    try {
      target = resolveCommitmentTarget(
        choice: choice,
        campaign: campaign,
        manualTargetText: _target.text,
      );
    } on FormatException {
      setState(() {
        _error = l10n.targetInvalid;
        _confirming = false;
      });
      return;
    }

    setState(() => _busy = true);
    try {
      var participation = _participation;
      if (participation == null || !participation.isEnrolled) {
        participation = await client.joinCampaign(widget.campaignId);
      }
      await client.createCommitment(
        participationId: participation.id,
        typeKey: choice.key,
        targetValue: target,
        unit: choice.canonicalUnit,
      );
      if (!mounted) {
        return;
      }
      context.go('/campaigns/${widget.campaignId}/participation');
    } catch (error) {
      if (!mounted) {
        return;
      }
      final message = localizeJoinError(l10n, error, campaign: campaign);
      final alreadyJoined = error is ApiException &&
          (error.code == 'CONFLICT' ||
              error.message.toLowerCase().contains('already enrolled'));
      setState(() {
        _busy = false;
        _confirming = false;
        _error = message;
      });
      if (alreadyJoined &&
          (_participation?.isEnrolled == true || widget.changeOnly) &&
          mounted) {
        context.go('/campaigns/${widget.campaignId}/participation');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final campaign = _campaign;
    final options = _options;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.changeOnly ? l10n.changePledgeTitle : l10n.joinCampaignTitle,
        ),
      ),
      body: _loading && campaign == null
          ? ListView(
              padding: EdgeInsets.all(tokens.spaceLg),
              children: const [LoadingSkeleton(lines: 6)],
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
                    SizedBox(height: tokens.spaceLg),
                    SizedBox(
                      height: 48,
                      child: OutlinedButton(
                        onPressed: () => context.go(
                          '/campaigns/${widget.campaignId}',
                        ),
                        child: Text(l10n.backToCampaign),
                      ),
                    ),
                  ],
                )
              : campaign == null || options == null
                  ? EmptyState(message: l10n.errorNotFound)
                  : _confirming
                      ? _ConfirmStep(
                          campaign: campaign,
                          choice: _selected!,
                          targetText: _target.text,
                          busy: _busy,
                          error: _error,
                          onBack: () => setState(() {
                            _confirming = false;
                            _error = null;
                          }),
                          onConfirm: _busy ? null : _confirmJoin,
                        )
                      : ListView(
                          padding: EdgeInsets.all(tokens.spaceLg),
                          children: [
                            Text(
                              campaign.name,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            SizedBox(height: tokens.spaceXs),
                            Text(l10n.campaignDatesLabel(formatCampaignDates(campaign))),
                            SizedBox(height: tokens.spaceLg),
                            Text(
                              l10n.selectChoice,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            if (options.choices.isEmpty)
                              EmptyState(message: l10n.noCommitmentChoices)
                            else
                              for (final choice in options.choices) ...[
                                _ChoiceCard(
                                  choice: choice,
                                  campaign: campaign,
                                  selected: _selectedKey == choice.key,
                                  onTap: () => _select(choice),
                                ),
                                SizedBox(height: tokens.spaceMd),
                              ],
                            if (_selected != null &&
                                !_selected!.usesCampaignDuration &&
                                _selected!.suggestedTarget == null) ...[
                              TextField(
                                controller: _target,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  labelText: l10n.targetValueLabel,
                                  border: const OutlineInputBorder(),
                                ),
                              ),
                              SizedBox(height: tokens.spaceMd),
                            ],
                            if (_selected != null &&
                                !_selected!.usesCampaignDuration &&
                                _selected!.suggestedTarget != null) ...[
                              TextField(
                                controller: _target,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  labelText: l10n.targetValueLabel,
                                  border: const OutlineInputBorder(),
                                ),
                              ),
                              SizedBox(height: tokens.spaceMd),
                            ],
                            if (_error != null) ...[
                              Text(
                                _error!,
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                ),
                              ),
                              SizedBox(height: tokens.spaceMd),
                              SizedBox(
                                height: 48,
                                child: OutlinedButton(
                                  onPressed: () => context.go(
                                    '/campaigns/${widget.campaignId}',
                                  ),
                                  child: Text(l10n.backToCampaign),
                                ),
                              ),
                              SizedBox(height: tokens.spaceMd),
                            ],
                            SizedBox(
                              height: 48,
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: options.choices.isEmpty
                                    ? null
                                    : _openConfirm,
                                child: Text(l10n.reviewPledge),
                              ),
                            ),
                          ],
                        ),
    );
  }
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard({
    required this.choice,
    required this.campaign,
    required this.selected,
    required this.onTap,
  });

  final CommitmentChoice choice;
  final Campaign campaign;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final title = choiceDisplayName(choice);
    final subtitle = choiceSubtitle(l10n, choice, campaign);
    final scheme = Theme.of(context).colorScheme;

    return Semantics(
      button: true,
      selected: selected,
      label: '$title. $subtitle',
      child: Material(
        color: selected
            ? scheme.primaryContainer
            : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(tokens.radiusCard),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(tokens.radiusCard),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: EdgeInsets.all(tokens.spaceLg),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                    color: scheme.primary,
                  ),
                  SizedBox(width: tokens.spaceMd),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        SizedBox(height: tokens.spaceXs),
                        Text(subtitle),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ConfirmStep extends StatelessWidget {
  const _ConfirmStep({
    required this.campaign,
    required this.choice,
    required this.targetText,
    required this.busy,
    required this.onBack,
    required this.onConfirm,
    this.error,
  });

  final Campaign campaign;
  final CommitmentChoice choice;
  final String targetText;
  final bool busy;
  final String? error;
  final VoidCallback onBack;
  final VoidCallback? onConfirm;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    num? target;
    try {
      target = resolveCommitmentTarget(
        choice: choice,
        campaign: campaign,
        manualTargetText: targetText,
      );
    } on FormatException {
      target = null;
    }

    return ListView(
      padding: EdgeInsets.all(tokens.spaceLg),
      children: [
        Text(
          l10n.confirmPledgeHeading,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        SizedBox(height: tokens.spaceMd),
        Text(l10n.confirmPledgeBody(
          choiceDisplayName(choice),
          formatCampaignDates(campaign),
        )),
        SizedBox(height: tokens.spaceMd),
        if (target != null)
          Text(
            l10n.achievedOfTarget(
              '0',
              formatNumber(target),
              choice.canonicalUnit,
            ),
          ),
        if (error != null) ...[
          SizedBox(height: tokens.spaceMd),
          Text(
            error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        SizedBox(height: tokens.spaceXl),
        SizedBox(
          height: 48,
          width: double.infinity,
          child: FilledButton(
            onPressed: onConfirm,
            child: Text(
              busy ? l10n.joiningInProgress : l10n.confirmJoinAndPledge,
            ),
          ),
        ),
        SizedBox(height: tokens.spaceMd),
        SizedBox(
          height: 48,
          width: double.infinity,
          child: OutlinedButton(
            onPressed: busy ? null : onBack,
            child: Text(l10n.backToChoices),
          ),
        ),
        SizedBox(height: tokens.spaceMd),
        SizedBox(
          height: 48,
          width: double.infinity,
          child: TextButton(
            onPressed: busy
                ? null
                : () => context.go('/campaigns/${campaign.id}'),
            child: Text(l10n.backToCampaign),
          ),
        ),
      ],
    );
  }
}
