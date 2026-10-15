import 'package:flutter/material.dart';

class AdminPageHeader extends StatelessWidget {
  const AdminPageHeader({
    required this.title,
    this.subtitle,
    this.actions = const [],
    super.key,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.headlineSmall),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (actions.isNotEmpty)
            Wrap(spacing: 8, runSpacing: 8, children: actions),
        ],
      ),
    );
  }
}

class AdminEmptyState extends StatelessWidget {
  const AdminEmptyState({required this.message, this.icon, super.key});

  final String message;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon ?? Icons.inbox_outlined,
              size: 48,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AdminLoadingState extends StatelessWidget {
  const AdminLoadingState({this.message, super.key});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(message!),
          ],
        ],
      ),
    );
  }
}

class AdminErrorState extends StatelessWidget {
  const AdminErrorState({
    required this.message,
    this.onRetry,
    super.key,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 40, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              IconButton.filled(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AdminDataList extends StatelessWidget {
  const AdminDataList({
    required this.itemCount,
    required this.itemBuilder,
    this.empty,
    this.separatorBuilder,
    super.key,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final Widget? empty;
  final IndexedWidgetBuilder? separatorBuilder;

  @override
  Widget build(BuildContext context) {
    if (itemCount == 0) {
      return empty ?? const SizedBox.shrink();
    }
    if (separatorBuilder != null) {
      return ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: itemCount,
        itemBuilder: itemBuilder,
        separatorBuilder: separatorBuilder!,
      );
    }
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      itemBuilder: itemBuilder,
    );
  }
}

class AdminPageBody extends StatelessWidget {
  const AdminPageBody({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1100),
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}
