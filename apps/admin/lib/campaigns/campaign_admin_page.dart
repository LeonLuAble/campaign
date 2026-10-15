import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

class CampaignAdminPage extends StatefulWidget {
  const CampaignAdminPage({
    required this.customerId,
    required this.campaignId,
    super.key,
  });

  final String customerId;
  final String campaignId;

  @override
  State<CampaignAdminPage> createState() => _CampaignAdminPageState();
}

class _CampaignAdminPageState extends State<CampaignAdminPage> {
  Campaign? _campaign;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_campaign == null && _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final campaign = await ApiScope.of(context).client.getCampaign(
        widget.campaignId,
      );
      setState(() => _campaign = campaign);
    } catch (error) {
      setState(
        () => _error = localizeApiError(AppLocalizations.of(context), error),
      );
    }
  }

  Future<void> _publish() async {
    final campaign = await ApiScope.of(context).client.publishCampaign(
      widget.campaignId,
    );
    setState(() => _campaign = campaign);
  }

  Future<void> _start() async {
    final campaign = await ApiScope.of(context).client.startCampaign(
      widget.campaignId,
    );
    setState(() => _campaign = campaign);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final campaign = _campaign;
    final prefix =
        '/customers/${widget.customerId}/campaigns/${widget.campaignId}';
    if (campaign == null) {
      return _error == null
          ? const AdminLoadingState()
          : AdminErrorState(message: _error!);
    }
    return AdminPageBody(
      child: ListView(
        children: [
          AdminPageHeader(
            title: campaign.name,
            subtitle: campaign.status,
          ),
          if (campaign.isDraft)
            FilledButton(
              onPressed: _publish,
              child: Text(l10n.publishCampaign),
            ),
          if (campaign.status == 'published')
            FilledButton(
              onPressed: _start,
              child: Text(l10n.startCampaign),
            ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () => context.push('$prefix/participants'),
            child: Text(l10n.openParticipants),
          ),
          OutlinedButton(
            onPressed: () => context.push('$prefix/submissions'),
            child: Text(l10n.openSubmissions),
          ),
          OutlinedButton(
            onPressed: () => context.push('$prefix/impact-factors'),
            child: Text(l10n.openImpactFactors),
          ),
          OutlinedButton(
            onPressed: () => context.push('$prefix/dashboard'),
            child: Text(l10n.openCampaignDashboard),
          ),
          OutlinedButton(
            onPressed: () => context.push('$prefix/report'),
            child: Text(l10n.openCampaignReport),
          ),
        ],
      ),
    );
  }
}
