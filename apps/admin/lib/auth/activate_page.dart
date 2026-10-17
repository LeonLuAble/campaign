import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

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
  String? _message;
  var _busy = false;
  var _success = false;

  @override
  void initState() {
    super.initState();
    _token = TextEditingController(text: widget.initialToken ?? '');
  }

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _activate() async {
    final l10n = AppLocalizations.of(context);
    if (_token.text.trim().isEmpty) {
      setState(() {
        _message = l10n.tokenRequired;
        _success = false;
      });
      return;
    }
    if (_password.text.length < 8) {
      setState(() {
        _message = l10n.passwordTooShort;
        _success = false;
      });
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ApiScope.of(context).client.activate(
        token: _token.text.trim(),
        password: _password.text,
      );
      setState(() {
        _success = true;
        _message = l10n.activateSuccess;
      });
    } catch (error) {
      setState(() {
        _success = false;
        _message = localizeApiError(l10n, error);
      });
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);

    if (_success) {
      return PageScaffold(
        title: l10n.activateTitle,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _message ?? l10n.activateSuccess,
              style: theme.textTheme.bodyLarge,
            ),
            SizedBox(height: tokens.spaceLg),
            FilledButton(
              onPressed: () => context.go('/login'),
              child: Text(l10n.goToLogin),
            ),
          ],
        ),
      );
    }

    return PageScaffold(
      title: l10n.activateTitle,
      body: ListView(
        children: [
          Text(l10n.activateSubtitle),
          SizedBox(height: tokens.spaceMd),
          TextField(
            controller: _token,
            decoration: InputDecoration(labelText: l10n.activationTokenLabel),
          ),
          SizedBox(height: tokens.spaceMd),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.newPasswordLabel),
          ),
          SizedBox(height: tokens.spaceMd),
          FilledButton(
            onPressed: _busy ? null : _activate,
            child: Text(l10n.activateButton),
          ),
          if (_message != null) ...[
            SizedBox(height: tokens.spaceMd),
            Text(
              _message!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ],
          SizedBox(height: tokens.spaceLg),
          TextButton(
            onPressed: () => context.go('/login'),
            child: Text(l10n.goToLogin),
          ),
        ],
      ),
    );
  }
}
