import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/app_config_scope.dart';
import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final identifier = _identifier.text.trim();
    final password = _password.text;
    if (!looksLikeIdentifier(identifier)) {
      setState(() => _error = l10n.identifierRequired);
      return;
    }
    if (password.length < 8) {
      setState(() => _error = l10n.passwordTooShort);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiScope.of(context).session.login(
        identifier: identifier,
        password: password,
      );
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _social(String provider) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = l10n.errorSocialTokenInvalid;
      _busy = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final config = AppConfigScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.loginTitle)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(
            controller: _identifier,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: l10n.identifierLabel),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.passwordLabel),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(l10n.loginButton),
          ),
          if (config.googleSignInEnabled) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _busy ? null : () => _social('google'),
              child: Text(l10n.googleSignIn),
            ),
          ],
          if (config.appleSignInEnabled) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _busy ? null : () => _social('apple'),
              child: Text(l10n.appleSignIn),
            ),
          ],
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => context.go('/activate'),
            child: Text(l10n.activateLink),
          ),
          TextButton(
            onPressed: () => context.go('/reset-password'),
            child: Text(l10n.forgotPassword),
          ),
        ],
      ),
    );
  }
}
