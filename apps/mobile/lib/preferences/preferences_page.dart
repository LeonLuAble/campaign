import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';
import '../locale/locale_scope.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class PreferencesPage extends StatefulWidget {
  const PreferencesPage({super.key});

  @override
  State<PreferencesPage> createState() => _PreferencesPageState();
}

class _PreferencesPageState extends State<PreferencesPage> {
  final _timezone = TextEditingController();
  final _reminderTime = TextEditingController();
  bool _remindersEnabled = true;
  bool _loading = true;
  String? _message;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading) {
      _load();
    }
  }

  @override
  void dispose() {
    _timezone.dispose();
    _reminderTime.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final session = ApiScope.of(context).session;
    try {
      final prefs = await ApiScope.of(context).client.getNotificationPreferences();
      setState(() {
        _timezone.text = session.profile?.timezone ?? '';
        _reminderTime.text = prefs.reminderLocalTime;
        _remindersEnabled = prefs.remindersEnabled;
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _message = localizeApiError(AppLocalizations.of(context), error);
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    final locale = AppLocales.toApi(LocaleScope.of(context).locale);
    setState(() => _message = null);
    try {
      await ApiScope.of(context).session.applyLocale(locale);
      if (!mounted) {
        return;
      }
      if (_timezone.text.trim().isNotEmpty) {
        await ApiScope.of(context).client.updateMe(
          timezone: _timezone.text.trim(),
        );
      }
      if (!mounted) {
        return;
      }
      await ApiScope.of(context).client.updateNotificationPreferences(
        remindersEnabled: _remindersEnabled,
        reminderLocalTime: _reminderTime.text.trim().isEmpty
            ? null
            : _reminderTime.text.trim(),
      );
      setState(() => _message = l10n.savePreferences);
    } catch (error) {
      setState(() => _message = localizeApiError(l10n, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final localeScope = LocaleScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.preferencesTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(l10n.languageLabel),
                Wrap(
                  spacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: () =>
                          localeScope.onLocaleChanged(AppLocales.en),
                      child: Text(l10n.languageEnglish),
                    ),
                    OutlinedButton(
                      onPressed: () =>
                          localeScope.onLocaleChanged(AppLocales.zhHans),
                      child: Text(l10n.languageChinese),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _timezone,
                  decoration: InputDecoration(labelText: l10n.timezoneLabel),
                ),
                SwitchListTile(
                  title: Text(l10n.remindersEnabled),
                  value: _remindersEnabled,
                  onChanged: (value) => setState(() => _remindersEnabled = value),
                ),
                TextField(
                  controller: _reminderTime,
                  decoration: InputDecoration(labelText: l10n.reminderTime),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _save,
                  child: Text(l10n.savePreferences),
                ),
                if (_message != null) ...[
                  const SizedBox(height: 12),
                  Text(_message!),
                ],
              ],
            ),
    );
  }
}
