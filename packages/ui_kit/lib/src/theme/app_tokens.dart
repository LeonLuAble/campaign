import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';

import '../tokens/breakpoints.dart';
import '../tokens/colors.dart';
import '../tokens/elevation.dart';
import '../tokens/motion.dart';
import '../tokens/radius.dart';
import '../tokens/spacing.dart';

/// Semantic progress palette: never use error/red for low completion.
@immutable
class ProgressColors {
  const ProgressColors({
    required this.none,
    required this.inProgress,
    required this.achieved,
    required this.exceeded,
  });

  final Color none;
  final Color inProgress;
  final Color achieved;
  final Color exceeded;

  ProgressColors copyWith({
    Color? none,
    Color? inProgress,
    Color? achieved,
    Color? exceeded,
  }) {
    return ProgressColors(
      none: none ?? this.none,
      inProgress: inProgress ?? this.inProgress,
      achieved: achieved ?? this.achieved,
      exceeded: exceeded ?? this.exceeded,
    );
  }

  ProgressColors lerp(ProgressColors other, double t) {
    return ProgressColors(
      none: Color.lerp(none, other.none, t)!,
      inProgress: Color.lerp(inProgress, other.inProgress, t)!,
      achieved: Color.lerp(achieved, other.achieved, t)!,
      exceeded: Color.lerp(exceeded, other.exceeded, t)!,
    );
  }
}

