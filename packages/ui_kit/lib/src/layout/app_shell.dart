import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_tokens.dart';
import '../tokens/breakpoints.dart';

/// A single left-nav destination for [AppShell].
@immutable
class AppShellDestination {
  const AppShellDestination({
    required this.id,
    required this.label,
    required this.icon,
    this.selectedIcon,
  });

  final String id;
  final String label;
  final IconData icon;
  final IconData? selectedIcon;
}

/// Responsive admin chrome: modal drawer (compact), rail (medium),
/// extended rail (expanded / large). Breakpoints come from [AppTokens].
class AppShell extends StatefulWidget {
  const AppShell({
    required this.destinations,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.body,
    this.title,
    this.actions = const [],
    this.drawerHeader,
    this.skipToContentLabel = 'Skip to content',
    super.key,
  });

  final List<AppShellDestination> destinations;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final Widget body;

  /// Center/leading slot of the top [AppBar] (e.g. breadcrumbs).
  final Widget? title;

  /// Trailing top-bar actions (customer switcher, language, user menu).
  final List<Widget> actions;

  final Widget? drawerHeader;
  final String skipToContentLabel;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final FocusNode _contentFocus = FocusNode(debugLabel: 'appShellContent');

  @override
  void dispose() {
    _contentFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final breakpoint = AppBreakpoints.ofWidth(width);
    final destinations = widget.destinations;
    final selected = destinations.isEmpty
        ? 0
        : widget.selectedIndex.clamp(0, destinations.length - 1);
    final compact = breakpoint == AppBreakpoint.compact;

    final content = Focus(
      focusNode: _contentFocus,
      child: KeyedSubtree(
        key: const ValueKey('app-shell-content'),
        child: widget.body,
      ),
    );

    final appBar = AppBar(
      automaticallyImplyLeading: false,
      leading: compact && destinations.isNotEmpty
          ? IconButton(
              tooltip: MaterialLocalizations.of(context).openAppDrawerTooltip,
              icon: const Icon(Icons.menu),
              onPressed: () => _scaffoldKey.currentState?.openDrawer(),
            )
          : null,
      title: widget.title,
      actions: [
        _SkipToContentControl(
          label: widget.skipToContentLabel,
          onActivated: () => _contentFocus.requestFocus(),
        ),
        ...widget.actions,
      ],
    );

    switch (breakpoint) {
      case AppBreakpoint.compact:
        return Scaffold(
          key: _scaffoldKey,
          appBar: appBar,
          drawer: destinations.isEmpty
              ? null
              : NavigationDrawer(
                  selectedIndex: selected,
                  onDestinationSelected: (index) {
                    Navigator.of(context).pop();
                    widget.onDestinationSelected(index);
                  },
                  children: [
                    if (widget.drawerHeader != null)
                      Padding(
                        padding: EdgeInsets.all(tokens.spaceMd),
                        child: widget.drawerHeader!,
                      )
                    else
                      const SizedBox(height: 12),
                    for (var i = 0; i < destinations.length; i++)
                      NavigationDrawerDestination(
                        icon: Icon(destinations[i].icon),
                        selectedIcon: Icon(
                          destinations[i].selectedIcon ?? destinations[i].icon,
                        ),
                        label: Text(destinations[i].label),
                      ),
                  ],
                ),
          body: content,
        );
      case AppBreakpoint.medium:
        return Scaffold(
          appBar: appBar,
          body: Row(
            children: [
              if (destinations.isNotEmpty)
                NavigationRail(
                  selectedIndex: selected,
                  labelType: NavigationRailLabelType.all,
                  onDestinationSelected: widget.onDestinationSelected,
                  destinations: [
                    for (final dest in destinations)
                      NavigationRailDestination(
                        icon: Icon(dest.icon),
                        selectedIcon: Icon(dest.selectedIcon ?? dest.icon),
                        label: Text(dest.label),
                      ),
                  ],
                ),
              if (destinations.isNotEmpty) const VerticalDivider(width: 1),
              Expanded(child: content),
            ],
          ),
        );
      case AppBreakpoint.expanded:
      case AppBreakpoint.large:
        return Scaffold(
          appBar: appBar,
          body: Row(
            children: [
              if (destinations.isNotEmpty)
                NavigationRail(
                  extended: true,
                  minExtendedWidth:
                      breakpoint == AppBreakpoint.large ? 280 : 200,
                  selectedIndex: selected,
                  onDestinationSelected: widget.onDestinationSelected,
                  destinations: [
                    for (final dest in destinations)
                      NavigationRailDestination(
                        icon: Icon(dest.icon),
                        selectedIcon: Icon(dest.selectedIcon ?? dest.icon),
                        label: Text(dest.label),
                      ),
                  ],
                ),
              if (destinations.isNotEmpty) const VerticalDivider(width: 1),
              Expanded(child: content),
            ],
          ),
        );
    }
  }
}

/// Screen-reader / keyboard control that appears when tabbed to.
class _SkipToContentControl extends StatelessWidget {
  const _SkipToContentControl({
    required this.label,
    required this.onActivated,
  });

  final String label;
  final VoidCallback onActivated;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ExcludeSemantics(
      excluding: false,
      child: Focus(
        child: Builder(
          builder: (context) {
            final focused = Focus.of(context).hasFocus;
            if (!focused) {
              return const SizedBox(width: 0, height: 0);
            }
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: TextButton(
                style: TextButton.styleFrom(
                  backgroundColor: theme.colorScheme.primaryContainer,
                  foregroundColor: theme.colorScheme.onPrimaryContainer,
                  side: BorderSide(
                    color: theme.colorScheme.primary,
                    width: 2,
                  ),
                ),
                onPressed: onActivated,
                child: Text(label),
              ),
            );
          },
        ),
        onKeyEvent: (node, event) {
          if (event is! KeyDownEvent) {
            return KeyEventResult.ignored;
          }
          if (event.logicalKey == LogicalKeyboardKey.enter ||
              event.logicalKey == LogicalKeyboardKey.space) {
            onActivated();
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        },
      ),
    );
  }
}
