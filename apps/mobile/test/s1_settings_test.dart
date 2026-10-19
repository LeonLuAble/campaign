import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:community_campaign/preferences/app_settings.dart';
import 'package:community_campaign/preferences/memory_preferences_store.dart';
import 'package:community_campaign/preferences/preferences_controller.dart';
import 'package:community_campaign/session/session_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_preferences.dart';

const _config = AppConfig(
  environment: 'test',
  apiBaseUrl: 'http://localhost:3000/api/v1',
);

Future<void> _pump(
  WidgetTester tester, {
  required PreferencesController preferences,
  CampaignApiClient? api,
  SessionController? session,
  TokenStore? tokenStore,
  Locale? locale,
  String? initialLocation,
  double textScale = 1,
}) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  if (textScale != 1) {
    tester.platformDispatcher.textScaleFactorTestValue = textScale;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }
  await tester.pumpWidget(
    CampaignApp(
      config: _config,
      preferences: preferences,
      locale: locale ?? preferences.settings.locale,
      apiClient: api ?? FakeCampaignApiClient(),
      tokenStore: tokenStore ?? MemoryTokenStore(),
      session: session,
      initialLocation: initialLocation,
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _signIn(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField).at(0), 'member@example.com');
  await tester.enterText(find.byType(TextField).at(1), 'password123');
  await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('first launch shows welcome', (tester) async {
    final preferences = await testPreferences(onboardingComplete: false);
    await _pump(tester, preferences: preferences);

    expect(find.text('Continue to sign in'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);
    expect(preferences.onboardingComplete, isFalse);
  });

  testWidgets('completing welcome skips it on the next launch', (tester) async {
    final store = MemoryPreferencesStore(
      const AppSettings(
        schemaVersion: AppSettings.currentSchemaVersion,
        localeTag: 'en',
        onboardingComplete: false,
      ),
    );
    final first = PreferencesController(store: store);
    await first.load();
    await _pump(tester, preferences: first);

    await tester.tap(find.widgetWithText(FilledButton, 'Continue to sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(first.onboardingComplete, isTrue);
    expect(store.snapshot.onboardingComplete, isTrue);

    final second = PreferencesController(store: store);
    await second.load();
    await _pump(tester, preferences: second);

    expect(find.text('Continue to sign in'), findsNothing);
    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Email or mobile'), findsOneWidget);
  });

  testWidgets('locale persists and restores before UI', (tester) async {
    final store = MemoryPreferencesStore(
      const AppSettings(
        schemaVersion: AppSettings.currentSchemaVersion,
        localeTag: 'zh-Hans',
        onboardingComplete: true,
      ),
    );
    final preferences = PreferencesController(store: store);
    await preferences.load();
    expect(preferences.settings.localeTag, 'zh-Hans');

    await _pump(
      tester,
      preferences: preferences,
      initialLocation: '/login',
    );

    expect(find.text('登录'), findsWidgets);
    expect(find.text('邮箱或手机号'), findsOneWidget);
  });

  testWidgets('sign-in language shortcut changes and persists locale', (
    tester,
  ) async {
    final preferences = await testPreferences(
      onboardingComplete: true,
      locale: AppLocales.en,
    );
    await _pump(
      tester,
      preferences: preferences,
      initialLocation: '/login',
    );

    expect(find.text('Email or mobile'), findsOneWidget);
    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('简体中文').last);
    await tester.pumpAndSettle();

    expect(preferences.settings.localeTag, 'zh-Hans');
    expect(find.text('邮箱或手机号'), findsOneWidget);
  });

  testWidgets('Settings language change persists and updates UI', (
    tester,
  ) async {
    final api = FakeCampaignApiClient();
    final preferences = await testPreferences(
      onboardingComplete: true,
      locale: AppLocales.en,
    );
    await _pump(
      tester,
      preferences: preferences,
      api: api,
      initialLocation: '/login',
    );
    await _signIn(tester);

    expect(api.profile.locale, 'en');

    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('简体中文'));
    await tester.pumpAndSettle();

    expect(preferences.settings.localeTag, 'zh-Hans');
    expect(api.profile.locale, 'zh-Hans');
    expect(find.text('设置'), findsWidgets);
  });

  testWidgets('activation deep link still works after onboarding', (
    tester,
  ) async {
    final preferences = await testPreferences(onboardingComplete: true);
    await _pump(
      tester,
      preferences: preferences,
      initialLocation: '/activate?token=invite-ok',
    );

    expect(find.text('Activate account'), findsWidgets);
    await tester.enterText(find.byType(TextField).at(0), 'invite-ok');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Activate'));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Email or mobile'), findsOneWidget);
  });

  testWidgets('en Settings at text scale 2.0 does not overflow', (tester) async {
    final api = FakeCampaignApiClient();
    final store = MemoryTokenStore();
    api.tokenStore = store;
    await api.login(identifier: 'member@example.com', password: 'password123');
    final session = SessionController(api: api);
    await session.restore();
    final preferences = await testPreferences(
      onboardingComplete: true,
      locale: AppLocales.en,
    );
    await _pump(
      tester,
      preferences: preferences,
      api: api,
      session: session,
      tokenStore: store,
      initialLocation: '/settings',
      textScale: 2,
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Settings'), findsWidgets);
    expect(find.text('Language'), findsOneWidget);
  });

  testWidgets('zh Settings at text scale 2.0 does not overflow', (tester) async {
    final api = FakeCampaignApiClient();
    final store = MemoryTokenStore();
    api.tokenStore = store;
    await api.login(identifier: 'member@example.com', password: 'password123');
    final session = SessionController(api: api);
    await session.restore();
    final preferences = await testPreferences(
      onboardingComplete: true,
      locale: AppLocales.zhHans,
    );
    await _pump(
      tester,
      preferences: preferences,
      api: api,
      session: session,
      tokenStore: store,
      locale: AppLocales.zhHans,
      initialLocation: '/settings',
      textScale: 2,
    );

    expect(tester.takeException(), isNull);
    expect(find.text('设置'), findsWidgets);
    expect(find.text('语言'), findsOneWidget);
  });
}
