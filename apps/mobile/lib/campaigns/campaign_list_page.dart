import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';
import '../locale/locale_scope.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class CampaignListPage extends StatefulWidget {
  const CampaignListPage({super.key});

  @override
  State<CampaignListPage> createState() => _CampaignListPageState();
}

class _CampaignListPageState extends State<CampaignListPage> {
  List<Campaign>? _campaigns;
  String? _error;
  bool _loading = true;
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
    final session = ApiScope.of(context).session;
    final customerId = session.customer?.id;
    if (customerId == null) {
      setState(() {
        _campaigns = const [];
        _loading = false;
      });
      return;
    }
    try {
      final campaigns = await ApiScope.of(context).client.listCampaigns(customerId);
      setState(() {
        _campaigns = campaigns;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = localizeApiError(AppLocalizations.of(context), error);
        _loading = false;
      });
    }
  }

  String _status(AppLocalizations l10n, String status) {
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final localeScope = LocaleScope.of(context);
    final session = ApiScope.of(context).session;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.campaignsTitle),
        actions: [
          IconButton(
            onPressed: () => context.go('/notifications'),
            tooltip: l10n.openNotifications,
            icon: const Icon(Icons.notifications_outlined),
          ),
          IconButton(
            onPressed: () => context.go('/preferences'),
            tooltip: l10n.openPreferences,
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null) Text(_error!),
                if ((_campaigns ?? const []).isEmpty) Text(l10n.noCampaigns),
                ...(_campaigns ?? const []).map(
                  (campaign) => Card(
                    child: ListTile(
                      title: Text(campaign.name),
                      subtitle: Text(_status(l10n, campaign.status)),
                      onTap: () => context.go('/campaigns/${campaign.id}'),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(l10n.languageLabel),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: () async {
                        localeScope.onLocaleChanged(AppLocales.en);
                        await session.applyLocale(AppLocales.toApi(AppLocales.en));
                      },
                      child: Text(l10n.languageEnglish),
                    ),
                    OutlinedButton(
                      onPressed: () async {
                        localeScope.onLocaleChanged(AppLocales.zhHans);
                        await session.applyLocale(
                          AppLocales.toApi(AppLocales.zhHans),
                        );
                      },
                      child: Text(l10n.languageChinese),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => session.logout(),
                  child: Text(l10n.logout),
                ),
              ],
            ),
    );
  }
}
