import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Formats a campaign-local calendar date (YYYY-MM-DD) with [locale].
String formatCampaignDate(String? isoDate, Locale locale) {
  if (isoDate == null || isoDate.isEmpty) {
    return '';
  }
  final parts = isoDate.split('-');
  if (parts.length != 3) {
    return isoDate;
  }
  final year = int.tryParse(parts[0]);
  final month = int.tryParse(parts[1]);
  final day = int.tryParse(parts[2]);
  if (year == null || month == null || day == null) {
    return isoDate;
  }
  final date = DateTime(year, month, day);
  return DateFormat.yMMMd(locale.toString()).format(date);
}

String formatCampaignDateRange(
  String? startsOn,
  String? endsOn,
  Locale locale,
) {
  final start = formatCampaignDate(startsOn, locale);
  final end = formatCampaignDate(endsOn, locale);
  if (start.isEmpty && end.isEmpty) {
    return '';
  }
  if (start.isEmpty) {
    return end;
  }
  if (end.isEmpty) {
    return start;
  }
  return '$start – $end';
}

/// Parses YYYY-MM-DD into a local [DateTime] at midnight (calendar only).
DateTime? parseCampaignDate(String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) {
    return null;
  }
  final parts = isoDate.split('-');
  if (parts.length != 3) {
    return null;
  }
  final year = int.tryParse(parts[0]);
  final month = int.tryParse(parts[1]);
  final day = int.tryParse(parts[2]);
  if (year == null || month == null || day == null) {
    return null;
  }
  return DateTime(year, month, day);
}

/// Serializes a picked calendar date without converting through UTC.
String toCampaignDateString(DateTime date) {
  final y = date.year.toString().padLeft(4, '0');
  final m = date.month.toString().padLeft(2, '0');
  final d = date.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

Future<String?> pickCampaignDate({
  required BuildContext context,
  String? initialIso,
  String? helpText,
}) async {
  final initial = parseCampaignDate(initialIso) ?? DateTime.now();
  final picked = await showDatePicker(
    context: context,
    initialDate: initial,
    firstDate: DateTime(2000),
    lastDate: DateTime(2100),
    helpText: helpText,
  );
  if (picked == null) {
    return null;
  }
  return toCampaignDateString(picked);
}

/// Common IANA timezones for the searchable picker (campaign-local, not device).
const List<String> campaignTimezoneOptions = [
  'Asia/Kuala_Lumpur',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Manila',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'UTC',
];
