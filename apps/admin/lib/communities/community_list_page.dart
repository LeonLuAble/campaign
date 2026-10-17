import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';
import 'community_tree.dart';

class CommunityListPage extends StatefulWidget {
  const CommunityListPage({required this.customerId, super.key});

  final String customerId;

  @override
  State<CommunityListPage> createState() => _CommunityListPageState();
}

class _CommunityListPageState extends State<CommunityListPage> {
  List<Community> _communities = const [];
  String? _error;
  var _loading = true;
  var _busy = false;

  bool get _canCreate {
    final session = ApiScope.of(context).session;
    return session.hasPermission('communities.create');
  }

  bool get _canUpdate {
    final session = ApiScope.of(context).session;
    return session.hasPermission('communities.update');
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ApiScope.of(context).client.listCommunities(
            widget.customerId,
          );
      if (!mounted) {
        return;
      }
      setState(() {
        _communities = rows;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = localizeApiError(l10n, error);
        _loading = false;
      });
    }
  }

  String _localizeCommunityError(Object error, AppLocalizations l10n) {
    if (error is ApiException &&
        error.message.toLowerCase().contains('cycle')) {
      return l10n.communityCycleError;
    }
    return localizeApiError(l10n, error);
  }

  Future<String?> _promptName({
    required String title,
    required String confirmLabel,
    String initial = '',
  }) async {
    final l10n = AppLocalizations.of(context);
    return showDialog<String>(
      context: context,
      builder: (context) {
        return _NamePromptDialog(
          title: title,
          confirmLabel: confirmLabel,
          cancelLabel: l10n.cancel,
          nameLabel: l10n.communityNameLabel,
          initial: initial,
        );
      },
    );
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
  }) async {
    final l10n = AppLocalizations.of(context);
    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
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

  Future<void> _addCommunity({String? parentId}) async {
    final l10n = AppLocalizations.of(context);
    final name = await _promptName(
      title: parentId == null
          ? l10n.createRootCommunityTitle
          : l10n.createChildCommunityTitle,
      confirmLabel: l10n.createAction,
    );
    if (name == null || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.createCommunity(
            customerId: widget.customerId,
            name: name,
            parentId: parentId,
          );
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.communityCreatedSnackbar)),
      );
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = _localizeCommunityError(error, l10n);
      });
    }
  }

  Future<void> _rename(Community community) async {
    final l10n = AppLocalizations.of(context);
    final name = await _promptName(
      title: l10n.renameCommunityTitle,
      confirmLabel: l10n.save,
      initial: community.name,
    );
    if (name == null || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.updateCommunity(
            community.id,
            name: name,
          );
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.communityRenamedSnackbar)),
      );
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = _localizeCommunityError(error, l10n);
      });
    }
  }

  Future<void> _move(Community community) async {
    final l10n = AppLocalizations.of(context);
    final excluded = communitySubtreeIds(_communities, community.id);
    final eligible = [
      for (final row in _communities)
        if (!excluded.contains(row.id)) row,
    ];
    final tree = buildCommunityTree(eligible);

    String? selectedParentId = community.parentId;
    if (selectedParentId != null && excluded.contains(selectedParentId)) {
      selectedParentId = null;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Widget parentTile({
              required String title,
              required String? value,
              required int depth,
            }) {
              final selected = selectedParentId == value;
              return ListTile(
                contentPadding: EdgeInsets.only(left: 8.0 + depth * 16),
                leading: Icon(
                  selected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_off,
                ),
                title: Text(title),
                selected: selected,
                onTap: () => setDialogState(() => selectedParentId = value),
              );
            }

            List<Widget> treeTiles(List<TreeListNode<Community>> nodes, int depth) {
              final tiles = <Widget>[];
              for (final node in nodes) {
                tiles.add(
                  parentTile(
                    title: node.data.name,
                    value: node.data.id,
                    depth: depth,
                  ),
                );
                tiles.addAll(treeTiles(node.children, depth + 1));
              }
              return tiles;
            }

            return AlertDialog(
              title: Text(l10n.moveCommunityTitle),
              content: SizedBox(
                width: 420,
                height: 360,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(l10n.moveCommunityHint(community.name)),
                    const SizedBox(height: 12),
                    Expanded(
                      child: ListView(
                        children: [
                          parentTile(
                            title: l10n.communityRootLabel,
                            value: null,
                            depth: 0,
                          ),
                          const Divider(),
                          if (tree.isEmpty)
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(l10n.noMoveTargets),
                            )
                          else
                            ...treeTiles(tree, 0),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text(l10n.cancel),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: Text(l10n.moveCommunityConfirm),
                ),
              ],
            );
          },
        );
      },
    );

    if (confirmed != true || !mounted) {
      return;
    }
    if (selectedParentId == community.parentId) {
      return;
    }

    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.updateCommunity(
            community.id,
            updateParent: true,
            parentId: selectedParentId,
          );
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.communityMovedSnackbar)),
      );
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = _localizeCommunityError(error, l10n);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_error!)),
      );
    }
  }

  Future<void> _toggleActive(Community community) async {
    final l10n = AppLocalizations.of(context);
    final activating = !community.isActive;
    final ok = await _confirm(
      title: activating
          ? l10n.reactivateCommunityTitle
          : l10n.deactivateCommunityTitle,
      body: activating
          ? l10n.reactivateCommunityBody(community.name)
          : l10n.deactivateCommunityBody(community.name),
      confirmLabel: activating
          ? l10n.reactivateCommunityConfirm
          : l10n.deactivateCommunityConfirm,
    );
    if (!ok || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiScope.of(context).client.updateCommunity(
            community.id,
            isActive: activating,
          );
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            activating
                ? l10n.communityReactivatedSnackbar
                : l10n.communityDeactivatedSnackbar,
          ),
        ),
      );
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _error = _localizeCommunityError(error, l10n);
      });
    }
  }

  List<TreeListAction> _actionsFor(Community community, AppLocalizations l10n) {
    final actions = <TreeListAction>[];
    if (_canCreate) {
      actions.add(
        TreeListAction(
          id: 'add-child',
          label: l10n.addChildCommunity,
          icon: Icons.add,
          onSelected: () => _addCommunity(parentId: community.id),
        ),
      );
    }
    if (_canUpdate) {
      actions.addAll([
        TreeListAction(
          id: 'rename',
          label: l10n.renameCommunity,
          icon: Icons.edit_outlined,
          onSelected: () => _rename(community),
        ),
        TreeListAction(
          id: 'move',
          label: l10n.moveCommunity,
          icon: Icons.drive_file_move_outline,
          onSelected: () => _move(community),
        ),
        TreeListAction(
          id: community.isActive ? 'deactivate' : 'reactivate',
          label: community.isActive
              ? l10n.deactivateCommunity
              : l10n.reactivateCommunity,
          icon: community.isActive
              ? Icons.pause_circle_outline
              : Icons.play_circle_outline,
          onSelected: () => _toggleActive(community),
        ),
      ]);
    }
    return actions;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    if (_loading) {
      return const AdminPageBody(child: LoadingSkeleton(lines: 6));
    }
    if (_error != null && _communities.isEmpty) {
      return AdminPageBody(
        child: ErrorState(
          message: _error!,
          retryLabel: l10n.retry,
          onRetry: _load,
        ),
      );
    }

    final tree = buildCommunityTree(_communities);

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.communitiesTitle,
            subtitle: l10n.communitiesSubtitle,
            actions: [
              if (_canCreate)
                FilledButton.icon(
                  onPressed: _busy ? null : () => _addCommunity(),
                  icon: const Icon(Icons.add),
                  label: Text(l10n.createCommunity),
                ),
            ],
          ),
          if (_error != null) ...[
            Text(
              _error!,
              style: TextStyle(color: theme.colorScheme.error),
            ),
            const SizedBox(height: 8),
          ],
          Expanded(
            child: tree.isEmpty
                ? EmptyState(
                    message: l10n.noCommunities,
                    action: _canCreate
                        ? FilledButton(
                            onPressed:
                                _busy ? null : () => _addCommunity(),
                            child: Text(l10n.createFirstCommunity),
                          )
                        : null,
                  )
                : TreeListView<Community>(
                    nodes: tree,
                    labelBuilder: (node) {
                      final name = node.data.name;
                      if (node.data.isActive) {
                        return name;
                      }
                      return '$name (${l10n.statusInactive})';
                    },
                    semanticsLabelBuilder: (node) =>
                        l10n.communityNodeSemantics(node.data.name),
                    expandTooltip: l10n.expandNode,
                    collapseTooltip: l10n.collapseNode,
                    actionsTooltip: l10n.communityActions,
                    actionsBuilder: (node) => _actionsFor(node.data, l10n),
                  ),
          ),
        ],
      ),
    );
  }
}

class _NamePromptDialog extends StatefulWidget {
  const _NamePromptDialog({
    required this.title,
    required this.confirmLabel,
    required this.cancelLabel,
    required this.nameLabel,
    required this.initial,
  });

  final String title;
  final String confirmLabel;
  final String cancelLabel;
  final String nameLabel;
  final String initial;

  @override
  State<_NamePromptDialog> createState() => _NamePromptDialogState();
}

class _NamePromptDialogState extends State<_NamePromptDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initial);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final value = _controller.text.trim();
    if (value.isEmpty) {
      return;
    }
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: TextField(
        controller: _controller,
        autofocus: true,
        decoration: InputDecoration(
          labelText: widget.nameLabel,
          border: const OutlineInputBorder(),
        ),
        onSubmitted: (_) => _submit(),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(widget.cancelLabel),
        ),
        FilledButton(
          onPressed: _submit,
          child: Text(widget.confirmLabel),
        ),
      ],
    );
  }
}
