import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class ActivatePage extends StatefulWidget {
  const ActivatePage({this.initialToken, super.key});

  final String? initialToken;

  @override
  State<ActivatePage> createState() => _ActivatePageState();
}

class _ActivatePageState extends State<ActivatePage> {
  late final TextEditingController _token;
  final _password = TextEditingController();
  final _identifier = TextEditingController();
  String? _message;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _token = TextEditingController(text: widget.initialToken ?? '');
  }

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    _identifier.dispose();
    super.dispose();
  }

  Future<void> _activate() async {
    final l10n = AppLocalizations.of(context);
    if (_token.text.trim().isEmpty) {
      setState(() => _message = l10n.tokenRequired);
      return;
    }
    if (_password.text.isNotEmpty && _password.text.length < 8) {
      setState(() => _message = l10n.passwordTooShort);
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.activate(
        token: _token.text.trim(),
        password: _password.text.isEmpty ? null : _password.text,
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

  Future<void> _resend() async {
    final l10n = AppLocalizations.of(context);
    if (!looksLikeIdentifier(_identifier.text)) {
      setState(() => _message = l10n.identifierRequired);
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.resendActivation(_identifier.text.trim());
      setState(() => _message = l10n.acceptedMessage);
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
      appBar: AppBar(title: Text(l10n.activateTitle)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(
            controller: _token,
            decoration: InputDecoration(labelText: l10n.activationTokenLabel),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.newPasswordLabel),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _activate,
            child: Text(l10n.activateButton),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _identifier,
            decoration: InputDecoration(labelText: l10n.identifierLabel),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _busy ? null : _resend,
            child: Text(l10n.resendActivation),
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
