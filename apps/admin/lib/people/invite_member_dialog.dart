import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import 'community_picker_field.dart';

Future<bool> showInviteMemberDialog({
  required BuildContext context,
  required String customerId,
  required List<Community> communities,
  required List<Role> roles,
  required bool requireCommunity,
}) async {
  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => _InviteMemberDialog(
      customerId: customerId,
      communities: communities,
      roles: roles,
      requireCommunity: requireCommunity,
    ),
  );
  return result == true;
}

class _InviteMemberDialog extends StatefulWidget {
  const _InviteMemberDialog({
    required this.customerId,
    required this.communities,
    required this.roles,
    required this.requireCommunity,
  });

  final String customerId;
  final List<Community> communities;
  final List<Role> roles;
  final bool requireCommunity;

  @override
  State<_InviteMemberDialog> createState() => _InviteMemberDialogState();
}

class _InviteMemberDialogState extends State<_InviteMemberDialog> {
  final _emailController = TextEditingController();
  final _mobileController = TextEditingController();
  final _nameController = TextEditingController();
  String? _communityId;
  late String _roleKey;
  String? _error;
  var _busy = false;
  MembershipInvitationResult? _result;

  @override
  void initState() {
    super.initState();
    final member = widget.roles.where((row) => row.key == 'member');
    _roleKey = member.isNotEmpty
        ? member.first.key
        : (widget.roles.isNotEmpty ? widget.roles.first.key : 'member');
  }

  @override
  void dispose() {
    _emailController.dispose();
    _mobileController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final email = _emailController.text.trim();
    final mobile = _mobileController.text.trim();
    if (email.isEmpty && mobile.isEmpty) {
      setState(() => _error = l10n.inviteIdentifierRequired);
      return;
    }
    if (email.isNotEmpty && !looksLikeEmail(email)) {
      setState(() => _error = l10n.inviteEmailInvalid);
      return;
    }
    if (mobile.isNotEmpty && !looksLikeIdentifier(mobile)) {
      setState(() => _error = l10n.inviteMobileInvalid);
      return;
    }
    if (widget.requireCommunity && _communityId == null) {
      setState(() => _error = l10n.pickCommunityRequired);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await ApiScope.of(context).client.inviteMembership(
            customerId: widget.customerId,
            email: email.isEmpty ? null : email,
            mobile: mobile.isEmpty ? null : mobile,
            displayName: _nameController.text.trim().isEmpty
                ? null
                : _nameController.text.trim(),
            communityId: _communityId,
            roleKeys: [_roleKey],
          );
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _result = result;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_result != null) {
      return _InviteResultDialog(
        result: _result!,
        onClose: () => Navigator.of(context).pop(true),
      );
    }

    final roleItems = widget.roles
        .where((row) => row.key != 'tenant_admin' || !widget.requireCommunity)
        .toList();

    return AlertDialog(
      title: Text(l10n.inviteMemberTitle),
      content: SizedBox(
        width: 440,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _emailController,
                enabled: !_busy,
                decoration: InputDecoration(
                  labelText: l10n.inviteEmailLabel,
                  border: const OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _mobileController,
                enabled: !_busy,
                decoration: InputDecoration(
                  labelText: l10n.inviteMobileLabel,
                  border: const OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nameController,
                enabled: !_busy,
                decoration: InputDecoration(
                  labelText: l10n.inviteDisplayNameLabel,
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              CommunityPickerField(
                communities: widget.communities,
                value: _communityId,
                required: widget.requireCommunity,
                allowClear: !widget.requireCommunity,
                onChanged: (id) => setState(() => _communityId = id),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: roleItems.any((row) => row.key == _roleKey)
                    ? _roleKey
                    : (roleItems.isNotEmpty ? roleItems.first.key : null),
                decoration: InputDecoration(
                  labelText: l10n.inviteRoleLabel,
                  border: const OutlineInputBorder(),
                ),
                items: [
                  for (final role in roleItems)
                    DropdownMenuItem(
                      value: role.key,
                      child: Text(role.name),
                    ),
                ],
                onChanged: _busy
                    ? null
                    : (value) {
                        if (value != null) {
                          setState(() => _roleKey = value);
                        }
                      },
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(false),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(l10n.inviteMemberConfirm),
        ),
      ],
    );
  }
}

class _InviteResultDialog extends StatelessWidget {
  const _InviteResultDialog({required this.result, required this.onClose});

  final MembershipInvitationResult result;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final link = result.activationLink;
    final emailSent = result.email != null && link == null;

    return AlertDialog(
      title: Text(
        emailSent ? l10n.inviteEmailSentTitle : l10n.inviteMobileLinkTitle,
      ),
      content: SizedBox(
        width: 440,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              emailSent
                  ? l10n.inviteEmailSentBody(result.email!)
                  : l10n.inviteMobileLinkBody,
            ),
            if (link != null) ...[
              const SizedBox(height: 12),
              SelectableText(link),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: link));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l10n.copiedToClipboard)),
                    );
                  }
                },
                icon: const Icon(Icons.copy),
                label: Text(l10n.copyLink),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.activationLinkShownOnceNote,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
      actions: [
        FilledButton(
          onPressed: onClose,
          child: Text(l10n.close),
        ),
      ],
    );
  }
}
