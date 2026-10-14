import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class CampaignDetailPage extends StatefulWidget {
  const CampaignDetailPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<CampaignDetailPage> createState() => _CampaignDetailPageState();
}

class _CampaignDetailPageState extends State<CampaignDetailPage> {
  Campaign? _campaign;
  Participation? _participation;
  String? _error;
  bool _busy = false;

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
    final client = ApiScope.of(context).client;
    final userId = ApiScope.of(context).session.profile?.id;
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
      setState(() {
        _campaign = campaign;
        _participation = mine;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    }
  }

  Future<void> _join() async {
    setState(() => _busy = true);
    try {
      final participation = await ApiScope.of(context).client.joinCampaign(
        widget.campaignId,
      );
      setState(() => _participation = participation);
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final campaign = _campaign;
    return Scaffold(
      appBar: AppBar(title: Text(campaign?.name ?? l10n.campaignsTitle)),
      body: campaign == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Text(_error!),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null) Text(_error!),
                Text(campaign.description ?? campaign.name),
                const SizedBox(height: 8),
                Text(campaign.status),
                if (_participation?.isEnrolled == true)
                  Text(l10n.enrolledLabel)
                else if (_participation?.status == 'withdrawn')
                  Text(l10n.withdrawnLabel),
                const SizedBox(height: 16),
                if (campaign.canJoin && _participation?.isEnrolled != true)
                  FilledButton(
                    onPressed: _busy ? null : _join,
                    child: Text(l10n.joinCampaign),
                  ),
                if (_participation?.isEnrolled == true) ...[
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () =>
                        context.go('/campaigns/${widget.campaignId}/pledge'),
                    child: Text(l10n.openPledge),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () =>
                        context.go('/campaigns/${widget.campaignId}/record'),
                    child: Text(l10n.openRecord),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () =>
                        context.go('/campaigns/${widget.campaignId}/progress'),
                    child: Text(l10n.openProgress),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () =>
                        context.go('/campaigns/${widget.campaignId}/dashboard'),
                    child: Text(l10n.openDashboard),
                  ),
                ],
              ],
            ),
    );
  }
}
