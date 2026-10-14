import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';

class CustomerHomePage extends StatelessWidget {
  const CustomerHomePage({required this.customerId, super.key});

  final String customerId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final customers = ApiScope.of(context).session.customers;
    final name = customers
        .where((row) => row.id == customerId)
        .map((row) => row.name)
        .firstWhere((row) => true, orElse: () => l10n.customersTitle);
    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          FilledButton(
            onPressed: () => context.push('/customers/$customerId/communities'),
            child: Text(l10n.openCommunities),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => context.push('/customers/$customerId/import'),
            child: Text(l10n.openImport),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => context.push('/customers/$customerId/campaigns'),
            child: Text(l10n.openCampaigns),
          ),
        ],
      ),
    );
  }
}