@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens({
    required this.spaceXs,
    required this.spaceSm,
    required this.spaceMd,
    required this.spaceLg,
    required this.spaceXl,
    required this.spaceXxl,
    required this.spaceXxxl,
    required this.radiusInput,
    required this.radiusChip,
    required this.radiusCard,
    required this.radiusSheet,
    required this.elevationFlat,
    required this.elevationRaised,
    required this.elevationOverlay,
    required this.motionMicro,
    required this.motionStandard,
    required this.progress,
    required this.breakpointCompactMax,
    required this.breakpointMediumMax,
    required this.breakpointExpandedMax,
    required this.success,
    required this.warning,
  });

  factory AppTokens.light(ColorScheme scheme) {
    final secondary = scheme.secondary;
    return AppTokens(
      spaceXs: AppSpace.xs,
      spaceSm: AppSpace.sm,
      spaceMd: AppSpace.md,
      spaceLg: AppSpace.lg,
      spaceXl: AppSpace.xl,
      spaceXxl: AppSpace.xxl,
      spaceXxxl: AppSpace.xxxl,
      radiusInput: AppRadius.input,
      radiusChip: AppRadius.chip,
      radiusCard: AppRadius.card,
      radiusSheet: AppRadius.sheet,
      elevationFlat: AppElevation.flat,
      elevationRaised: AppElevation.raised,
      elevationOverlay: AppElevation.overlay,
      motionMicro: AppMotion.micro,
      motionStandard: AppMotion.standard,
      progress: ProgressColors(
        none: AppColors.progressNone,
        inProgress: Color.lerp(secondary, scheme.surface, 0.3)!,
        achieved: secondary,
        exceeded: Color.lerp(secondary, AppColors.tertiary, 0.45)!,
      ),
      breakpointCompactMax: AppBreakpoints.compactMax,
      breakpointMediumMax: AppBreakpoints.mediumMax,
      breakpointExpandedMax: AppBreakpoints.expandedMax,
      success: AppColors.success,
      warning: AppColors.warning,
    );
  }

  final double spaceXs;
  final double spaceSm;
  final double spaceMd;
  final double spaceLg;
  final double spaceXl;
  final double spaceXxl;
  final double spaceXxxl;
  final double radiusInput;
  final double radiusChip;
  final double radiusCard;
  final double radiusSheet;
  final double elevationFlat;
  final double elevationRaised;
  final double elevationOverlay;
  final Duration motionMicro;
  final Duration motionStandard;
  final ProgressColors progress;
  final double breakpointCompactMax;
  final double breakpointMediumMax;
  final double breakpointExpandedMax;
  final Color success;
  final Color warning;

  static AppTokens of(BuildContext context) {
    final theme = Theme.of(context);
    return theme.extension<AppTokens>() ?? AppTokens.light(theme.colorScheme);
  }

  @override
  AppTokens copyWith({
    double? spaceXs,
    double? spaceSm,
    double? spaceMd,
    double? spaceLg,
    double? spaceXl,
    double? spaceXxl,
    double? spaceXxxl,
    double? radiusInput,
    double? radiusChip,
    double? radiusCard,
    double? radiusSheet,
    double? elevationFlat,
    double? elevationRaised,
    double? elevationOverlay,
    Duration? motionMicro,
    Duration? motionStandard,
    ProgressColors? progress,
    double? breakpointCompactMax,
    double? breakpointMediumMax,
    double? breakpointExpandedMax,
    Color? success,
    Color? warning,
  }) {
    return AppTokens(
      spaceXs: spaceXs ?? this.spaceXs,
      spaceSm: spaceSm ?? this.spaceSm,
      spaceMd: spaceMd ?? this.spaceMd,
      spaceLg: spaceLg ?? this.spaceLg,
      spaceXl: spaceXl ?? this.spaceXl,
      spaceXxl: spaceXxl ?? this.spaceXxl,
      spaceXxxl: spaceXxxl ?? this.spaceXxxl,
      radiusInput: radiusInput ?? this.radiusInput,
      radiusChip: radiusChip ?? this.radiusChip,
      radiusCard: radiusCard ?? this.radiusCard,
      radiusSheet: radiusSheet ?? this.radiusSheet,
      elevationFlat: elevationFlat ?? this.elevationFlat,
      elevationRaised: elevationRaised ?? this.elevationRaised,
      elevationOverlay: elevationOverlay ?? this.elevationOverlay,
      motionMicro: motionMicro ?? this.motionMicro,
      motionStandard: motionStandard ?? this.motionStandard,
      progress: progress ?? this.progress,
      breakpointCompactMax: breakpointCompactMax ?? this.breakpointCompactMax,
      breakpointMediumMax: breakpointMediumMax ?? this.breakpointMediumMax,
      breakpointExpandedMax:
          breakpointExpandedMax ?? this.breakpointExpandedMax,
      success: success ?? this.success,
      warning: warning ?? this.warning,
    );
  }

  @override
  AppTokens lerp(ThemeExtension<AppTokens>? other, double t) {
    if (other is! AppTokens) {
      return this;
    }
    return AppTokens(
      spaceXs: lerpDouble(spaceXs, other.spaceXs, t)!,
      spaceSm: lerpDouble(spaceSm, other.spaceSm, t)!,
      spaceMd: lerpDouble(spaceMd, other.spaceMd, t)!,
      spaceLg: lerpDouble(spaceLg, other.spaceLg, t)!,
      spaceXl: lerpDouble(spaceXl, other.spaceXl, t)!,
      spaceXxl: lerpDouble(spaceXxl, other.spaceXxl, t)!,
      spaceXxxl: lerpDouble(spaceXxxl, other.spaceXxxl, t)!,
      radiusInput: lerpDouble(radiusInput, other.radiusInput, t)!,
      radiusChip: lerpDouble(radiusChip, other.radiusChip, t)!,
      radiusCard: lerpDouble(radiusCard, other.radiusCard, t)!,
      radiusSheet: lerpDouble(radiusSheet, other.radiusSheet, t)!,
      elevationFlat: lerpDouble(elevationFlat, other.elevationFlat, t)!,
      elevationRaised: lerpDouble(elevationRaised, other.elevationRaised, t)!,
      elevationOverlay: lerpDouble(elevationOverlay, other.elevationOverlay, t)!,
      motionMicro: t < 0.5 ? motionMicro : other.motionMicro,
      motionStandard: t < 0.5 ? motionStandard : other.motionStandard,
      progress: progress.lerp(other.progress, t),
      breakpointCompactMax: other.breakpointCompactMax,
      breakpointMediumMax: other.breakpointMediumMax,
      breakpointExpandedMax: other.breakpointExpandedMax,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
    );
  }
}
