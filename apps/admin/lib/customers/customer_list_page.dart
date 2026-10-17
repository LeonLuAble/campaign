import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';
import 'package:api_client/api_client.dart';

class CustomerListPage extends StatefulWidget {
  const CustomerListPage({super.key});

  @override
  State<CustomerListPage> createState() => _CustomerListPageState();
}

class _CustomerListPageState extends State<CustomerListPage> {
  final _name = TextEditingController();
  final _adminName = TextEditingController();
  final _adminEmail = TextEditingController();
  String? _error;
  var _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _adminName.dispose();
    _adminEmail.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    if (_name.text.trim().isEmpty) {
      setState(() => _error = l10n.nameRequired);
      return;
    }
    if (_adminEmail.text.trim().isEmpty ||
        !_adminEmail.text.contains('@')) {
      setState(() => _error = l10n.adminEmailRequired);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final created = await ApiScope.of(context).client.createCustomer(
            name: _name.text.trim(),
            initialAdmin: CreateCustomerInitialAdmin(
              email: _adminEmail.text.trim(),
              displayName: _adminName.text.trim().isEmpty
                  ? null
                  : _adminName.text.trim(),
            ),
          );
      if (!mounted) {
        return;
      }
      await ApiScope.of(context).session.refreshCustomers();
      _name.clear();
      _adminName.clear();
      _adminEmail.clear();
      setState(() => _busy = false);
      if (created.activationToken != null) {
        await _showActivationDialog(created.activationToken!);
      }
    } catch (error) {
      setState(() {
        _busy = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  Future<void> _showActivationDialog(String token) async {
    final l10n = AppLocalizations.of(context);
    final origin = Uri.base.origin;
    final link = '$origin/activate?token=${Uri.encodeComponent(token)}';
    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(l10n.activationLinkTitle),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.activationLinkNote),
              const SizedBox(height: 12),
              SelectableText(link),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: link));
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.copiedToClipboard)),
                  );
                }
              },
              child: Text(l10n.copyLink),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(l10n.close),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;

    if (!session.isPlatformAdmin) {
      final customer = session.customer ??
          (session.customers.isNotEmpty ? session.customers.first : null);
      if (customer != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (context.mounted) {
            context.go('/customers/${customer.id}');
          }
        });
      }
      return AdminPageBody(
        child: AdminEmptyState(message: l10n.noCustomers),
      );
    }

    return AdminPageBody(
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AdminPageHeader(title: l10n.customersTitle),
            if (session.customers.isEmpty)
              AdminEmptyState(message: l10n.noCustomers)
            else
              ...session.customers.map(
                (customer) => Card(
                  child: ListTile(
                    title: Text(customer.name),
                    onTap: () async {
                      await session.selectCustomer(customer);
                      if (context.mounted) {
                        context.go('/customers/${customer.id}');
                      }
                    },
                  ),
                ),
              ),
            const SizedBox(height: 24),
            Text(
              l10n.createCustomer,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _name,
              decoration: InputDecoration(labelText: l10n.customerNameLabel),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _adminName,
              decoration: InputDecoration(labelText: l10n.adminNameLabel),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _adminEmail,
              decoration: InputDecoration(labelText: l10n.adminEmailLabel),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _busy ? null : _create,
              child: Text(l10n.createCustomer),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
