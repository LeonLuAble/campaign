import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

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
    final session = ApiScope.of(context).session;
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
    session.clearSessionEndedCode();
    try {
      await session.login(
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
      _error = l10n.errorSocialTokenInvalid;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final config = AppConfigScope.of(context);
    final tokens = AppTokens.of(context);
    final session = ApiScope.of(context).session;
    final displayError = _error ??
        (session.sessionEndedCode == 'TOKEN_REUSED'
            ? l10n.errorTokenReused
            : null);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.loginTitle)),
      body: ListView(
        padding: EdgeInsets.all(tokens.spaceXl),
        children: [
          TextField(
            controller: _identifier,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: l10n.identifierLabel,
              border: const OutlineInputBorder(),
            ),
          ),
          SizedBox(height: tokens.spaceMd),
          TextField(
            controller: _password,
            obscureText: true,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _busy ? null : _submit(),
            decoration: InputDecoration(
              labelText: l10n.passwordLabel,
              border: const OutlineInputBorder(),
            ),
          ),
          if (displayError != null) ...[
            SizedBox(height: tokens.spaceMd),
            Text(
              displayError,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          SizedBox(height: tokens.spaceLg),
          SizedBox(
            height: 48,
            child: FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(l10n.loginButton),
            ),
          ),
          if (config.googleSignInEnabled) ...[
            SizedBox(height: tokens.spaceMd),
            SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _busy ? null : () => _social('google'),
                child: Text(l10n.googleSignIn),
              ),
            ),
          ],
          if (config.appleSignInEnabled) ...[
            SizedBox(height: tokens.spaceMd),
            SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _busy ? null : () => _social('apple'),
                child: Text(l10n.appleSignIn),
              ),
            ),
          ],
          SizedBox(height: tokens.spaceLg),
          SizedBox(
            height: 48,
            child: TextButton(
              onPressed: () => context.go('/activate'),
              child: Text(l10n.activateLink),
            ),
          ),
          SizedBox(
            height: 48,
            child: TextButton(
              onPressed: () => context.go('/reset-password'),
              child: Text(l10n.forgotPassword),
            ),
          ),
          SizedBox(
            height: 48,
            child: TextButton(
              onPressed: () => context.go('/welcome'),
              child: Text(l10n.welcomeBackLink),
            ),
          ),
        ],
      ),
    );
  }
}
