/// M3-aligned window size classes.
enum AppBreakpoint { compact, medium, expanded, large }

abstract final class AppBreakpoints {
  static const double compactMax = 600;
  static const double mediumMax = 840;
  static const double expandedMax = 1200;

  static AppBreakpoint ofWidth(double width) {
    if (width < compactMax) {
      return AppBreakpoint.compact;
    }
    if (width < mediumMax) {
      return AppBreakpoint.medium;
    }
    if (width < expandedMax) {
      return AppBreakpoint.expanded;
    }
    return AppBreakpoint.large;
  }
}
