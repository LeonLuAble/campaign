import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

/// Extracts an activation token from a raw token or an `/activate?token=` link.
String? extractActivationToken(String input) {
  final trimmed = input.trim();
  if (trimmed.isEmpty) {
    return null;
  }
  final uri = Uri.tryParse(trimmed);
  if (uri != null) {
    final queryToken = uri.queryParameters['token'];
    if (queryToken != null && queryToken.isNotEmpty) {
      return queryToken;
    }
    if (uri.fragment.contains('token=')) {
      final frag = Uri.splitQueryString(uri.fragment);
      final fragToken = frag['token'];
      if (fragToken != null && fragToken.isNotEmpty) {
        return fragToken;
      }
    }
  }
  final match = RegExp(r'token=([^&\s#]+)').firstMatch(trimmed);
  if (match != null) {
    return Uri.decodeComponent(match.group(1)!);
  }
  return trimmed;
}

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
  bool _success = false;

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
    final token = extractActivationToken(_token.text);
    if (token == null || token.isEmpty) {
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
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.activate(
        token: token,
        password: _password.text,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _success = true;
        _message = l10n.activateSuccess;
      });
      // API does not return a session; sign-in next.
      context.go('/login');
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

  Future<void> _resend() async {
    final l10n = AppLocalizations.of(context);
    if (!looksLikeIdentifier(_identifier.text)) {
      setState(() {
        _message = l10n.identifierRequired;
        _success = false;
      });
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.resendActivation(
        _identifier.text.trim(),
      );
      setState(() {
        _success = true;
        _message = l10n.acceptedMessage;
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

    return Scaffold(
      appBar: AppBar(title: Text(l10n.activateTitle)),
      body: ListView(
        padding: EdgeInsets.all(tokens.spaceXl),
        children: [
          Text(l10n.activateIntro),
          SizedBox(height: tokens.spaceMd),
          TextField(
            controller: _token,
            decoration: InputDecoration(
              labelText: l10n.activationTokenLabel,
              hintText: l10n.activationTokenHint,
              border: const OutlineInputBorder(),
            ),
          ),
          SizedBox(height: tokens.spaceMd),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(
              labelText: l10n.newPasswordLabel,
              border: const OutlineInputBorder(),
            ),
          ),
          SizedBox(height: tokens.spaceLg),
          SizedBox(
            height: 48,
            child: FilledButton(
              onPressed: _busy ? null : _activate,
              child: Text(l10n.activateButton),
            ),
          ),
          SizedBox(height: tokens.spaceXl),
          Text(l10n.resendActivationHint),
          SizedBox(height: tokens.spaceSm),
          TextField(
            controller: _identifier,
            decoration: InputDecoration(
              labelText: l10n.identifierLabel,
              border: const OutlineInputBorder(),
            ),
          ),
          SizedBox(height: tokens.spaceMd),
          SizedBox(
            height: 48,
            child: OutlinedButton(
              onPressed: _busy ? null : _resend,
              child: Text(l10n.resendActivation),
            ),
          ),
          if (_message != null) ...[
            SizedBox(height: tokens.spaceMd),
            Text(
              _message!,
              style: TextStyle(
                color: _success
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.error,
              ),
            ),
          ],
          SizedBox(height: tokens.spaceLg),
          SizedBox(
            height: 48,
            child: TextButton(
              onPressed: () => context.go('/login'),
              child: Text(l10n.backToSignIn),
            ),
          ),
        ],
      ),
    );
  }
}
