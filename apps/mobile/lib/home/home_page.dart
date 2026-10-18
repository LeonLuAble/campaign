import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../session/session_controller.dart';
import '../util/format.dart';

class _HomeCampaignRow {
  const _HomeCampaignRow({
    required this.campaign,
    required this.enrolled,
    this.progress,
  });

  final Campaign campaign;
  final bool enrolled;
  final ParticipantProgress? progress;
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  List<_HomeCampaignRow> _rows = const [];
  var _loading = true;
  String? _error;
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
    final session = ApiScope.of(context).session;
    final customerId = session.customer?.id;
    final userId = session.profile?.id;
    if (customerId == null) {
      setState(() {
        _rows = const [];
        _loading = false;
        _error = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final client = ApiScope.of(context).client;
      final campaigns = await client.listCampaigns(customerId);
      final visible = campaigns
          .where(
            (row) =>
                row.status == 'published' ||
                row.status == 'started' ||
                row.status == 'completed',
          )
          .toList();
      final rows = <_HomeCampaignRow>[];
      for (final campaign in visible) {
        var enrolled = false;
        ParticipantProgress? progress;
        if (userId != null) {
          try {
            final parts = await client.listParticipations(campaign.id);
            final mine = parts.where(
              (row) => row.userId == userId && row.status == 'enrolled',
            );
            if (mine.isNotEmpty) {
              enrolled = true;
              try {
                progress = await client.getProgress(mine.first.id);
              } catch (_) {}
            }
          } catch (_) {}
        }
        rows.add(
          _HomeCampaignRow(
            campaign: campaign,
            enrolled: enrolled,
            progress: progress,
          ),
        );
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _rows = rows;
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

  String _progressLabel(AppLocalizations l10n, ParticipantProgress? progress) {
    if (progress == null) {
      return l10n.homeProgressUnavailable;
    }
    final percent = progress.completionPercent ?? 0;
    if (percent > 100 || progress.completionStatus == 'exceeded') {
      return l10n.dashboardProgressStatusExceeded;
    }
    if (percent >= 100 || progress.completionStatus == 'achieved') {
      return l10n.dashboardProgressStatusAchieved;
    }
    if (percent <= 0) {
      return l10n.dashboardProgressStatusNotStarted;
    }
    return l10n.dashboardProgressStatusInProgress;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final tokens = AppTokens.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.navHome),
        actions: [
          IconButton(
            tooltip: l10n.openNotifications,
            onPressed: () => context.push('/notifications'),
            icon: const Icon(Icons.notifications_outlined),
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: session,
        builder: (context, _) {
          return RefreshIndicator(
            onRefresh: _load,
            child: _buildBody(l10n, session, tokens),
          );
        },
      ),
    );
  }

  Widget _buildBody(
    AppLocalizations l10n,
    SessionController session,
    AppTokens tokens,
  ) {
    if (_loading && _rows.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.all(tokens.spaceLg),
        children: const [LoadingSkeleton(lines: 6)],
      );
    }
    if (_error != null && _rows.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.all(tokens.spaceLg),
        children: [
          ErrorState(
            message: _error!,
            onRetry: _load,
            retryLabel: l10n.retry,
          ),
        ],
      );
    }

    final customer = session.customer;
    if (customer == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.all(tokens.spaceLg),
        children: [
          EmptyState(message: l10n.noOrganisationLinked),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(tokens.spaceLg),
      children: [
        Text(
          customer.name,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (session.selectedCommunityName != null) ...[
          SizedBox(height: tokens.spaceXs),
          Text(
            l10n.homeCommunityLabel(session.selectedCommunityName!),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
        if (session.customers.length > 1) ...[
          SizedBox(height: tokens.spaceMd),
          DropdownButtonFormField<String>(
            // ignore: deprecated_member_use
            value: customer.id,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: l10n.switchOrganisation,
              border: const OutlineInputBorder(),
            ),
            items: [
              for (final row in session.customers)
                DropdownMenuItem(value: row.id, child: Text(row.name)),
            ],
            onChanged: (id) async {
              if (id == null) {
                return;
              }
              final next =
                  session.customers.firstWhere((row) => row.id == id);
              await session.selectCustomer(next);
              await _load();
            },
          ),
        ],
        if (session.selectableCommunities.length > 1) ...[
          SizedBox(height: tokens.spaceMd),
          DropdownButtonFormField<String>(
            // ignore: deprecated_member_use
            value: session.selectedCommunityId,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: l10n.switchCommunity,
              border: const OutlineInputBorder(),
            ),
            items: [
              for (final row in session.selectableCommunities)
                DropdownMenuItem(value: row.id, child: Text(row.name)),
            ],
            onChanged: (id) {
              session.selectCommunity(id);
            },
          ),
        ],
        SizedBox(height: tokens.spaceLg),
        Text(
          l10n.homeCampaignsHeading,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        SizedBox(height: tokens.spaceSm),
        if (_rows.isEmpty)
          EmptyState(message: l10n.noCampaigns)
        else
          for (final row in _rows) ...[
            _CampaignCard(
              row: row,
              statusLabel: _statusLabel(l10n, row.campaign.status),
              statusIcon: _statusIcon(row.campaign.status),
              progressLabel: _progressLabel(l10n, row.progress),
              enrolledLabel: l10n.enrolledLabel,
              canJoinLabel: l10n.homeCanJoinLabel,
              onTap: () => context.push('/campaigns/${row.campaign.id}'),
            ),
            SizedBox(height: tokens.spaceMd),
          ],
      ],
    );
  }
}

class _CampaignCard extends StatelessWidget {
  const _CampaignCard({
    required this.row,
    required this.statusLabel,
    required this.statusIcon,
    required this.progressLabel,
    required this.enrolledLabel,
    required this.canJoinLabel,
    required this.onTap,
  });

  final _HomeCampaignRow row;
  final String statusLabel;
  final IconData statusIcon;
  final String progressLabel;
  final String enrolledLabel;
  final String canJoinLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final percent = row.progress?.completionPercent?.toDouble() ?? 0;
    final ratio = percent / 100;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(tokens.radiusCard),
        child: Padding(
          padding: EdgeInsets.all(tokens.spaceLg),
          child: Row(
            children: [
              if (row.enrolled)
                ProgressRing(
                  completion: ratio,
                  label: progressLabel,
                  size: 72,
                )
              else
                Icon(
                  Icons.flag_outlined,
                  size: 48,
                  color: Theme.of(context).colorScheme.primary,
                ),
              SizedBox(width: tokens.spaceLg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row.campaign.name,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    SizedBox(height: tokens.spaceXs),
                    StatusChip(label: statusLabel, icon: statusIcon),
                    SizedBox(height: tokens.spaceXs),
                    Text(row.enrolled ? enrolledLabel : canJoinLabel),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
