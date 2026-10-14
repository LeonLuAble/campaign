import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import 'dashboard_view.dart';

class ParticipantDashboardPage extends StatefulWidget {
  const ParticipantDashboardPage({
    this.campaignId,
    this.data,
    super.key,
  });

  final String? campaignId;
  final ParticipantDashboard? data;

  @override
  State<ParticipantDashboardPage> createState() =>
      _ParticipantDashboardPageState();
}

class _ParticipantDashboardPageState extends State<ParticipantDashboardPage> {
  ParticipantDashboard? _data;
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
    if (_data == null && widget.campaignId != null && !_loading && _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    final campaignId = widget.campaignId;
    if (campaignId == null) {
      return;
    }
    setState(() => _loading = true);
    final client = ApiScope.of(context).client;
    final userId = ApiScope.of(context).session.profile?.id;
    try {
      final rows = await client.listParticipations(campaignId);
      final mine = rows.where((row) => row.userId == userId && row.isEnrolled);
      if (mine.isEmpty) {
        setState(() {
          _loading = false;
          _data = null;
        });
        return;
      }
      final dashboard = await client.getParticipantDashboard(mine.first.id);
      setState(() {
        _data = dashboard;
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
      appBar: AppBar(title: Text(l10n.participantDashboardTitle)),
      body: _error != null
          ? Center(child: Text(_error!))
          : _loading
          ? const Center(child: CircularProgressIndicator())
          : ParticipantDashboardView(data: _data),
    );
  }
}
