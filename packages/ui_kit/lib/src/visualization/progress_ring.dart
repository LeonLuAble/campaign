import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Circular progress with an uncapped percent label and overflow accent.
class ProgressRing extends StatelessWidget {
  const ProgressRing({
    required this.completion,
    required this.label,
    this.size = 96,
    this.semanticsLabel,
    super.key,
  });

  /// Completion ratio (may exceed 1.0).
  final double completion;
  final String label;
  final double size;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final capped = completion.clamp(0.0, 1.0);
    final exceeded = completion > 1.0;
    final track = tokens.progress.none.withValues(alpha: 0.25);
    final fill = exceeded
        ? tokens.progress.exceeded
        : completion <= 0
        ? tokens.progress.none
        : completion < 1
        ? tokens.progress.inProgress
        : tokens.progress.achieved;

    return Semantics(
      label: semanticsLabel ?? label,
      value: '${(completion * 100).round()}%',
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _RingPainter(
            progress: capped,
            trackColor: track,
            fillColor: fill,
            overflow: exceeded,
            overflowColor: tokens.progress.exceeded,
          ),
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(tokens.spaceSm),
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.progress,
    required this.trackColor,
    required this.fillColor,
    required this.overflow,
    required this.overflowColor,
  });

  final double progress;
  final Color trackColor;
  final Color fillColor;
  final bool overflow;
  final Color overflowColor;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.shortestSide * 0.1;
    final rect = Offset.zero & size;
    final center = rect.center;
    final radius = (size.shortestSide - stroke) / 2;
    final track = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    final fill = Paint()
      ..color = fillColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, track);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      fill,
    );
    if (overflow) {
      final accent = Paint()
        ..color = overflowColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke * 0.55
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        2 * math.pi * 0.08,
        false,
        accent,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.fillColor != fillColor ||
        oldDelegate.overflow != overflow;
  }
}
