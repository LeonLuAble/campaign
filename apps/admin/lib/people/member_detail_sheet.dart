import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

Future<bool> showMemberDetailSheet({
  required BuildContext context,
  required Membership membership,
  required List<Role> catalogRoles,
}) async {
  final changed = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => MemberDetailSheet(
      membership: membership,
      catalogRoles: catalogRoles,
    ),
  );
  return changed == true;
}

class MemberDetailSheet extends StatefulWidget {
  const MemberDetailSheet({
    required this.membership,
    required this.catalogRoles,
    super.key,
  });

  final Membership membership;
  final List<Role> catalogRoles;

  @override
  State<MemberDetailSheet> createState() => _MemberDetailSheetState();
}

class _MemberDetailSheetState extends State<MemberDetailSheet> {
  late Membership _membership;
  String? _error;
  var _busy = false;
  var _changed = false;

  @override
  void initState() {
    super.initState();
    _membership = widget.membership;
  }

  bool get _canUpdate =>
      ApiScope.of(context).session.hasPermission('memberships.update');
  bool get _canAssignRoles =>
      ApiScope.of(context).session.hasPermission('roles.assign');

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
  }) async {
    final l10n = AppLocalizations.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
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
      ),
    );
    return ok == true;
  }

  Future<void> _toggleActive() async {
    final l10n = AppLocalizations.of(context);
    final activating = !_membership.isActive;
    final name = _displayName;
    final ok = await _confirm(
      title: activating
          ? l10n.reactivateMemberTitle
          : l10n.deactivateMemberTitle,
      body: activating
          ? l10n.reactivateMemberBody(name)
          : l10n.deactivateMemberBody(name),
      confirmLabel: activating
          ? l10n.reactivateMemberConfirm
          : l10n.deactivateMemberConfirm,
    );
    if (!ok || !mounted) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await ApiScope.of(context).client.updateMembership(
            _membership.id,
            isActive: activating,
          );
      if (!mounted) {
        return;
      }
      setState(() {
        _membership = updated;
        _busy = false;
        _changed = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            activating
                ? l10n.memberReactivatedSnackbar
                : l10n.memberDeactivatedSnackbar,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeMembershipError(l10n, error);
      });
    }
  }

  Future<void> _resend() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await ApiScope.of(context)
          .client
          .resendMembershipActivation(_membership.id);
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      if (result.activationLink != null) {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(l10n.inviteMobileLinkTitle),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(l10n.inviteMobileLinkBody),
                const SizedBox(height: 12),
                SelectableText(result.activationLink!),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () async {
                    await Clipboard.setData(
                      ClipboardData(text: result.activationLink!),
                    );
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
            ),
            actions: [
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(l10n.close),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.activationResentSnackbar)),
        );
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeMembershipError(l10n, error);
      });
    }
  }

  Future<void> _assignRole() async {
    final l10n = AppLocalizations.of(context);
    final assignedIds = _membership.roles.map((row) => row.id).toSet();
    final available = [
      for (final role in widget.catalogRoles)
        if (!assignedIds.contains(role.id)) role,
    ];
    if (available.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.noRolesToAssign)),
      );
      return;
    }
    final selected = await showDialog<Role>(
      context: context,
      builder: (context) => SimpleDialog(
        title: Text(l10n.assignRoleTitle),
        children: [
          for (final role in available)
            SimpleDialogOption(
              onPressed: () => Navigator.of(context).pop(role),
              child: Text(role.name),
            ),
        ],
      ),
    );
    if (selected == null || !mounted) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final roles = await ApiScope.of(context)
          .client
          .assignMembershipRole(_membership.id, selected.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _membership = Membership(
          id: _membership.id,
          customerId: _membership.customerId,
          userId: _membership.userId,
          communityId: _membership.communityId,
          isActive: _membership.isActive,
          roles: roles,
          user: _membership.user,
          community: _membership.community,
        );
        _busy = false;
        _changed = true;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeMembershipError(l10n, error);
      });
    }
  }

  Future<void> _removeRole(RoleSummary role) async {
    final l10n = AppLocalizations.of(context);
    final ok = await _confirm(
      title: l10n.removeRoleTitle,
      body: l10n.removeRoleBody(role.name),
      confirmLabel: l10n.removeRoleConfirm,
    );
    if (!ok || !mounted) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final roles = await ApiScope.of(context)
          .client
          .unassignMembershipRole(_membership.id, role.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _membership = Membership(
          id: _membership.id,
          customerId: _membership.customerId,
          userId: _membership.userId,
          communityId: _membership.communityId,
          isActive: _membership.isActive,
          roles: roles,
          user: _membership.user,
          community: _membership.community,
        );
        _busy = false;
        _changed = true;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = localizeMembershipError(l10n, error);
      });
    }
  }

  String get _displayName {
    final user = _membership.user;
    return user?.displayName?.trim().isNotEmpty == true
        ? user!.displayName!
        : (user?.email ?? user?.mobile ?? _membership.userId);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final user = _membership.user;
    final pending = user?.activationStatus == 'pending';
    final contact = [
      if (user?.email != null) user!.email!,
      if (user?.mobile != null) user!.mobile!,
    ].join(' · ');

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.45,
      maxChildSize: 0.95,
      builder: (context, controller) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
          child: ListView(
            controller: controller,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _displayName,
                      style: theme.textTheme.headlineSmall,
                    ),
                  ),
                  IconButton(
                    tooltip: l10n.close,
                    onPressed: () => Navigator.of(context).pop(_changed),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusChip(
                    label: pending
                        ? l10n.activationStatusPending
                        : l10n.activationStatusActive,
                    icon: pending
                        ? Icons.hourglass_top
                        : Icons.check_circle_outline,
                    color: pending
                        ? theme.colorScheme.tertiary
                        : theme.colorScheme.secondary,
                    backgroundColor: pending
                        ? theme.colorScheme.tertiaryContainer
                        : theme.colorScheme.secondaryContainer,
                  ),
                  if (!_membership.isActive)
                    StatusChip(
                      label: l10n.membershipStatusInactive,
                      icon: Icons.block,
                      color: theme.colorScheme.error,
                      backgroundColor: theme.colorScheme.errorContainer,
                    ),
                ],
              ),
              if (contact.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(contact, style: theme.textTheme.bodyLarge),
              ],
              const SizedBox(height: 12),
              Text(
                l10n.memberCommunityLabel(
                  _membership.community?.name ?? l10n.tenantLevelMembership,
                ),
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              Text(l10n.memberRolesHeading, style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final role in _membership.roles)
                    InputChip(
                      label: Text(role.name),
                      onDeleted: _canAssignRoles && !_busy
                          ? () => _removeRole(role)
                          : null,
                      deleteButtonTooltipMessage: l10n.removeRoleConfirm,
                    ),
                  if (_canAssignRoles)
                    ActionChip(
                      avatar: const Icon(Icons.add, size: 18),
                      label: Text(l10n.assignRoleAction),
                      onPressed: _busy ? null : _assignRole,
                    ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (_canUpdate && pending)
                    FilledButton.tonalIcon(
                      onPressed: _busy ? null : _resend,
                      icon: const Icon(Icons.mail_outline),
                      label: Text(l10n.resendActivation),
                    ),
                  if (_canUpdate)
                    FilledButton.tonalIcon(
                      onPressed: _busy ? null : _toggleActive,
                      icon: Icon(
                        _membership.isActive
                            ? Icons.person_off_outlined
                            : Icons.person_outline,
                      ),
                      label: Text(
                        _membership.isActive
                            ? l10n.deactivateMember
                            : l10n.reactivateMember,
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
