import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';
import '../locale/locale_scope.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class CustomerListPage extends StatefulWidget {
  const CustomerListPage({super.key});

  @override
  State<CustomerListPage> createState() => _CustomerListPageState();
}

class _CustomerListPageState extends State<CustomerListPage> {
  final _name = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    if (_name.text.trim().isEmpty) {
      setState(() => _error = l10n.nameRequired);
      return;
    }
    try {
      await ApiScope.of(context).client.createCustomer(name: _name.text.trim());
      await ApiScope.of(context).session.refreshCustomers();
      _name.clear();
      setState(() => _error = null);
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final localeScope = LocaleScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.customersTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (session.customers.isEmpty) Text(l10n.noCustomers),
          ...session.customers.map(
            (customer) => Card(
              child: ListTile(
                title: Text(customer.name),
                onTap: () => context.push('/customers/${customer.id}'),
              ),
            ),
          ),
          if (session.isPlatformAdmin) ...[
            const SizedBox(height: 16),
            TextField(
              controller: _name,
              decoration: InputDecoration(labelText: l10n.customerNameLabel),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _create,
              child: Text(l10n.createCustomer),
            ),
          ],
          if (_error != null) Text(_error!),
          const SizedBox(height: 24),
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
                  await session.applyLocale(AppLocales.toApi(AppLocales.zhHans));
                },
                child: Text(l10n.languageChinese),
              ),
            ],
          ),
          TextButton(
            onPressed: () => session.logout(),
            child: Text(l10n.logout),
          ),
        ],
      ),
    );
  }
}
