import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class PasswordResetPage extends StatefulWidget {
  const PasswordResetPage({this.initialToken, super.key});

  final String? initialToken;

  @override
  State<PasswordResetPage> createState() => _PasswordResetPageState();
}

class _PasswordResetPageState extends State<PasswordResetPage> {
  final _identifier = TextEditingController();
  late final TextEditingController _token;
  final _password = TextEditingController();
  String? _message;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _token = TextEditingController(text: widget.initialToken ?? '');
  }

  @override
  void dispose() {
    _identifier.dispose();
    _token.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _request() async {
    final l10n = AppLocalizations.of(context);
    if (!looksLikeIdentifier(_identifier.text)) {
      setState(() => _message = l10n.identifierRequired);
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.requestPasswordReset(
        _identifier.text.trim(),
      );
      setState(() => _message = l10n.acceptedMessage);
    } catch (error) {
      setState(() => _message = localizeApiError(l10n, error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _confirm() async {
    final l10n = AppLocalizations.of(context);
    if (_token.text.trim().isEmpty) {
      setState(() => _message = l10n.tokenRequired);
      return;
    }
    if (_password.text.length < 8) {
      setState(() => _message = l10n.passwordTooShort);
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.confirmPasswordReset(
        token: _token.text.trim(),
        password: _password.text,
      );
      if (mounted) {
        context.go('/login');
      }
    } catch (error) {
      setState(() => _message = localizeApiError(l10n, error));
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
      appBar: AppBar(title: Text(l10n.resetPasswordTitle)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(
            controller: _identifier,
            decoration: InputDecoration(labelText: l10n.identifierLabel),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _busy ? null : _request,
            child: Text(l10n.requestReset),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _token,
            decoration: InputDecoration(labelText: l10n.resetTokenLabel),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.newPasswordLabel),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _confirm,
            child: Text(l10n.confirmReset),
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
