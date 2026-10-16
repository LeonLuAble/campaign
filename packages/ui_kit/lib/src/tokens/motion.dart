/// Motion durations. Callers should respect `MediaQuery.disableAnimations`.
abstract final class AppMotion {
  static const Duration micro = Duration(milliseconds: 150);
  static const Duration standard = Duration(milliseconds: 250);
}
