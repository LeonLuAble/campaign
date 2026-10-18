import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../campaigns/community_helpers.dart';
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
      final items =
          await ApiScope.of(context).client.listNotifications(customerId);
      if (!mounted) {
        return;
      }
      setState(() {
        _items = items;
        _error = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _error = localizeApiError(AppLocalizations.of(context), error),
      );
    }
  }

  Future<void> _open(InboxNotification item) async {
    final customerId = ApiScope.of(context).session.customer?.id;
    if (customerId != null && !item.isRead) {
      final updated = await ApiScope.of(context).client.markNotificationRead(
        customerId: customerId,
        notificationId: item.id,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _items = [
          for (final row in _items ?? const <InboxNotification>[])
            if (row.id == item.id) updated else row,
        ];
      });
    }
    if (!mounted) {
      return;
    }
    // Inbox payloads have no campaignId; celebration types return to Home / Today.
    if (isCelebrationNotification(item) || item.type == 'action_reminder') {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final notifications = _items;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.notificationsTitle)),
      body: _error != null
          ? ListView(
              padding: EdgeInsets.all(tokens.spaceLg),
              children: [
                ErrorState(
                  message: _error!,
                  onRetry: _load,
                  retryLabel: l10n.retry,
                ),
              ],
            )
          : notifications == null
              ? ListView(
                  padding: EdgeInsets.all(tokens.spaceLg),
                  children: const [LoadingSkeleton(lines: 4)],
                )
              : notifications.isEmpty
                  ? ListView(
                      padding: EdgeInsets.all(tokens.spaceLg),
                      children: [
                        EmptyState(message: l10n.emptyNotifications),
                      ],
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        itemCount: notifications.length,
                        separatorBuilder: (context, index) =>
                            const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final item = notifications[index];
                          return ListTile(
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: tokens.spaceLg,
                              vertical: tokens.spaceSm,
                            ),
                            leading: Icon(
                              item.isRead
                                  ? Icons.notifications_none
                                  : Icons.notifications_active_outlined,
                            ),
                            title: Text(item.title),
                            subtitle: Text(item.body),
                            trailing: Text(
                              item.isRead ? l10n.readLabel : l10n.unreadLabel,
                            ),
                            onTap: () => _open(item),
                            minVerticalPadding: 16,
                          );
                        },
                      ),
                    ),
    );
  }
}
