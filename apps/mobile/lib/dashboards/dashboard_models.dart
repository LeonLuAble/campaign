class MeasurementTotal {
  const MeasurementTotal({
    required this.sourceUnit,
    required this.quantity,
    this.definitionKey,
  });

  final String sourceUnit;
  final num quantity;
  final String? definitionKey;

  factory MeasurementTotal.fromJson(Map<String, dynamic> json) {
    return MeasurementTotal(
      sourceUnit: json['sourceUnit'] as String,
      quantity: json['quantity'] as num,
      definitionKey: json['definitionKey'] as String?,
    );
  }
}

class OutcomeContribution {
  const OutcomeContribution({
    required this.version,
    required this.factorValue,
    required this.source,
  });

  final int version;
  final num factorValue;
  final String source;

  factory OutcomeContribution.fromJson(Map<String, dynamic> json) {
    return OutcomeContribution(
      version: json['version'] as int,
      factorValue: json['factorValue'] as num,
      source: json['source'] as String,
    );
  }
}

class OutcomeTotal {
  const OutcomeTotal({
    required this.sourceUnit,
    required this.outcomeMetric,
    required this.outcomeUnit,
    required this.value,
    required this.contributions,
  });

  final String sourceUnit;
  final String outcomeMetric;
  final String outcomeUnit;
  final num value;
  final List<OutcomeContribution> contributions;

  factory OutcomeTotal.fromJson(Map<String, dynamic> json) {
    return OutcomeTotal(
      sourceUnit: json['sourceUnit'] as String,
      outcomeMetric: json['outcomeMetric'] as String,
      outcomeUnit: json['outcomeUnit'] as String,
      value: json['value'] as num,
      contributions: (json['contributions'] as List<dynamic>? ?? [])
          .map((row) => OutcomeContribution.fromJson(row as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TimeSeriesPoint {
  const TimeSeriesPoint({
    required this.periodStart,
    required this.periodEnd,
    required this.measurements,
    required this.outcomes,
  });

  final String periodStart;
  final String periodEnd;
  final List<MeasurementTotal> measurements;
  final List<OutcomeTotal> outcomes;

  factory TimeSeriesPoint.fromJson(Map<String, dynamic> json) {
    return TimeSeriesPoint(
      periodStart: json['periodStart'] as String,
      periodEnd: json['periodEnd'] as String,
      measurements: (json['measurements'] as List<dynamic>? ?? [])
          .map((row) => MeasurementTotal.fromJson(row as Map<String, dynamic>))
          .toList(),
      outcomes: (json['outcomes'] as List<dynamic>? ?? [])
          .map((row) => OutcomeTotal.fromJson(row as Map<String, dynamic>))
          .toList(),
    );
  }
}

class VisualizationData {
  const VisualizationData({
    required this.type,
    required this.displayName,
    required this.isActive,
    this.completionPercent,
    this.unit,
  });

  final String type;
  final String displayName;
  final bool isActive;
  final num? completionPercent;
  final String? unit;

  factory VisualizationData.fromJson(Map<String, dynamic> json) {
    return VisualizationData(
      type: json['type'] as String,
      displayName: json['displayName'] as String,
      isActive: json['isActive'] as bool? ?? false,
      completionPercent: json['completionPercent'] as num?,
      unit: json['unit'] as String?,
    );
  }
}

class DashboardProgress {
  const DashboardProgress({
    required this.achievedValue,
    required this.targetValue,
    this.completionPercent,
    this.unit,
    this.completionStatus,
  });

  final num achievedValue;
  final num targetValue;
  final num? completionPercent;
  final String? unit;
  final String? completionStatus;

  factory DashboardProgress.fromJson(Map<String, dynamic> json) {
    return DashboardProgress(
      achievedValue: json['achievedValue'] as num? ?? 0,
      targetValue: json['targetValue'] as num? ?? 0,
      completionPercent: json['completionPercent'] as num?,
      unit: json['unit'] as String?,
      completionStatus: json['completionStatus'] as String?,
    );
  }
}

class ParticipantDashboardData {
  const ParticipantDashboardData({
    required this.progress,
    required this.measurements,
    required this.outcomes,
    required this.timeSeries,
    required this.visualization,
  });

  final DashboardProgress progress;
  final List<MeasurementTotal> measurements;
  final List<OutcomeTotal> outcomes;
  final List<TimeSeriesPoint> timeSeries;
  final VisualizationData visualization;

  factory ParticipantDashboardData.fromJson(Map<String, dynamic> json) {
    final progressJson = json['progress'] as Map<String, dynamic>? ?? json;
    final timeSeriesJson = json['timeSeries'] as Map<String, dynamic>?;
    return ParticipantDashboardData(
      progress: DashboardProgress.fromJson(progressJson),
      measurements: (json['measurements'] as List<dynamic>? ?? [])
          .map((row) => MeasurementTotal.fromJson(row as Map<String, dynamic>))
          .toList(),
      outcomes: (json['outcomes'] as List<dynamic>? ?? [])
          .map((row) => OutcomeTotal.fromJson(row as Map<String, dynamic>))
          .toList(),
      timeSeries: (timeSeriesJson?['points'] as List<dynamic>? ?? [])
          .map((row) => TimeSeriesPoint.fromJson(row as Map<String, dynamic>))
          .toList(),
      visualization: VisualizationData.fromJson(
        json['visualization'] as Map<String, dynamic>? ??
            const {'type': 'tree', 'displayName': 'tree', 'isActive': false},
      ),
    );
  }
}
