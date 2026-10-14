import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class AdminCampaignListPage extends StatefulWidget {
  const AdminCampaignListPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<AdminCampaignListPage> createState() => _AdminCampaignListPageState();
}

class _AdminCampaignListPageState extends State<AdminCampaignListPage> {
  List<Campaign> _campaigns = const [];
  bool _loading = true;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading) {
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final rows = await ApiScope.of(context).client.listCampaigns(
        widget.customerId,
      );
      setState(() {
        _campaigns = rows;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = localizeApiError(AppLocalizations.of(context), error);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.campaignsTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                FilledButton(
                  onPressed: () => context.push(
                    '/customers/${widget.customerId}/campaigns/new',
                  ),
                  child: Text(l10n.createCampaign),
                ),
                if (_campaigns.isEmpty) Text(l10n.noCampaigns),
                ..._campaigns.map(
                  (campaign) => ListTile(
                    title: Text(campaign.name),
                    subtitle: Text(campaign.status),
                    onTap: () => context.push(
                      '/customers/${widget.customerId}/campaigns/${campaign.id}',
                    ),
                  ),
                ),
                if (_error != null) Text(_error!),
              ],
            ),
    );
  }
}
