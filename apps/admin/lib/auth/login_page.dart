import 'package:flutter/material.dart';

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
    if (!looksLikeIdentifier(_identifier.text)) {
      setState(() => _error = l10n.identifierRequired);
      return;
    }
    if (_password.text.length < 8) {
      setState(() => _error = l10n.passwordTooShort);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiScope.of(context).session.login(
        identifier: _identifier.text.trim(),
        password: _password.text,
      );
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.loginTitle)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(
            controller: _identifier,
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
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(l10n.loginButton),
          ),
        ],
      ),
    );
  }
}
