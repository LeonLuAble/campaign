import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class ParticipantsPage extends StatefulWidget {
  const ParticipantsPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<ParticipantsPage> createState() => _ParticipantsPageState();
}

class _ParticipantsPageState extends State<ParticipantsPage> {
  List<Participation> _rows = const [];
  String? _error;
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading) {
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final rows = await ApiScope.of(context).client.listParticipations(
        widget.campaignId,
      );
      setState(() {
        _rows = rows;
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
      appBar: AppBar(title: Text(l10n.participantsTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                if (_error != null) ListTile(title: Text(_error!)),
                ..._rows.map(
                  (row) => ListTile(
                    title: Text(row.userId),
                    subtitle: Text(row.status),
                  ),
                ),
              ],
            ),
    );
  }
}
