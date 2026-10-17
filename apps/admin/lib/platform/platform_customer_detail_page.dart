import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

class PlatformCustomerDetailPage extends StatefulWidget {
  const PlatformCustomerDetailPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<PlatformCustomerDetailPage> createState() =>
      _PlatformCustomerDetailPageState();
}

class _PlatformCustomerDetailPageState
    extends State<PlatformCustomerDetailPage> {
  PlatformCustomerSummary? _summary;
  List<_AdminView> _admins = const [];
  String? _error;
  var _loading = true;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    if (!session.isPlatformAdmin) {
      setState(() {
        _loading = false;
        _error = l10n.errorForbidden;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final client = ApiScope.of(context).client;
      final rows = await client.listPlatformCustomers();
      final match = rows.where((row) => row.id == widget.customerId);
      if (match.isEmpty) {
        throw ApiException(
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'NOT_FOUND',
        );
      }
      final summary = match.first;
      final admins = <_AdminView>[];
      if (client is FakeCampaignApiClient) {
        for (final row in client.platformAdminsFor(widget.customerId)) {
          admins.add(
            _AdminView(
              userId: row.userId,
              email: row.email,
              displayName: row.displayName,
              activationStatus: row.activationStatus,
            ),
          );
        }
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _summary = summary;
        _admins = admins;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        return AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(confirmLabel),
            ),
          ],
        );
      },
    );
    return result ?? false;
  }

  Future<void> _inviteAnother() async {
    final l10n = AppLocalizations.of(context);
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    var locale = 'en';

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(l10n.inviteAdminTitle),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      labelText: l10n.adminNameLabel,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: emailCtrl,
                    decoration: InputDecoration(
                      labelText: l10n.adminEmailLabel,
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 8),
                  InputDecorator(
                    decoration: InputDecoration(
                      labelText: l10n.adminLocaleLabel,
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: locale,
                        isExpanded: true,
                        items: [
                          DropdownMenuItem(
                            value: 'en',
                            child: Text(l10n.languageEnglish),
                          ),
                          DropdownMenuItem(
                            value: 'zh-Hans',
                            child: Text(l10n.languageChinese),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setDialogState(() => locale = value);
                          }
                        },
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text(l10n.cancel),
                ),
                FilledButton(
                  onPressed: () {
                    if (nameCtrl.text.trim().isEmpty ||
                        !looksLikeEmail(emailCtrl.text)) {
                      return;
                    }
                    Navigator.of(context).pop(true);
                  },
                  child: Text(l10n.inviteAdminConfirm),
                ),
              ],
            );
          },
        );
      },
    );

    if (submitted != true || !mounted) {
      nameCtrl.dispose();
      emailCtrl.dispose();
      return;
    }

    final ok = await _confirm(
      title: l10n.inviteAdminTitle,
      body: l10n.inviteAdminConfirmBody(emailCtrl.text.trim()),
      confirmLabel: l10n.inviteAdminConfirm,
    );
    if (!ok || !mounted) {
      nameCtrl.dispose();
      emailCtrl.dispose();
      return;
    }

    setState(() => _busy = true);
    try {
      final result = await ApiScope.of(context).client.invitePlatformAdmin(
            widget.customerId,
            email: emailCtrl.text.trim(),
            displayName: nameCtrl.text.trim(),
            locale: locale,
          );
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        final exists = _admins.any((row) => row.userId == result.userId);
        if (!exists) {
          _admins = [
            ..._admins,
            _AdminView(
              userId: result.userId,
              email: result.email,
              displayName: nameCtrl.text.trim(),
              activationStatus: result.activationStatus,
            ),
          ];
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.inviteAdminSuccessSnackbar)),
      );
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(localizeApiError(l10n, error))),
      );
    } finally {
      nameCtrl.dispose();
      emailCtrl.dispose();
    }
  }

  Future<void> _resend(_AdminView admin) async {
    final l10n = AppLocalizations.of(context);
    final ok = await _confirm(
      title: l10n.resendActivation,
      body: l10n.resendActivationConfirmBody(admin.email),
      confirmLabel: l10n.resendActivation,
    );
    if (!ok || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.resendPlatformAdminActivation(
            widget.customerId,
            admin.userId,
          );
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.activationResentSnackbar)),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(localizeApiError(l10n, error))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final theme = Theme.of(context);

    if (!session.isPlatformAdmin) {
      return AdminPageBody(
        child: ErrorState(
          message: l10n.errorForbidden,
          retryLabel: l10n.retry,
        ),
      );
    }

    if (_loading) {
      return const AdminPageBody(child: AdminLoadingState());
    }
    if (_error != null || _summary == null) {
      return AdminPageBody(
        child: ErrorState(
          message: _error ?? l10n.errorNotFound,
          retryLabel: l10n.retry,
          onRetry: _load,
        ),
      );
    }

    final summary = _summary!;
    return AdminPageBody(
      child: ListView(
        children: [
          AdminPageHeader(
            title: summary.name,
            subtitle: summary.slug,
            actions: [
              TextButton(
                onPressed: () => context.go('/platform/customers'),
                child: Text(l10n.backToCustomers),
              ),
            ],
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              StatusChip(
                label: summary.isActive
                    ? l10n.statusActive
                    : l10n.statusInactive,
                icon: summary.isActive
                    ? Icons.check_circle_outline
                    : Icons.pause_circle_outline,
              ),
              Text(
                l10n.adminCountSummary(
                  summary.adminCount,
                  summary.pendingAdminInvites,
                ),
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Text(
                l10n.adminsSectionTitle,
                style: theme.textTheme.titleMedium,
              ),
              const Spacer(),
              FilledButton.tonal(
                onPressed: _busy ? null : _inviteAnother,
                child: Text(l10n.inviteAnotherAdmin),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_admins.isEmpty)
            EmptyState(message: l10n.noAdminsYet)
          else
            for (final admin in _admins)
              Card(
                child: ListTile(
                  title: Text(admin.displayName),
                  subtitle: Text(admin.email),
                  trailing: Wrap(
                    spacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      StatusChip(
                        label: admin.activationStatus == 'active'
                            ? l10n.activationStatusActive
                            : l10n.activationStatusPending,
                        icon: admin.activationStatus == 'active'
                            ? Icons.verified_outlined
                            : Icons.hourglass_empty,
                      ),
                      if (admin.activationStatus != 'active')
                        TextButton(
                          onPressed: _busy ? null : () => _resend(admin),
                          child: Text(l10n.resendActivation),
                        ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _AdminView {
  const _AdminView({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.activationStatus,
  });

  final String userId;
  final String email;
  final String displayName;
  final String activationStatus;
}
