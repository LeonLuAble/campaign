import 'dart:convert';
import 'dart:typed_data';

import 'package:api_client/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingAdapter implements HttpClientAdapter {
  _RecordingAdapter(this.respond);

  final Object Function(RequestOptions options) respond;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      jsonEncode(respond(options)),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

HttpCampaignApiClient _client(_RecordingAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
  dio.httpClientAdapter = adapter;
  return HttpCampaignApiClient(
    baseUrl: 'http://example.test/api/v1',
    tokenStore: MemoryTokenStore(accessToken: 'a', refreshToken: 'r'),
    dio: dio,
    refreshDio: Dio(),
  );
}

Future<ApiException> _apiError(Future<Object?> future) async {
  try {
    await future;
  } on ApiException catch (error) {
    return error;
  }
  fail('expected an ApiException');
}

Milestone _milestone(String id, String dueOn) => Milestone(
      id: id,
      customerId: 'cust-1',
      campaignId: 'camp-1',
      key: id,
      name: id,
      dueOn: dueOn,
      isActive: true,
      createdByUserId: 'u-1',
      createdAt: DateTime.utc(2030),
      updatedAt: DateTime.utc(2030),
    );

FakeCampaignApiClient _fake({bool dated = true, String today = '2030-03-15'}) {
  final api = FakeCampaignApiClient(
    campaigns: const [
      Campaign(
        id: 'camp-1',
        customerId: 'cust-1',
        templateId: 'tmpl-1',
        scopeId: 'scope-1',
        name: 'Dated',
        status: 'started',
        timezone: 'UTC',
        startsOn: '2030-03-01',
        endsOn: '2030-03-31',
        communityIds: [],
        configuration: {},
      ),
    ],
    participations: const [
      Participation(
        id: 'p-1',
        customerId: 'cust-1',
        campaignId: 'camp-1',
        userId: 'u-1',
        status: 'enrolled',
      ),
    ],
  );
  api.fakeToday = today;
  if (dated) {
    api.milestones = [
      _milestone('m-1', '2030-03-10'),
      _milestone('m-2', '2030-03-20'),
    ];
  }
  return api;
}

