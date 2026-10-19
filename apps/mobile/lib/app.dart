import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import 'config/app_config.dart';
import 'config/app_config_scope.dart';
import 'l10n/app_localizations.dart';
import 'locale/app_locales.dart';
import 'locale/locale_scope.dart';
import 'preferences/preferences_controller.dart';
import 'preferences/preferences_scope.dart';
import 'routing/app_router.dart';
import 'session/api_scope.dart';
import 'session/session_controller.dart';

class CampaignApp extends StatefulWidget {
  const CampaignApp({
    required this.config,
    required this.preferences,
    this.locale,
    this.apiClient,
    this.tokenStore,
    this.session,
    this.initialLocation,
    super.key,
  });

  final AppConfig config;
  final PreferencesController preferences;

  /// Optional override for tests. Defaults to [preferences] settings locale.
  final Locale? locale;
  final CampaignApiClient? apiClient;
  final TokenStore? tokenStore;
  final SessionController? session;

  /// Override for widget tests (e.g. skip welcome and open `/login`).
  final String? initialLocation;

  @override
  State<CampaignApp> createState() => _CampaignAppState();
}

class _CampaignAppState extends State<CampaignApp> {
  late final CampaignApiClient _client;
  late final SessionController _session;
  late final GoRouter _router;
  late final PreferencesController _preferences;
  Locale? _override;
  var _ownsSession = false;
  var _ownsPreferencesListener = false;

  @override
  void initState() {
    super.initState();
    _preferences = widget.preferences;
    _override = widget.locale ?? _preferences.settings.locale;
    _preferences.addListener(_onPreferencesChanged);
    _ownsPreferencesListener = true;

    final store = widget.tokenStore ?? SecureTokenStore();
    _client =
        widget.apiClient ??
        HttpCampaignApiClient(
          baseUrl: widget.config.apiBaseUrl,
          tokenStore: store,
          localeProvider: () => AppLocales.toApi(_resolvedLocale),
          onSessionExpired: () {
            _session.expireLocalSession(code: 'TOKEN_REUSED');
          },
        );
    final client = _client;
    if (client is FakeCampaignApiClient) {
      client.tokenStore ??= store;
      client.onSessionExpired ??= () {
        _session.expireLocalSession(code: 'TOKEN_REUSED');
      };
    }
    _session = widget.session ?? SessionController(api: _client);
    _ownsSession = widget.session == null;
    _router = createRouter(
      session: _session,
      preferences: _preferences,
      initialLocation: widget.initialLocation,
    );
    _session.restore();
  }

  void _onPreferencesChanged() {
    if (!mounted) {
      return;
    }
    setState(() {
      _override = _preferences.settings.locale;
    });
  }

  Locale get _resolvedLocale =>
      _override ?? widget.locale ?? _preferences.settings.locale;

  @override
  void dispose() {
    if (_ownsPreferencesListener) {
      _preferences.removeListener(_onPreferencesChanged);
    }
    _router.dispose();
    if (_ownsSession) {
      _session.dispose();
    }
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant CampaignApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.locale != widget.locale && widget.locale != null) {
      _override = widget.locale;
    }
  }

  Future<void> _changeLocale(Locale next) async {
    setState(() => _override = next);
    await _preferences.setLocale(next);
  }

  @override
  Widget build(BuildContext context) {
    final locale = _resolvedLocale;
    return AppConfigScope(
      config: widget.config,
      child: PreferencesScope(
        controller: _preferences,
        child: ApiScope(
          client: _client,
          session: _session,
          child: LocaleScope(
            locale: locale,
            onLocaleChanged: (next) {
              _changeLocale(next);
            },
            child: MaterialApp.router(
              locale: locale,
              onGenerateTitle: (context) =>
                  AppLocalizations.of(context).appTitle,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              theme: AppTheme.light(),
              routerConfig: _router,
            ),
          ),
        ),
      ),
    );
  }
}
