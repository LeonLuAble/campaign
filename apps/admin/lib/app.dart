import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'config/app_config.dart';
import 'config/app_config_scope.dart';
import 'l10n/app_localizations.dart';
import 'routing/app_router.dart';

class CampaignAdminApp extends StatefulWidget {
  const CampaignAdminApp({required this.config, this.locale, super.key});

  final AppConfig config;
  final Locale? locale;

  @override
  State<CampaignAdminApp> createState() => _CampaignAdminAppState();
}

class _CampaignAdminAppState extends State<CampaignAdminApp> {
  late final GoRouter _router = createRouter();

  @override
  Widget build(BuildContext context) {
    return AppConfigScope(
      config: widget.config,
      child: MaterialApp.router(
        locale: widget.locale,
        onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1F4E79)),
        ),
        routerConfig: _router,
      ),
    );
  }
}