void main() {
  group('HttpCampaignApiClient periods', () {
    test('sends periodKey and restOfCampaign and parses the window', () async {
      final adapter = _RecordingAdapter(
        (_) => {
          'id': 'c-1',
          'participationId': 'p-1',
          'decision': 'not_taking_part',
          'targetValue': 0,
          'unit': null,
          'validFrom': '2030-03-15',
          'validTo': '2030-03-20',
          'periodKey': '2030-03-20',
          'periodMilestoneId': 'm-2',
        },
      );
      final commitment = await _client(adapter).createCommitment(
        participationId: 'p-1',
        typeKey: 'ding_ri_su',
        targetValue: 3,
        unit: 'days',
        periodKey: '2030-03-20',
        restOfCampaign: true,
      );
      expect(adapter.requests.single.data, {
        'decision': 'not_taking_part',
        'periodKey': '2030-03-20',
        'restOfCampaign': true,
      });
      expect(commitment.validFrom, '2030-03-15');
      expect(commitment.periodKey, '2030-03-20');
      expect(commitment.periodMilestoneId, 'm-2');
      expect(commitment.isWholeCampaign, isFalse);
    });

    test('passes periodKey to commitment options', () async {
      final adapter = _RecordingAdapter(
        (_) => {
          'campaignId': 'camp-1',
          'customerId': 'cust-1',
          'strategy': 'vegetarian',
          'units': ['days'],
          'choices': [],
          'periodKey': '2030-03-20',
          'periodStatus': 'open',
          'validFrom': '2030-03-15',
          'validTo': '2030-03-20',
          'dayCount': 6,
        },
      );
      final options = await _client(adapter)
          .getCommitmentOptions('camp-1', periodKey: '2030-03-20');
      final request = adapter.requests.single;
      expect(request.path, '/campaigns/camp-1/commitment-options');
      expect(request.queryParameters, {'periodKey': '2030-03-20'});
      expect(options.dayCount, 6);
      expect(options.periodStatus, PeriodStatus.open);
    });

    test('lists participation periods', () async {
      final adapter = _RecordingAdapter(
        (_) => [
          {
            'key': '2030-03-10',
            'startsOn': '2030-03-01',
            'endsOn': '2030-03-10',
            'milestoneId': 'm-1',
            'name': 'm-1',
            'index': 0,
            'isFinal': false,
            'dayCount': 10,
            'status': 'closed',
            'decision': null,
            'commitment': null,
            'resultStatus': 'not_submitted',
            'coveredDays': 0,
            'approvedDays': 0,
            'achieved': 0,
            'target': 0,
            'unit': null,
          },
          {
            'key': '2030-03-20',
            'startsOn': '2030-03-11',
            'endsOn': '2030-03-20',
            'milestoneId': 'm-2',
            'name': 'm-2',
            'index': 1,
            'isFinal': false,
            'dayCount': 10,
            'status': 'open',
            'decision': 'committed',
            'commitment': {
              'id': 'c-1',
              'typeKey': 'ding_ri_su',
              'targetValue': 3,
              'unit': 'days',
              'validFrom': '2030-03-15',
              'validTo': '2030-03-20',
            },
            'resultStatus': 'pending_review',
            'coveredDays': 1,
            'approvedDays': 0,
            'achieved': 0,
            'target': 3,
            'unit': 'days',
          },
        ],
      );
      final periods = await _client(adapter).listParticipationPeriods('p-1');
      expect(adapter.requests.single.path, '/participations/p-1/periods');
      expect(periods.first.resultStatus, PeriodResultStatus.notSubmitted);
      expect(periods.first.commitment, isNull);
      expect(periods.last.key, '2030-03-20');
      expect(periods.last.commitment!.validFrom, '2030-03-15');
      expect(periods.last.target, 3);
    });
  });

  group('FakeCampaignApiClient periods', () {
    test('keeps one commitment per period and replaces within it', () async {
      final api = _fake();
      final first = await api.createCommitment(
        participationId: 'p-1',
        typeKey: 'ding_ri_su',
        targetValue: 3,
        unit: 'days',
      );
      expect(first.periodKey, '2030-03-20');
      expect(first.validFrom, '2030-03-15');
      final later = await api.createCommitment(
        participationId: 'p-1',
        typeKey: 'ding_ri_su',
        targetValue: 5,
        unit: 'days',
        periodKey: '2030-03-31',
      );
      expect(later.validFrom, '2030-03-21');
      final replaced = await api.createCommitment(
        participationId: 'p-1',
        typeKey: 'ding_ri_su',
        targetValue: 4,
        unit: 'days',
      );
      expect(replaced.id, first.id);
      expect(replaced.targetValue, 4);
      expect(await api.listCommitments('p-1'), hasLength(2));
    });

    test('rejects closed periods and targets above the window', () async {
      final api = _fake();
      final closed = await _apiError(
        api.createCommitment(
          participationId: 'p-1',
          targetValue: 1,
          unit: 'days',
          periodKey: '2030-03-10',
        ),
      );
      expect(closed.code, 'PERIOD_CLOSED');
      final tooMany = await _apiError(
        api.createCommitment(
          participationId: 'p-1',
          targetValue: 7,
          unit: 'days',
        ),
      );
      expect(tooMany.code, 'COMMITMENT_TARGET_EXCEEDS_PERIOD');
      final meals = await _apiError(
        api.createCommitment(
          participationId: 'p-1',
          targetValue: 19,
          unit: 'meals',
        ),
      );
      expect(meals.code, 'COMMITMENT_TARGET_EXCEEDS_PERIOD');
    });

    test('restOfCampaign declines every remaining open period', () async {
      final api = _fake();
      await api.createCommitment(participationId: 'p-1', restOfCampaign: true);
      final rows = await api.listCommitments('p-1');
      expect(rows.map((row) => row.periodKey), ['2030-03-20', '2030-03-31']);
      expect(rows.every((row) => row.isNotTakingPart), isTrue);
    });

    test('resolves duration targets to the window', () async {
      final api = _fake();
      final options = await api.getCommitmentOptions('camp-1');
      expect(options.periodKey, '2030-03-20');
      expect(options.dayCount, 6);
      for (final choice in options.choices.where(
        (choice) => choice.usesCampaignDuration,
      )) {
        expect(choice.suggestedTarget, 6);
      }
      final ahead = await api.getCommitmentOptions(
        'camp-1',
        periodKey: '2030-03-31',
      );
      expect(ahead.validFrom, '2030-03-21');
      expect(ahead.dayCount, 11);
      expect(ahead.periodStatus, PeriodStatus.upcoming);
    });

    test('defaults to the first period before the campaign starts', () async {
      final api = _fake(today: '2030-02-20');
      final options = await api.getCommitmentOptions('camp-1');
      expect(options.periodKey, '2030-03-10');
      expect(options.validFrom, '2030-03-01');
      expect(options.dayCount, 10);
    });

    test('lists periods with result statuses', () async {
      final api = _fake();
      await api.createCommitment(
        participationId: 'p-1',
        typeKey: 'ding_ri_su',
        targetValue: 3,
        unit: 'days',
      );
      final periods = await api.listParticipationPeriods('p-1');
      expect(periods.map((row) => row.status), [
        PeriodStatus.closed,
        PeriodStatus.open,
        PeriodStatus.upcoming,
      ]);
      expect(periods.first.resultStatus, PeriodResultStatus.notSubmitted);
      expect(periods[1].decision, CommitmentDecision.committed);
      expect(periods[1].resultStatus, PeriodResultStatus.awaiting);
      expect(periods[1].target, 3);
      expect(periods.last.commitment, isNull);
    });

    test(
      'campaigns without dated milestones keep one whole-campaign row',
      () async {
        final api = _fake(dated: false);
        final first = await api.createCommitment(
          participationId: 'p-1',
          targetValue: 40,
          unit: 'days',
        );
        expect(first.isWholeCampaign, isTrue);
        final second = await api.createCommitment(
          participationId: 'p-1',
          targetValue: 20,
          unit: 'days',
        );
        expect(second.id, first.id);
        expect(await api.listCommitments('p-1'), hasLength(1));
        final periods = await api.listParticipationPeriods('p-1');
        expect(periods, hasLength(1));
        expect(periods.single.target, 20);
      },
    );
  });
}
