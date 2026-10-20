import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import 'check_in_helpers.dart';

/// Daily check-in: one-tap for days, meal count for meals, with stable idempotency.
class CheckInPage extends StatefulWidget {
  const CheckInPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<CheckInPage> createState() => _CheckInPageState();
}

class _CheckInPageState extends State<CheckInPage> {
  Campaign? _campaign;
  Participation? _participation;
  Commitment? _commitment;
  ActionDefinition? _definition;
  List<RecordedAction> _actions = const [];
  List<String> _days = const [];
  String? _selectedDay;
  String? _today;
  String? _error;
  String? _info;
  var _loading = true;
  var _busy = false;
  var _mealCount = 1;
  final _note = TextEditingController();
  /// Kept until the attempt succeeds so retries reuse the same key.
  String? _pendingIdempotencyKey;
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
    _note.dispose();
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
      final fake = client is FakeCampaignApiClient ? client : null;
      final today = campaignToday(campaign, fakeToday: fake?.fakeToday);
      final rows = await client.listParticipations(widget.campaignId);
      Participation? mine;
      for (final row in rows) {
        if (row.userId == userId && row.isEnrolled) {
          mine = row;
          break;
        }
      }
      if (mine == null) {
        setState(() {
          _loading = false;
          _error = l10n.notEnrolledHint;
        });
        return;
      }
      final commitments = await client.listCommitments(mine.id);
      final commitment = commitments.isEmpty ? null : commitments.first;
      final definitions = await client.listActionDefinitions(widget.campaignId);
      final definition = pickDefinitionForUnit(definitions, commitment?.unit);
      final actions = await client.listParticipationActions(mine.id);
      final days = recentCampaignDays(campaign: campaign, today: today);
      if (!mounted) {
        return;
      }
      setState(() {
        _campaign = campaign;
        _participation = mine;
        _commitment = commitment;
        _definition = definition;
        _actions = actions;
        _today = today;
        _days = days;
        _selectedDay = _selectedDay ?? (days.isEmpty ? today : days.first);
        _loading = false;
        if (definition?.unit == 'meals') {
          _mealCount = 1;
        }
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

  bool get _isMeals => _definition?.unit == 'meals';

  RecordedAction? get _selectedAction {
    final day = _selectedDay;
    final definition = _definition;
    if (day == null || definition == null) {
      return null;
    }
    return actionForDay(
      actions: _actions,
      day: day,
      definitionId: definition.id,
    );
  }

  CheckInDayStatus get _status {
    final day = _selectedDay;
    final today = _today;
    if (day == null || today == null) {
      return CheckInDayStatus.notYet;
    }
    return dayStatus(day: day, today: today, action: _selectedAction);
  }

  String _statusLabel(AppLocalizations l10n) {
    switch (_status) {
      case CheckInDayStatus.done:
        return l10n.checkInStatusDone;
      case CheckInDayStatus.pending:
        return l10n.checkInStatusPending;
      case CheckInDayStatus.rejected:
        return l10n.checkInStatusRejected;
      case CheckInDayStatus.notApplicable:
        return l10n.checkInStatusNotApplicable;
      case CheckInDayStatus.notYet:
        return l10n.checkInStatusNotYet;
    }
  }

  String _idempotencyKeyFor(String day, String definitionId) {
    return _pendingIdempotencyKey ??
        '${_participation!.id}-$definitionId-$day';
  }

  Future<void> _submit({required num quantity}) async {
    final l10n = AppLocalizations.of(context);
    final participation = _participation;
    final definition = _definition;
    final day = _selectedDay;
    if (participation == null || definition == null || day == null) {
      return;
    }
    if (_status == CheckInDayStatus.notApplicable) {
      setState(() => _error = l10n.checkInFutureDisabled);
      return;
    }
    if (_status == CheckInDayStatus.done || _status == CheckInDayStatus.pending) {
      setState(() => _info = l10n.errorAlreadyRecorded);
      return;
    }
    final key = _idempotencyKeyFor(day, definition.id);
    _pendingIdempotencyKey = key;
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      final note = _note.text.trim();
      await ApiScope.of(context).client.recordAction(
        participationId: participation.id,
        actionDefinitionId: definition.id,
        occurredOn: day,
        quantity: quantity,
        idempotencyKey: key,
        payload: note.isEmpty ? null : {'note': note},
      );
      _pendingIdempotencyKey = null;
      _note.clear();
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      if (error is ApiException &&
          (error.code == 'CONFLICT' || error.code == 'SUBMISSION_OVERLAP') &&
          error.message.toLowerCase().contains('already')) {
        setState(() {
          _busy = false;
          _info = l10n.errorAlreadyRecorded;
          _pendingIdempotencyKey = null;
        });
        await _load();
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeApiError(l10n, error);
      });
    } finally {
      if (mounted && _busy) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _undo() async {
    final action = _selectedAction;
    if (action == null) {
      return;
    }
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiScope.of(context).client.cancelAction(action.id);
      _pendingIdempotencyKey = null;
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeApiError(l10n, error);
      });
    } finally {
      if (mounted && _busy) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final campaign = _campaign;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.checkInTitle),
        actions: [
          IconButton(
            tooltip: l10n.openProgress,
            onPressed: () =>
                context.push('/campaigns/${widget.campaignId}/progress'),
            icon: const Icon(Icons.insights_outlined),
          ),
        ],
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
                          Text(
                            campaign.name,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          if (_commitment != null) ...[
                            SizedBox(height: tokens.spaceXs),
                            Text(
                              l10n.checkInPledgeSummary(
                                _commitment!.typeKey ?? '',
                                formatNumber(_commitment!.targetValue),
                                _commitment!.unit,
                              ),
                            ),
                          ],
                          SizedBox(height: tokens.spaceLg),
                          Text(
                            l10n.checkInPickDay,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          SizedBox(height: tokens.spaceSm),
                          SizedBox(
                            height: 48,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: _days.length,
                              separatorBuilder: (context, index) =>
                                  SizedBox(width: tokens.spaceSm),
                              itemBuilder: (context, index) {
                                final day = _days[index];
                                final selected = day == _selectedDay;
                                return Semantics(
                                  button: true,
                                  selected: selected,
                                  label: day,
                                  child: FilterChip(
                                    label: Text(day),
                                    selected: selected,
                                    onSelected: (_) {
                                      setState(() {
                                        _selectedDay = day;
                                        _info = null;
                                        _error = null;
                                      });
                                    },
                                  ),
                                );
                              },
                            ),
                          ),
                          SizedBox(height: tokens.spaceLg),
                          Semantics(
                            liveRegion: true,
                            child: StatusChip(
                              label: _statusLabel(l10n),
                              icon: switch (_status) {
                                CheckInDayStatus.done => Icons.check_circle_outline,
                                CheckInDayStatus.pending => Icons.hourglass_empty,
                                CheckInDayStatus.rejected => Icons.info_outline,
                                CheckInDayStatus.notApplicable =>
                                  Icons.event_busy_outlined,
                                CheckInDayStatus.notYet => Icons.radio_button_unchecked,
                              },
                            ),
                          ),
                          if (_selectedAction?.submission?.status == 'rejected' &&
                              (_selectedAction?.submission?.reviewNote
                                      ?.isNotEmpty ??
                                  false)) ...[
                            SizedBox(height: tokens.spaceSm),
                            Text(
                              l10n.checkInRejectedReason(
                                _selectedAction!.submission!.reviewNote!,
                              ),
                            ),
                          ],
                          if (_selectedAction?.note != null &&
                              _selectedAction!.note!.isNotEmpty) ...[
                            SizedBox(height: tokens.spaceSm),
                            Text(l10n.checkInNoteLabel(_selectedAction!.note!)),
                          ],
                          SizedBox(height: tokens.spaceLg),
                          TextField(
                            controller: _note,
                            minLines: 1,
                            maxLines: 3,
                            enabled: !_busy &&
                                (_status == CheckInDayStatus.notYet ||
                                    _status == CheckInDayStatus.rejected),
                            decoration: InputDecoration(
                              labelText: l10n.checkInOptionalNote,
                              border: const OutlineInputBorder(),
                            ),
                          ),
                          SizedBox(height: tokens.spaceLg),
                          if (_error != null) ...[
                            ErrorState(
                              message: _error!,
                              onRetry: _load,
                              retryLabel: l10n.retry,
                            ),
                            SizedBox(height: tokens.spaceMd),
                          ],
                          if (_info != null) ...[
                            Text(_info!),
                            SizedBox(height: tokens.spaceMd),
                          ],
                          if (_definition == null)
                            EmptyState(message: l10n.checkInNoDefinition)
                          else if (_isMeals) ...[
                            Text(
                              l10n.checkInMealsPrompt,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            SizedBox(height: tokens.spaceSm),
                            SegmentedButton<int>(
                              segments: [
                                for (final n in [1, 2, 3])
                                  ButtonSegment(value: n, label: Text('$n')),
                              ],
                              selected: {_mealCount},
                              onSelectionChanged: _busy
                                  ? null
                                  : (value) =>
                                      setState(() => _mealCount = value.first),
                            ),
                            SizedBox(height: tokens.spaceMd),
                            SizedBox(
                              height: 56,
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _busy ||
                                        _status ==
                                            CheckInDayStatus.notApplicable ||
                                        _status == CheckInDayStatus.done ||
                                        _status == CheckInDayStatus.pending
                                    ? null
                                    : () => _submit(quantity: _mealCount),
                                child: Text(
                                  _busy
                                      ? l10n.checkInSaving
                                      : l10n.checkInSaveMeals,
                                ),
                              ),
                            ),
                          ] else ...[
                            SizedBox(
                              height: 72,
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _busy ||
                                        _status ==
                                            CheckInDayStatus.notApplicable ||
                                        _status == CheckInDayStatus.done ||
                                        _status == CheckInDayStatus.pending
                                    ? null
                                    : () => _submit(quantity: 1),
                                child: Text(
                                  _busy
                                      ? l10n.checkInSaving
                                      : l10n.checkInDidItToday,
                                ),
                              ),
                            ),
                          ],
                          if (_selectedAction != null &&
                              !_selectedAction!.isCancelled) ...[
                            SizedBox(height: tokens.spaceMd),
                            SizedBox(
                              height: 48,
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: _busy ? null : _undo,
                                child: Text(l10n.checkInUndo),
                              ),
                            ),
                          ],
                          SizedBox(height: tokens.spaceXl),
                          SizedBox(
                            height: 48,
                            child: TextButton(
                              onPressed: () => context.go(
                                '/campaigns/${widget.campaignId}/participation',
                              ),
                              child: Text(l10n.backToParticipation),
                            ),
                          ),
                        ],
                      ),
                    ),
    );
  }
}
