import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import 'dashboard_view.dart';

class AggregateDashboardPage extends StatefulWidget {
  const AggregateDashboardPage({
    required this.scope,
    this.campaignId,
    this.communityId,
    this.data,
    super.key,
  });

  final String scope;
  final String? campaignId;
  final String? communityId;
  final AggregateDashboard? data;

  @override
  State<AggregateDashboardPage> createState() => _AggregateDashboardPageState();
}

class _AggregateDashboardPageState extends State<AggregateDashboardPage> {
  AggregateDashboard? _data;
  String? _error;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _data = widget.data;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_data == null &&
        widget.campaignId != null &&
        !_loading &&
        _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    final campaignId = widget.campaignId;
    if (campaignId == null) {
      return;
    }
    setState(() => _loading = true);
    try {
      final client = ApiScope.of(context).client;
      final data = widget.communityId == null
          ? await client.getCampaignDashboard(campaignId)
          : await client.getCommunityDashboard(
              campaignId: campaignId,
              communityId: widget.communityId!,
            );
      setState(() {
        _data = data;
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
    final title = widget.scope == 'community'
        ? l10n.communityDashboardTitle
        : l10n.campaignDashboardTitle;
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: _error != null
          ? Center(child: Text(_error!))
          : _loading
          ? const Center(child: CircularProgressIndicator())
          : AggregateDashboardView(data: _data),
    );
  }
}
