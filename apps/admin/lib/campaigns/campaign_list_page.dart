import 'dart:async';

import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';
import 'campaign_dates.dart';

class _CampaignRow {
  const _CampaignRow({
    required this.campaign,
    required this.participantCount,
  });

  final Campaign campaign;
  final int participantCount;
}

class AdminCampaignListPage extends StatefulWidget {
  const AdminCampaignListPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<AdminCampaignListPage> createState() => _AdminCampaignListPageState();
}

class _AdminCampaignListPageState extends State<AdminCampaignListPage> {
  final _search = TextEditingController();
  Timer? _debounce;

  List<_CampaignRow> _rows = const [];
  var _loading = true;
  String? _error;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
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
      final campaigns = await client.listCampaigns(widget.customerId);
      final counts = <String, int>{};
      await Future.wait(
        campaigns.map((campaign) async {
          try {
            final parts = await client.listParticipations(campaign.id);
            counts[campaign.id] =
                parts.where((row) => row.status == 'enrolled').length;
          } catch (_) {
            counts[campaign.id] = 0;
          }
        }),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _rows = [
          for (final campaign in campaigns)
            _CampaignRow(
              campaign: campaign,
              participantCount: counts[campaign.id] ?? 0,
            ),
        ];
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

  List<_CampaignRow> get _filtered {
    final q = _search.text.trim().toLowerCase();
    return _rows.where((row) {
      if (_statusFilter != null && row.campaign.status != _statusFilter) {
        return false;
      }
      if (q.isEmpty) {
        return true;
      }
      return row.campaign.name.toLowerCase().contains(q) ||
          (row.campaign.description ?? '').toLowerCase().contains(q);
    }).toList();
  }

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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final rows = _filtered;

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.campaignsTitle,
            actions: [
              FilledButton(
                onPressed: () => context.push(
                  '/customers/${widget.customerId}/campaigns/new',
                ),
                child: Text(l10n.newCampaign),
              ),
            ],
          ),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              SizedBox(
                width: 280,
                child: TextField(
                  controller: _search,
                  decoration: InputDecoration(
                    labelText: l10n.campaignSearchHint,
                    prefixIcon: const Icon(Icons.search),
                    border: const OutlineInputBorder(),
                  ),
                  onChanged: (_) {
                    _debounce?.cancel();
                    _debounce = Timer(const Duration(milliseconds: 200), () {
                      setState(() {});
                    });
                  },
                ),
              ),
              SizedBox(
                width: 260,
                child: DropdownButtonFormField<String?>(
                  // ignore: deprecated_member_use
                  value: _statusFilter,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: l10n.campaignFilterStatus,
                    border: const OutlineInputBorder(),
                  ),
                  items: [
                    DropdownMenuItem<String?>(
                      value: null,
                      child: Text(
                        l10n.campaignFilterAll,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    for (final status in const [
                      'draft',
                      'published',
                      'started',
                      'completed',
                    ])
                      DropdownMenuItem<String?>(
                        value: status,
                        child: Text(
                          _statusLabel(l10n, status),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  onChanged: (value) => setState(() => _statusFilter = value),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: AppDataTable<_CampaignRow>(
              loading: _loading,
              errorMessage: _error,
              onRetry: _load,
              retryLabel: l10n.retry,
              emptyMessage: l10n.noCampaigns,
              columns: [
                AppDataColumn(id: 'name', label: l10n.campaignColumnName, flex: 3),
                AppDataColumn(
                  id: 'status',
                  label: l10n.campaignColumnStatus,
                  flex: 2,
                ),
                AppDataColumn(
                  id: 'dates',
                  label: l10n.campaignColumnDates,
                  flex: 3,
                ),
                AppDataColumn(
                  id: 'participants',
                  label: l10n.campaignColumnParticipants,
                  flex: 1,
                  numeric: true,
                ),
              ],
              rows: rows,
              onRowTap: (row) => context.push(
                '/customers/${widget.customerId}/campaigns/${row.campaign.id}',
              ),
              cellsBuilder: (context, row) {
                final range = formatCampaignDateRange(
                  row.campaign.startsOn,
                  row.campaign.endsOn,
                  locale,
                );
                return [
                  Text(row.campaign.name),
                  StatusChip(
                    label: _statusLabel(l10n, row.campaign.status),
                    icon: _statusIcon(row.campaign.status),
                  ),
                  Text(range.isEmpty ? l10n.campaignDatesUnset : range),
                  Text(l10n.campaignParticipantCount(row.participantCount)),
                ];
              },
            ),
          ),
        ],
      ),
    );
  }
}
