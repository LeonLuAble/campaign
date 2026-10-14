import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

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
    return Scaffold(
      appBar: AppBar(title: Text(l10n.communitiesTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_communities.isEmpty) Text(l10n.noCommunities),
                ..._communities.map((row) => ListTile(title: Text(row.name))),
                TextField(
                  controller: _name,
                  decoration: InputDecoration(labelText: l10n.communityNameLabel),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _create,
                  child: Text(l10n.createCommunity),
                ),
                if (_error != null) Text(_error!),
              ],
            ),
    );
  }
}
