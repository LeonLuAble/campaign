import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'config/app_config.dart';
import 'config/app_config_scope.dart';
import 'l10n/app_localizations.dart';
import 'locale/app_locales.dart';
import 'locale/locale_scope.dart';
import 'routing/app_router.dart';
import 'session/api_scope.dart';
import 'session/session_controller.dart';

class CampaignApp extends StatefulWidget {
  const CampaignApp({
    required this.config,
    this.locale,
    this.apiClient,
    this.tokenStore,
    this.session,
    super.key,
  });

  final AppConfig config;
  final Locale? locale;
  final CampaignApiClient? apiClient;
  final TokenStore? tokenStore;
  final SessionController? session;

  @override
  State<CampaignApp> createState() => _CampaignAppState();
}

class _CampaignAppState extends State<CampaignApp> {
  late final CampaignApiClient _client;
  late final SessionController _session;
  late final GoRouter _router;
  Locale? _override;
  var _ownsSession = false;

  @override
  void initState() {
    super.initState();
    final store = widget.tokenStore ?? MemoryTokenStore();
    _client =
        widget.apiClient ??
        HttpCampaignApiClient(
          baseUrl: widget.config.apiBaseUrl,
          tokenStore: store,
          localeProvider: () => AppLocales.toApi(_override ?? widget.locale ?? AppLocales.en),
          onSessionExpired: () {
            _session.expireLocalSession();
          },
        );
    _session = widget.session ?? SessionController(api: _client);
    _ownsSession = widget.session == null;
    _router = createRouter(session: _session);
    _session.restore();
  }

  @override
  void dispose() {
    _router.dispose();
    if (_ownsSession) {
      _session.dispose();
    }
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant CampaignApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.locale != widget.locale) {
      _override = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = _override ?? widget.locale ?? AppLocales.en;
    return AppConfigScope(
      config: widget.config,
      child: ApiScope(
        client: _client,
        session: _session,
        child: LocaleScope(
          locale: locale,
          onLocaleChanged: (next) => setState(() => _override = next),
          child: MaterialApp.router(
            locale: locale,
            onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(
                seedColor: const Color(0xFF1F4E79),
              ),
            ),
            routerConfig: _router,
          ),
        ),
      ),
    );
  }
}
