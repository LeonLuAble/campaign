import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'notification_models.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({this.items, super.key});

  final List<InAppNotificationData>? items;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final notifications = items ?? const <InAppNotificationData>[];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.notificationsTitle)),
      body: notifications.isEmpty
          ? Center(child: Text(l10n.emptyNotifications))
          : ListView.separated(
              itemCount: notifications.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final item = notifications[index];
                return ListTile(
                  title: Text(item.title),
                  subtitle: Text(item.body),
                  trailing: Text(item.read ? l10n.readLabel : l10n.unreadLabel),
                );
              },
            ),
    );
  }
}
