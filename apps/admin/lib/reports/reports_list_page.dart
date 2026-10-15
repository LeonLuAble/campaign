import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

class ReportsListPage extends StatefulWidget {
  const ReportsListPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<ReportsListPage> createState() => _ReportsListPageState();
}

class _ReportsListPageState extends State<ReportsListPage> {
  List<Campaign>? _campaigns;
  String? _error;
  var _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows =
          await ApiScope.of(context).client.listCampaigns(widget.customerId);
      if (!mounted) {
        return;
      }
      setState(() {
        _campaigns = rows;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = localizeApiError(AppLocalizations.of(context), error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const AdminLoadingState();
    }
    if (_error != null) {
      return AdminErrorState(message: _error!, onRetry: _load);
    }
    final campaigns = _campaigns ?? const [];
    return AdminPageBody(
      child: ListView(
        children: [
          AdminPageHeader(title: l10n.reportsTitle),
          if (campaigns.isEmpty)
            AdminEmptyState(message: l10n.noCampaigns)
          else
            AdminDataList(
              itemCount: campaigns.length,
              itemBuilder: (context, index) {
                final campaign = campaigns[index];
                return Card(
                  child: ListTile(
                    title: Text(campaign.name),
                    subtitle: Text(campaign.status),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push(
                      '/customers/${widget.customerId}/campaigns/${campaign.id}/report',
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
