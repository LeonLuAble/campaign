import 'models.dart';

DateTime _parseIsoDate(String value) => DateTime.utc(
      int.parse(value.substring(0, 4)),
      int.parse(value.substring(5, 7)),
      int.parse(value.substring(8, 10)),
    );

String _formatIsoDate(DateTime value) =>
    value.toIso8601String().substring(0, 10);

String addIsoDays(String value, int days) {
  final date = _parseIsoDate(value);
  return _formatIsoDate(DateTime.utc(date.year, date.month, date.day + days));
}

int _inclusiveDayCount(String startsOn, String endsOn) =>
    _parseIsoDate(endsOn).difference(_parseIsoDate(startsOn)).inDays + 1;

/// Mirrors the API's period split so fakes and previews agree with
/// `GET /campaigns/:id/periods`. Pass active dated milestones only.
List<CampaignPeriod> computeCampaignPeriods({
  required String? startsOn,
  required String? endsOn,
  required List<({String id, String dueOn, String name})> milestones,
}) {
  if (startsOn == null || endsOn == null || endsOn.compareTo(startsOn) < 0) {
    return const [];
  }
  final seen = <String>{};
  final dated = milestones
      .where(
        (row) =>
            row.dueOn.compareTo(startsOn) >= 0 &&
            row.dueOn.compareTo(endsOn) <= 0,
      )
      .toList()
    ..sort((a, b) => a.dueOn.compareTo(b.dueOn));
  final bounds = <({String endsOn, String? id, String? name})>[
    for (final row in dated)
      if (seen.add(row.dueOn)) (endsOn: row.dueOn, id: row.id, name: row.name),
  ];
  if (bounds.isEmpty || bounds.last.endsOn != endsOn) {
    bounds.add((endsOn: endsOn, id: null, name: null));
  }

  var nextStart = startsOn;
  final periods = <CampaignPeriod>[];
  for (var index = 0; index < bounds.length; index++) {
    final bound = bounds[index];
    periods.add(
      CampaignPeriod(
        key: bound.endsOn,
        index: index,
        startsOn: nextStart,
        endsOn: bound.endsOn,
        milestoneId: bound.id,
        name: bound.name,
        isFinal: index == bounds.length - 1,
        dayCount: _inclusiveDayCount(nextStart, bound.endsOn),
      ),
    );
    nextStart = addIsoDays(bound.endsOn, 1);
  }
  return periods;
}
