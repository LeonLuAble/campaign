import 'package:api_client/api_client.dart';

/// Formats a date as YYYY-MM-DD in the campaign calendar (local wall clock).
String formatCampaignDay(DateTime day) {
  final y = day.year.toString().padLeft(4, '0');
  final m = day.month.toString().padLeft(2, '0');
  final d = day.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

DateTime? parseCampaignDay(String? raw) {
  if (raw == null || raw.isEmpty) {
    return null;
  }
  return DateTime.tryParse(raw);
}

/// Today in the campaign timezone when possible; otherwise device local date.
String campaignToday(Campaign campaign, {String? fakeToday}) {
  if (fakeToday != null && fakeToday.isNotEmpty) {
    return fakeToday;
  }
  // Device local date is used as a practical stand-in; the API validates
  // against the campaign timezone on the server.
  return formatCampaignDay(DateTime.now());
}

List<String> recentCampaignDays({
  required Campaign campaign,
  required String today,
  int count = 14,
}) {
  final todayDate = parseCampaignDay(today) ?? DateTime.now();
  final start = parseCampaignDay(campaign.startsOn);
  final end = parseCampaignDay(campaign.endsOn);
  final days = <String>[];
  for (var i = 0; i < count; i++) {
    final day = todayDate.subtract(Duration(days: i));
    if (start != null && day.isBefore(DateTime(start.year, start.month, start.day))) {
      continue;
    }
    if (end != null && day.isAfter(DateTime(end.year, end.month, end.day))) {
      continue;
    }
    days.add(formatCampaignDay(day));
  }
  return days;
}

bool isFutureCampaignDay(String day, String today) {
  final selected = parseCampaignDay(day);
  final current = parseCampaignDay(today);
  if (selected == null || current == null) {
    return false;
  }
  return selected.isAfter(current);
}

ActionDefinition? pickDefinitionForUnit(
  List<ActionDefinition> definitions,
  String? unit,
) {
  final active = definitions.where((row) => row.isActive).toList();
  if (active.isEmpty) {
    return null;
  }
  if (unit == null || unit.isEmpty) {
    return active.first;
  }
  final match = active.where((row) => row.unit == unit);
  return match.isEmpty ? active.first : match.first;
}

RecordedAction? actionForDay({
  required List<RecordedAction> actions,
  required String day,
  required String definitionId,
}) {
  final match = actions.where(
    (row) =>
        row.occurredOn == day &&
        row.actionDefinitionId == definitionId &&
        !row.isCancelled,
  );
  return match.isEmpty ? null : match.first;
}

enum CheckInDayStatus { notYet, done, pending, rejected, notApplicable }

CheckInDayStatus dayStatus({
  required String day,
  required String today,
  required RecordedAction? action,
}) {
  if (isFutureCampaignDay(day, today)) {
    return CheckInDayStatus.notApplicable;
  }
  if (action == null) {
    return CheckInDayStatus.notYet;
  }
  final submission = action.submission?.status;
  if (submission == 'rejected') {
    return CheckInDayStatus.rejected;
  }
  if (submission == 'submitted' || submission == 'pending') {
    return CheckInDayStatus.pending;
  }
  return CheckInDayStatus.done;
}
