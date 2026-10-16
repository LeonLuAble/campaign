import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// TREE visualization card driven by primitives (no API models).
class TreeVisualization extends StatelessWidget {
  const TreeVisualization({
    required this.displayName,
    required this.completionLabel,
    required this.isActive,
    required this.inactiveLabel,
    this.completionPercent,
    this.axis = Axis.horizontal,
    super.key,
  });

  final String displayName;
  final String completionLabel;
  final bool isActive;
  final String inactiveLabel;
  final num? completionPercent;
  final Axis axis;

  @override
  Widget build(BuildContext context) {
    if (!isActive) {
      return Text(inactiveLabel);
    }
    final tokens = AppTokens.of(context);
    final percent = completionPercent ?? 0;
    final textBlock = Column(
      crossAxisAlignment: axis == Axis.horizontal
          ? CrossAxisAlignment.start
          : CrossAxisAlignment.center,
      children: [
        Text(displayName, softWrap: true),
        Text(completionLabel, softWrap: true),
      ],
    );

    return Semantics(
      label: '$displayName, $percent% of campaign target',
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(tokens.spaceLg),
          child: axis == Axis.horizontal
              ? Row(
                  children: [
                    const Icon(Icons.park, size: 48),
                    SizedBox(width: tokens.spaceLg),
                    Expanded(child: textBlock),
                  ],
                )
              : Column(
                  children: [
                    const Icon(Icons.park, size: 48),
                    SizedBox(height: tokens.spaceSm),
                    textBlock,
                  ],
                ),
        ),
      ),
    );
  }
}
