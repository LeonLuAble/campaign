import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({this.items, super.key});

  final List<InboxNotification>? items;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  List<InboxNotification>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _items = widget.items;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_items == null && _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    final customerId = ApiScope.of(context).session.customer?.id;
    if (customerId == null) {
      setState(() => _items = const []);
      return;
    }
    try {
      final items = await ApiScope.of(context).client.listNotifications(customerId);
      setState(() => _items = items);
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    }
  }

  Future<void> _markRead(InboxNotification item) async {
    final customerId = ApiScope.of(context).session.customer?.id;
    if (customerId == null || item.isRead) {
      return;
    }
    final updated = await ApiScope.of(context).client.markNotificationRead(
      customerId: customerId,
      notificationId: item.id,
    );
    setState(() {
      _items = [
        for (final row in _items ?? const <InboxNotification>[])
          if (row.id == item.id) updated else row,
      ];
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final notifications = _items;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.notificationsTitle)),
      body: _error != null
          ? Center(child: Text(_error!))
          : notifications == null
          ? const Center(child: CircularProgressIndicator())
          : notifications.isEmpty
          ? Center(child: Text(l10n.emptyNotifications))
          : ListView.separated(
              itemCount: notifications.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final item = notifications[index];
                return ListTile(
                  title: Text(item.title),
                  subtitle: Text(item.body),
                  trailing: Text(item.isRead ? l10n.readLabel : l10n.unreadLabel),
                  onTap: () => _markRead(item),
                );
              },
            ),
    );
  }
}
