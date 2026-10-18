import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../util/format.dart';

String campaignStatusLabel(AppLocalizations l10n, String status) {
  switch (status) {
    case 'draft':
      return l10n.campaignStatusDraft;
    case 'published':
      return l10n.campaignStatusPublished;
    case 'started':
      return l10n.campaignStatusStarted;
    case 'completed':
      return l10n.campaignStatusCompleted;
    default:
      return status;
  }
}

IconData campaignStatusIcon(String status) {
  switch (status) {
    case 'published':
      return Icons.public_outlined;
    case 'started':
      return Icons.play_arrow;
    case 'completed':
      return Icons.check_circle_outline;
    default:
      return Icons.flag_outlined;
  }
}

/// Inclusive calendar-day count between [startsOn] and [endsOn] (YYYY-MM-DD).
int? campaignDurationDays(Campaign campaign) {
  final startRaw = campaign.startsOn;
  final endRaw = campaign.endsOn;
  if (startRaw == null || endRaw == null) {
    return null;
  }
  final start = DateTime.tryParse(startRaw);
  final end = DateTime.tryParse(endRaw);
  if (start == null || end == null) {
    return null;
  }
  return end.difference(start).inDays + 1;
}

String formatCampaignDates(Campaign campaign) {
  final start = campaign.startsOn ?? '—';
  final end = campaign.endsOn ?? '—';
  return '$start – $end';
}

String choiceDisplayName(CommitmentChoice choice) =>
    (choice.label != null && choice.label!.trim().isNotEmpty)
        ? choice.label!
        : choice.name;

String choiceSubtitle(
  AppLocalizations l10n,
  CommitmentChoice choice,
  Campaign? campaign,
) {
  final parts = <String>[];
  final description = choice.description?.trim();
  if (description != null && description.isNotEmpty) {
    parts.add(description);
  }
  if (choice.usesCampaignDuration) {
    final days = campaign == null ? null : campaignDurationDays(campaign);
    if (days != null) {
      parts.add(l10n.wholeCampaignDays(formatNumber(days)));
    } else {
      parts.add(l10n.usesCampaignDuration);
    }
  } else if (choice.suggestedTarget != null) {
    parts.add(
      l10n.suggestedTargetLabel(
        formatNumber(choice.suggestedTarget!),
        choice.canonicalUnit,
      ),
    );
  } else {
    parts.add(choice.canonicalUnit);
  }
  return parts.join(' · ');
}

num resolveCommitmentTarget({
  required CommitmentChoice choice,
  required Campaign campaign,
  required String? manualTargetText,
}) {
  if (choice.usesCampaignDuration) {
    return campaignDurationDays(campaign) ?? choice.suggestedTarget ?? 1;
  }
  if (choice.suggestedTarget != null &&
      (manualTargetText == null || manualTargetText.trim().isEmpty)) {
    return choice.suggestedTarget!;
  }
  final parsed = int.tryParse(manualTargetText?.trim() ?? '');
  if (parsed == null || parsed < 1) {
    throw const FormatException('target');
  }
  return parsed;
}

String localizeJoinError(
  AppLocalizations l10n,
  Object error, {
  Campaign? campaign,
}) {
  if (error is ApiException) {
    final message = error.message.toLowerCase();
    if (error.code == 'CONFLICT' || message.contains('already enrolled')) {
      return l10n.errorAlreadyJoined;
    }
    if (error.code == 'BAD_REQUEST' || error.code == 'VALIDATION_FAILED') {
      if (message.contains('not in a community') ||
          message.contains('targeted')) {
        return l10n.errorNotEligible;
      }
      if (message.contains('published or started')) {
        if (campaign?.status == 'completed') {
          return l10n.errorCampaignEnded;
        }
        return l10n.errorCampaignNotOpen;
      }
    }
  }
  return localizeApiError(l10n, error);
}
