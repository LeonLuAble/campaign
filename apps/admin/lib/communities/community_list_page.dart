import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

class CommunityListPage extends StatefulWidget {
  const CommunityListPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<CommunityListPage> createState() => _CommunityListPageState();
}

class _CommunityListPageState extends State<CommunityListPage> {
  List<Community> _communities = const [];
  final _name = TextEditingController();
  String? _error;
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading) {
      _load();
    }
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final rows = await ApiScope.of(context).client.listCommunities(
        widget.customerId,
      );
      setState(() {
        _communities = rows;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = localizeApiError(AppLocalizations.of(context), error);
        _loading = false;
      });
    }
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    if (_name.text.trim().isEmpty) {
      setState(() => _error = l10n.nameRequired);
      return;
    }
    try {
      await ApiScope.of(context).client.createCommunity(
        customerId: widget.customerId,
        name: _name.text.trim(),
      );
      _name.clear();
      await _load();
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const AdminLoadingState();
    }
    if (_error != null && _communities.isEmpty) {
      return AdminErrorState(message: _error!, onRetry: _load);
    }
    return AdminPageBody(
      child: ListView(
        children: [
          AdminPageHeader(title: l10n.communitiesTitle),
          if (_communities.isEmpty)
            AdminEmptyState(message: l10n.noCommunities)
          else
            AdminDataList(
              itemCount: _communities.length,
              itemBuilder: (context, index) => Card(
                child: ListTile(title: Text(_communities[index].name)),
              ),
            ),
          const SizedBox(height: 16),
          TextField(
            controller: _name,
            decoration: InputDecoration(labelText: l10n.communityNameLabel),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _create,
            child: Text(l10n.createCommunity),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!),
          ],
        ],
      ),
    );
  }
}
