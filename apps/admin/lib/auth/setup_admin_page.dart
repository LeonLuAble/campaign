import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class SetupAdminPage extends StatefulWidget {
  const SetupAdminPage({super.key});

  @override
  State<SetupAdminPage> createState() => _SetupAdminPageState();
}

class _SetupAdminPageState extends State<SetupAdminPage> {
  final _setupKey = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _displayName = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _setupKey.dispose();
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _displayName.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    if (_setupKey.text.trim().length < 32) {
      setState(() => _error = l10n.setupKeyRequired);
      return;
    }
    if (!looksLikeEmail(_email.text)) {
      setState(() => _error = l10n.setupEmailRequired);
      return;
    }
    if (_password.text.length < 8) {
      setState(() => _error = l10n.passwordTooShort);
      return;
    }
    if (_password.text != _confirmPassword.text) {
      setState(() => _error = l10n.setupPasswordMismatch);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiScope.of(context).session.completeSetup(
        setupKey: _setupKey.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        displayName: _displayName.text.trim().isEmpty
            ? null
            : _displayName.text.trim(),
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
      appBar: AppBar(title: Text(l10n.setupTitle)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(l10n.setupSubtitle),
          const SizedBox(height: 16),
          TextField(
            controller: _setupKey,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.setupKeyLabel),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: l10n.setupEmailLabel),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.passwordLabel),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmPassword,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.setupConfirmPasswordLabel),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _displayName,
            decoration: InputDecoration(labelText: l10n.setupDisplayNameLabel),
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
            child: Text(l10n.setupSubmitButton),
          ),
        ],
      ),
    );
  }
}
