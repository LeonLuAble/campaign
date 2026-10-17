import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

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
  var _busy = false;
  var _confirmed = false;
  var _isError = false;

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
      setState(() {
        _message = l10n.identifierRequired;
        _isError = true;
      });
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
      _isError = false;
    });
    try {
      await ApiScope.of(context).client.requestPasswordReset(
        _identifier.text.trim(),
      );
      setState(() {
        _message = l10n.acceptedMessage;
        _isError = false;
      });
    } catch (error) {
      setState(() {
        _message = localizeApiError(l10n, error);
        _isError = true;
      });
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _confirm() async {
    final l10n = AppLocalizations.of(context);
    if (_token.text.trim().isEmpty) {
      setState(() {
        _message = l10n.tokenRequired;
        _isError = true;
      });
      return;
    }
    if (_password.text.length < 8) {
      setState(() {
        _message = l10n.passwordTooShort;
        _isError = true;
      });
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
      _isError = false;
    });
    try {
      await ApiScope.of(context).client.confirmPasswordReset(
        token: _token.text.trim(),
        password: _password.text,
      );
      setState(() {
        _confirmed = true;
        _message = l10n.resetSuccess;
        _isError = false;
      });
    } catch (error) {
      setState(() {
        _message = localizeApiError(l10n, error);
        _isError = true;
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

    if (_confirmed) {
      return PageScaffold(
        title: l10n.resetPasswordTitle,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _message ?? l10n.resetSuccess,
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
      title: l10n.resetPasswordTitle,
      body: ListView(
        children: [
          if (widget.initialToken == null) ...[
            Text(l10n.resetRequestSubtitle),
            SizedBox(height: tokens.spaceMd),
            TextField(
              controller: _identifier,
              decoration: InputDecoration(labelText: l10n.identifierLabel),
            ),
            SizedBox(height: tokens.spaceMd),
            OutlinedButton(
              onPressed: _busy ? null : _request,
              child: Text(l10n.requestReset),
            ),
            SizedBox(height: tokens.spaceXl),
          ],
          Text(
            widget.initialToken != null
                ? l10n.resetConfirmSubtitle
                : l10n.resetConfirmOptionalSubtitle,
          ),
          SizedBox(height: tokens.spaceMd),
          TextField(
            controller: _token,
            decoration: InputDecoration(labelText: l10n.resetTokenLabel),
          ),
          SizedBox(height: tokens.spaceMd),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.newPasswordLabel),
          ),
          SizedBox(height: tokens.spaceMd),
          FilledButton(
            onPressed: _busy ? null : _confirm,
            child: Text(l10n.confirmReset),
          ),
          if (_message != null) ...[
            SizedBox(height: tokens.spaceMd),
            Text(
              _message!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: _isError ? theme.colorScheme.error : null,
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
