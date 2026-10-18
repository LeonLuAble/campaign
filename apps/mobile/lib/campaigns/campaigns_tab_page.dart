import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../session/session_controller.dart';
import '../util/format.dart';
import 'campaign_helpers.dart';

class _CampaignRow {
  const _CampaignRow({
    required this.campaign,
    required this.enrolled,
  });

  final Campaign campaign;
  final bool enrolled;
}

/// Campaign discovery list: Joined, Open to join, and Past.
class CampaignsTabPage extends StatefulWidget {
  const CampaignsTabPage({super.key});

  @override
  State<CampaignsTabPage> createState() => _CampaignsTabPageState();
}

class _CampaignsTabPageState extends State<CampaignsTabPage> {
  List<_CampaignRow> _rows = const [];
  var _loading = true;
  String? _error;
  String? _loadedForCustomerId;
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
    final customerId = session.customer?.id;
    final userId = session.profile?.id;
    if (_loadedForCustomerId == customerId &&
        _loadedForUserId == userId &&
        !_loading) {
      return;
    }
    _load();
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final customerId = session.customer?.id;
    final userId = session.profile?.id;
    _loadedForCustomerId = customerId;
    _loadedForUserId = userId;
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
      final rows = <_CampaignRow>[];
      for (final campaign in visible) {
        var enrolled = false;
        if (userId != null) {
          try {
            final parts = await client.listParticipations(campaign.id);
            enrolled = parts.any(
              (row) => row.userId == userId && row.isEnrolled,
            );
          } catch (_) {}
        }
        rows.add(_CampaignRow(campaign: campaign, enrolled: enrolled));
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
        _error = localizeApiError(l10n, error);
        _loading = false;
      });
    }
  }

  List<_CampaignRow> get _joined => _rows
      .where(
        (row) =>
            row.enrolled &&
            (row.campaign.status == 'published' ||
                row.campaign.status == 'started'),
      )
      .toList();

  List<_CampaignRow> get _open => _rows
      .where(
        (row) =>
            !row.enrolled &&
            (row.campaign.status == 'published' ||
                row.campaign.status == 'started'),
      )
      .toList();

  List<_CampaignRow> get _past =>
      _rows.where((row) => row.campaign.status == 'completed').toList();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.campaignsTitle)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading && _rows.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(tokens.spaceLg),
                children: const [LoadingSkeleton(lines: 5)],
              )
            : _error != null && _rows.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.all(tokens.spaceLg),
                    children: [
                      ErrorState(
                        message: _error!,
                        onRetry: _load,
                        retryLabel: l10n.retry,
                      ),
                    ],
                  )
                : _rows.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: EdgeInsets.all(tokens.spaceLg),
                        children: [
                          EmptyState(message: l10n.noCampaigns),
                        ],
                      )
                    : ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: EdgeInsets.all(tokens.spaceLg),
                        children: [
                          _Section(
                            title: l10n.sectionJoined,
                            emptyMessage: l10n.emptyJoinedCampaigns,
                            rows: _joined,
                          ),
                          SizedBox(height: tokens.spaceXl),
                          _Section(
                            title: l10n.sectionOpenToJoin,
                            emptyMessage: l10n.emptyOpenCampaigns,
                            rows: _open,
                          ),
                          SizedBox(height: tokens.spaceXl),
                          _Section(
                            title: l10n.sectionPast,
                            emptyMessage: l10n.emptyPastCampaigns,
                            rows: _past,
                          ),
                        ],
                      ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.emptyMessage,
    required this.rows,
  });

  final String title;
  final String emptyMessage;
  final List<_CampaignRow> rows;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        SizedBox(height: tokens.spaceSm),
        if (rows.isEmpty)
          EmptyState(message: emptyMessage)
        else
          for (final row in rows) ...[
            Card(
              child: ListTile(
                contentPadding: EdgeInsets.all(tokens.spaceMd),
                title: Text(row.campaign.name),
                subtitle: Padding(
                  padding: EdgeInsets.only(top: tokens.spaceSm),
                  child: Wrap(
                    spacing: tokens.spaceSm,
                    runSpacing: tokens.spaceXs,
                    children: [
                      StatusChip(
                        label: campaignStatusLabel(l10n, row.campaign.status),
                        icon: campaignStatusIcon(row.campaign.status),
                      ),
                      if (row.enrolled)
                        StatusChip(
                          label: l10n.enrolledLabel,
                          icon: Icons.person_outline,
                        ),
                    ],
                  ),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/campaigns/${row.campaign.id}'),
                minVerticalPadding: 16,
              ),
            ),
            SizedBox(height: tokens.spaceMd),
          ],
      ],
    );
  }
}
