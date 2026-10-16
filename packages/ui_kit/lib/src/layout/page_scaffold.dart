import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Consistent page chrome: title, optional breadcrumbs/actions, and body.
class PageScaffold extends StatelessWidget {
  const PageScaffold({
    required this.title,
    required this.body,
    this.breadcrumbs = const [],
    this.primaryAction,
    this.secondaryActions = const [],
    this.padding,
    super.key,
  });

  final String title;
  final Widget body;
  final List<Widget> breadcrumbs;
  final Widget? primaryAction;
  final List<Widget> secondaryActions;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: padding ?? EdgeInsets.all(tokens.spaceLg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (breadcrumbs.isNotEmpty) ...[
                Wrap(
                  spacing: tokens.spaceSm,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: breadcrumbs,
                ),
                SizedBox(height: tokens.spaceSm),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(title, style: theme.textTheme.headlineSmall),
                  ),
                  ...secondaryActions.map(
                    (action) => Padding(
                      padding: EdgeInsets.only(left: tokens.spaceSm),
                      child: action,
                    ),
                  ),
                  if (primaryAction != null) ...[
                    SizedBox(width: tokens.spaceSm),
                    primaryAction!,
                  ],
                ],
              ),
              SizedBox(height: tokens.spaceLg),
              Expanded(child: body),
            ],
          ),
        ),
      ),
    );
  }
}
