import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

/// Campaign discovery list for the Campaigns tab.
class CampaignsTabPage extends StatefulWidget {
  const CampaignsTabPage({super.key});

  @override
  State<CampaignsTabPage> createState() => _CampaignsTabPageState();
}

class _CampaignsTabPageState extends State<CampaignsTabPage> {
  List<Campaign> _campaigns = const [];
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
    final customerId = ApiScope.of(context).session.customer?.id;
    if (customerId == null) {
      setState(() {
        _campaigns = const [];
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final campaigns =
          await ApiScope.of(context).client.listCampaigns(customerId);
      if (!mounted) {
        return;
      }
      setState(() {
        _campaigns = campaigns
            .where(
              (row) =>
                  row.status == 'published' ||
                  row.status == 'started' ||
                  row.status == 'completed',
            )
            .toList();
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

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.campaignsTitle)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading && _campaigns.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(tokens.spaceLg),
                children: const [LoadingSkeleton(lines: 5)],
              )
            : _error != null && _campaigns.isEmpty
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
                : _campaigns.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: EdgeInsets.all(tokens.spaceLg),
                        children: [
                          EmptyState(message: l10n.noCampaigns),
                        ],
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: EdgeInsets.all(tokens.spaceLg),
                        itemCount: _campaigns.length,
                        separatorBuilder: (context, index) =>
                            SizedBox(height: tokens.spaceMd),
                        itemBuilder: (context, index) {
                          final campaign = _campaigns[index];
                          return Card(
                            child: ListTile(
                              contentPadding: EdgeInsets.all(tokens.spaceMd),
                              title: Text(campaign.name),
                              subtitle: Padding(
                                padding: EdgeInsets.only(top: tokens.spaceSm),
                                child: StatusChip(
                                  label: _statusLabel(l10n, campaign.status),
                                  icon: _statusIcon(campaign.status),
                                ),
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () =>
                                  context.push('/campaigns/${campaign.id}'),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
