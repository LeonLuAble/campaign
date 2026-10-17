import 'dart:async';

import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';
import 'community_picker_field.dart';
import 'invite_member_dialog.dart';
import 'member_detail_sheet.dart';

class PeoplePage extends StatefulWidget {
  const PeoplePage({required this.customerId, super.key});

  final String customerId;

  @override
  State<PeoplePage> createState() => _PeoplePageState();
}

class _PeoplePageState extends State<PeoplePage> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  List<Membership> _items = const [];
  List<Community> _communities = const [];
  List<Role> _roles = const [];
  String? _nextCursor;
  String? _error;
  var _loading = true;
  var _loadingMore = false;

  String? _communityId;
  var _includeDescendants = true;
  String? _roleKey;
  String? _status;
  var _pendingOnly = false;

  bool get _canInvite =>
      ApiScope.of(context).session.hasPermission('memberships.create');
  bool get _canReadRoles =>
      ApiScope.of(context).session.hasPermission('roles.read');
  bool get _canUpdate =>
      ApiScope.of(context).session.hasPermission('memberships.update');
  bool get _isTenantLevel =>
      ApiScope.of(context).session.access?.isTenantLevel ?? false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await Future.wait([_loadMeta(), _load(reset: true)]);
  }

  Future<void> _loadMeta() async {
    final client = ApiScope.of(context).client;
    try {
      final communities = await client.listCommunities(widget.customerId);
      List<Role> roles = const [];
      if (_canReadRoles) {
        roles = await client.listRoles(widget.customerId);
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _communities = communities;
        _roles = roles;
      });
    } catch (_) {
      // Directory can still load without filters metadata.
    }
  }

  Future<void> _load({required bool reset}) async {
    final l10n = AppLocalizations.of(context);
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _nextCursor = null;
      });
    } else {
      setState(() => _loadingMore = true);
    }
    try {
      final page = await ApiScope.of(context).client.listMemberships(
            widget.customerId,
            q: _searchController.text.trim().isEmpty
                ? null
                : _searchController.text.trim(),
            communityId: _communityId,
            includeDescendants: _communityId == null ? null : _includeDescendants,
            roleKey: _roleKey,
            status: _pendingOnly ? 'pending' : _status,
            limit: 20,
            cursor: reset ? null : _nextCursor,
          );
      if (!mounted) {
        return;
      }
      setState(() {
        _items = reset ? page.items : [..._items, ...page.items];
        _nextCursor = page.nextCursor;
        _loading = false;
        _loadingMore = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _loadingMore = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _load(reset: true);
    });
  }

  Future<void> _openInvite() async {
    final invited = await showInviteMemberDialog(
      context: context,
      customerId: widget.customerId,
      communities: _communities,
      roles: _roles,
      requireCommunity: !_isTenantLevel,
    );
    if (invited && mounted) {
      await _load(reset: true);
    }
  }

  Future<void> _openDetail(Membership membership) async {
    final changed = await showMemberDetailSheet(
      context: context,
      membership: membership,
      catalogRoles: _roles,
    );
    if (changed && mounted) {
      await _load(reset: true);
    }
  }

  Future<void> _resend(Membership membership) async {
    final l10n = AppLocalizations.of(context);
    try {
      final result = await ApiScope.of(context)
          .client
          .resendMembershipActivation(membership.id);
      if (!mounted) {
        return;
      }
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(localizeMembershipError(l10n, error))),
      );
    }
  }

  String _nameOf(Membership membership) {
    final user = membership.user;
    final name = user?.displayName?.trim();
    if (name != null && name.isNotEmpty) {
      return name;
    }
    return user?.email ?? user?.mobile ?? membership.userId;
  }

  String? _contactOf(Membership membership) {
    final user = membership.user;
    final parts = [
      if (user?.email != null) user!.email!,
      if (user?.mobile != null) user!.mobile!,
    ];
    if (parts.isEmpty) {
      return null;
    }
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final showContactColumn = _items.any((row) => _contactOf(row) != null);

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.navPeople,
            subtitle: l10n.peopleSubtitle,
            actions: [
              if (_canReadRoles)
                OutlinedButton.icon(
                  onPressed: () => context.go(
                    '/customers/${widget.customerId}/people/roles',
                  ),
                  icon: const Icon(Icons.badge_outlined),
                  label: Text(l10n.navRoles),
                ),
              if (_canInvite)
                FilledButton.icon(
                  onPressed: _openInvite,
                  icon: const Icon(Icons.person_add_alt_1),
                  label: Text(l10n.inviteMember),
                ),
            ],
          ),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              SizedBox(
                width: 280,
                child: AppSearchField(
                  controller: _searchController,
                  label: l10n.peopleSearchLabel,
                  onChanged: _onSearchChanged,
                  onSubmitted: (_) => _load(reset: true),
                ),
              ),
              SizedBox(
                width: 240,
                child: CommunityPickerField(
                  communities: _communities,
                  value: _communityId,
                  onChanged: (id) {
                    setState(() => _communityId = id);
                    _load(reset: true);
                  },
                ),
              ),
              FilterChip(
                label: Text(l10n.includeSubCommunities),
                selected: _includeDescendants,
                onSelected: _communityId == null
                    ? null
                    : (value) {
                        setState(() => _includeDescendants = value);
                        _load(reset: true);
                      },
              ),
              if (_roles.isNotEmpty)
                SizedBox(
                  width: 220,
                  child: DropdownButtonFormField<String?>(
                    isExpanded: true,
                    // ignore: deprecated_member_use
                    value: _roleKey,
                    decoration: InputDecoration(
                      labelText: l10n.peopleFilterRole,
                      border: const OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: [
                      DropdownMenuItem(
                        value: null,
                        child: Text(
                          l10n.anyRole,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      for (final role in _roles)
                        DropdownMenuItem(
                          value: role.key,
                          child: Text(
                            role.name,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: (value) {
                      setState(() => _roleKey = value);
                      _load(reset: true);
                    },
                  ),
                ),
              SizedBox(
                width: 200,
                child: DropdownButtonFormField<String?>(
                  isExpanded: true,
                  // ignore: deprecated_member_use
                  value: _pendingOnly ? 'pending' : _status,
                  decoration: InputDecoration(
                    labelText: l10n.peopleFilterStatus,
                    border: const OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: [
                    DropdownMenuItem(
                      value: null,
                      child: Text(
                        l10n.anyStatus,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'pending',
                      child: Text(
                        l10n.activationStatusPending,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'active',
                      child: Text(
                        l10n.activationStatusActive,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _status = value;
                      _pendingOnly = value == 'pending';
                    });
                    _load(reset: true);
                  },
                ),
              ),
              AppFilterChip(
                label: l10n.pendingOnlyFilter,
                selected: _pendingOnly,
                onSelected: (selected) {
                  setState(() {
                    _pendingOnly = selected;
                    _status = selected ? 'pending' : null;
                  });
                  _load(reset: true);
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: AppDataTable<Membership>(
              columns: [
                AppDataColumn(id: 'name', label: l10n.peopleColumnName),
                if (showContactColumn)
                  AppDataColumn(
                    id: 'contact',
                    label: l10n.peopleColumnContact,
                  ),
                AppDataColumn(
                  id: 'community',
                  label: l10n.peopleColumnCommunity,
                ),
                AppDataColumn(id: 'roles', label: l10n.peopleColumnRoles),
                AppDataColumn(id: 'status', label: l10n.peopleColumnStatus),
              ],
              rows: _items,
              loading: _loading,
              errorMessage: _error,
              onRetry: () => _load(reset: true),
              retryLabel: l10n.retry,
              emptyMessage: l10n.noMembers,
              hasMore: _nextCursor != null,
              loadingMore: _loadingMore,
              onLoadMore: () => _load(reset: false),
              loadMoreLabel: l10n.loadMore,
              actionsLabel: l10n.rowActions,
              onRowTap: _openDetail,
              cellsBuilder: (context, row) {
                final pending = row.user?.activationStatus == 'pending';
                final cells = <Widget>[
                  Text(_nameOf(row)),
                ];
                if (showContactColumn) {
                  cells.add(Text(_contactOf(row) ?? '—'));
                }
                cells.addAll([
                  Text(row.community?.name ?? l10n.tenantLevelMembership),
                  Text(
                    row.roles.isEmpty
                        ? '—'
                        : row.roles.map((role) => role.name).join(', '),
                  ),
                  Wrap(
                    spacing: 6,
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
                      if (!row.isActive)
                        StatusChip(
                          label: l10n.membershipStatusInactive,
                          icon: Icons.block,
                          color: theme.colorScheme.error,
                          backgroundColor: theme.colorScheme.errorContainer,
                        ),
                    ],
                  ),
                ]);
                return cells;
              },
              rowActionsBuilder: (context, row) {
                final pending = row.user?.activationStatus == 'pending';
                return [
                  AppDataRowAction(
                    id: 'open',
                    label: l10n.viewMember,
                    icon: Icons.open_in_new,
                    onSelected: () => _openDetail(row),
                  ),
                  if (_canUpdate && pending)
                    AppDataRowAction(
                      id: 'resend',
                      label: l10n.resendActivation,
                      icon: Icons.mail_outline,
                      onSelected: () => _resend(row),
                    ),
                ];
              },
            ),
          ),
        ],
      ),
    );
  }
}
