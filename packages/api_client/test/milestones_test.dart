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

Map<String, dynamic> _milestoneJson({
  String? dueOn = '2030-03-07',
  String? metric,
  num? thresholdValue,
  String? unit,
}) =>
    {
      'id': 'm-1',
      'customerId': 'cust-1',
      'campaignId': 'camp-1',
      'key': 'week_one',
      'name': '第一周',
      'description': null,
      'dueOn': dueOn,
      'metric': metric,
      'thresholdValue': thresholdValue,
      'unit': unit,
      'hasGoal': metric != null,
      'isActive': true,
      'translations': {
        'en': {'name': 'Week one', 'description': null},
      },
      'createdByUserId': 'u-1',
      'createdAt': '2030-01-01T00:00:00.000Z',
      'updatedAt': '2030-01-01T00:00:00.000Z',
    };

Campaign _campaign(String status) => Campaign(
      id: 'camp-d',
      customerId: 'cust-1',
      templateId: 'tmpl-1',
      scopeId: 'scope-1',
      name: 'Dated',
      status: status,
      timezone: 'UTC',
      startsOn: '2030-03-01',
      endsOn: '2030-03-31',
      communityIds: const [],
      configuration: const {},
    );

Future<ApiException> _apiError(Future<Object?> future) async {
  try {
    await future;
  } on ApiException catch (error) {
    return error;
  }
  fail('expected an ApiException');
}

void main() {
  group('HttpCampaignApiClient milestones', () {
    test('creates a dated goal-less milestone with translations', () async {
      final adapter = _RecordingAdapter((_) => _milestoneJson());
      final milestone = await _client(adapter).createMilestone(
        campaignId: 'camp-1',
        name: '第一周',
        dueOn: '2030-03-07',
        translations: const MilestoneContentTranslations(
          en: MilestoneEnglishTranslations(name: 'Week one'),
        ),
      );
      final request = adapter.requests.single;
      expect(request.method, 'POST');
      expect(request.path, '/campaigns/camp-1/milestones');
      expect(request.data, {
        'name': '第一周',
        'dueOn': '2030-03-07',
        'translations': {
          'en': {'name': 'Week one'},
        },
      });
      expect(milestone.dueOn, '2030-03-07');
      expect(milestone.hasGoal, isFalse);
      expect(milestone.goal, isNull);
      expect(milestone.englishTranslations.name, 'Week one');
    });

    test('sends the goal fields together and parses them', () async {
      final adapter = _RecordingAdapter(
        (_) => _milestoneJson(
          dueOn: null,
          metric: MilestoneMetric.completionPercent,
          thresholdValue: 50,
          unit: 'days',
        ),
      );
      final milestone = await _client(adapter).createMilestone(
        campaignId: 'camp-1',
        name: 'Halfway',
        goal: const MilestoneGoal(
          metric: MilestoneMetric.completionPercent,
          thresholdValue: 50,
          unit: 'days',
        ),
      );
      expect(adapter.requests.single.data, {
        'name': 'Halfway',
        'metric': 'completion_percent',
        'thresholdValue': 50,
        'unit': 'days',
      });
      expect(milestone.goal?.thresholdValue, 50);
      expect(milestone.isDated, isFalse);
    });

    test('update sends explicit nulls only when clearing', () async {
      final adapter = _RecordingAdapter((_) => _milestoneJson());
      final client = _client(adapter);
      await client.updateMilestone('m-1', name: 'Renamed');
      await client.updateMilestone('m-1', clearDueOn: true, clearGoal: true);
      expect(adapter.requests[0].method, 'PATCH');
      expect(adapter.requests[0].path, '/milestones/m-1');
      expect(adapter.requests[0].data, {'name': 'Renamed'});
      expect(adapter.requests[1].data, {
        'dueOn': null,
        'metric': null,
        'thresholdValue': null,
        'unit': null,
      });
    });

    test('reads progress, evaluations and periods', () async {
      final adapter = _RecordingAdapter((options) {
        if (options.path.endsWith('/progress')) {
          return {
            'milestoneId': 'm-1',
            'campaignId': 'camp-1',
            'customerId': 'cust-1',
            'hasGoal': false,
            'metric': null,
            'unit': null,
            'thresholdValue': null,
            'currentAchievedValue': 0,
            'currentTargetValue': 0,
            'currentCompletionPercent': null,
            'crossed': false,
            'status': 'none',
            'computedAt': '2030-03-02T00:00:00.000Z',
          };
        }
        if (options.path.endsWith('/evaluations')) {
          return [
            {
              'id': 'e-1',
              'milestoneId': 'm-1',
              'customerId': 'cust-1',
              'evaluatedByUserId': 'u-1',
              'achievedValue': 12,
              'targetValue': 20,
              'completionPercent': 60,
              'crossed': true,
              'status': 'in_progress',
              'evaluatedAt': '2030-03-02T00:00:00.000Z',
              'createdAt': '2030-03-02T00:00:00.000Z',
            },
          ];
        }
        return [
          {
            'key': '2030-03-07',
            'index': 0,
            'startsOn': '2030-03-01',
            'endsOn': '2030-03-07',
            'milestoneId': 'm-1',
            'name': 'Week one',
            'isFinal': false,
            'dayCount': 7,
          },
          {
            'key': '2030-03-31',
            'index': 1,
            'startsOn': '2030-03-08',
            'endsOn': '2030-03-31',
            'milestoneId': null,
            'name': null,
            'isFinal': true,
            'dayCount': 24,
          },
        ];
      });
      final client = _client(adapter);
      final progress = await client.getMilestoneProgress('m-1');
      expect(progress.hasGoal, isFalse);
      expect(progress.status, 'none');
      final evaluations = await client.listMilestoneEvaluations('m-1');
      expect(evaluations.single.completionPercent, 60);
      final periods = await client.listCampaignPeriods('camp-1');
      expect(adapter.requests.last.path, '/campaigns/camp-1/periods');
      expect(periods.map((p) => p.key), ['2030-03-07', '2030-03-31']);
      expect(periods.last.isFinal, isTrue);
      expect(periods.last.milestoneId, isNull);
    });
  });

  group('computeCampaignPeriods', () {
    test('one whole-campaign period without dated milestones', () {
      final periods = computeCampaignPeriods(
        startsOn: '2030-03-01',
        endsOn: '2030-03-31',
        milestones: const [],
      );
      expect(periods.single.key, '2030-03-31');
      expect(periods.single.dayCount, 31);
      expect(periods.single.isFinal, isTrue);
    });

    test('a milestone on endsOn closes the final period', () {
      final periods = computeCampaignPeriods(
        startsOn: '2030-03-01',
        endsOn: '2030-03-31',
        milestones: const [
          (id: 'b', dueOn: '2030-03-31', name: 'End'),
          (id: 'a', dueOn: '2030-03-01', name: 'Day one'),
        ],
      );
      expect(periods.map((p) => [p.startsOn, p.endsOn, p.milestoneId]), [
        ['2030-03-01', '2030-03-01', 'a'],
        ['2030-03-02', '2030-03-31', 'b'],
      ]);
      expect(periods.last.isFinal, isTrue);
    });

    test('returns nothing while the window is incomplete', () {
      expect(
        computeCampaignPeriods(
          startsOn: '2030-03-01',
          endsOn: null,
          milestones: const [],
        ),
        isEmpty,
      );
    });
  });

  group('FakeCampaignApiClient milestones', () {
    test('creates, localizes and splits periods in draft', () async {
      final fake = FakeCampaignApiClient(campaigns: [_campaign('draft')]);
      final week = await fake.createMilestone(
        campaignId: 'camp-d',
        name: '第一周',
        dueOn: '2030-03-07',
        translations: const MilestoneContentTranslations(
          en: MilestoneEnglishTranslations(name: 'Week one'),
        ),
      );
      expect(week.name, 'Week one');
      fake.lastAcceptLanguage = 'zh-Hans';
      final periods = await fake.listCampaignPeriods('camp-d');
      expect(periods.map((p) => p.name), ['第一周', null]);
      expect((await fake.listMilestones('camp-d')).single.name, '第一周');
    });

    test('validates window, duplicates and purpose', () async {
      final fake = FakeCampaignApiClient(campaigns: [_campaign('draft')]);
      expect(
        (await _apiError(
          fake.createMilestone(
            campaignId: 'camp-d',
            name: 'Late',
            dueOn: '2030-04-01',
          ),
        ))
            .code,
        'MILESTONE_DATE_OUT_OF_WINDOW',
      );
      await fake.createMilestone(
        campaignId: 'camp-d',
        name: 'A',
        dueOn: '2030-03-10',
      );
      final duplicate = await _apiError(
        fake.createMilestone(
          campaignId: 'camp-d',
          name: 'B',
          dueOn: '2030-03-10',
        ),
      );
      expect(duplicate.code, 'MILESTONE_DATE_DUPLICATE');
      expect(duplicate.statusCode, 409);
      expect(
        (await _apiError(
          fake.createMilestone(campaignId: 'camp-d', name: 'Nothing'),
        ))
            .code,
        'BAD_REQUEST',
      );
    });

    test('locks dates after publish but keeps content editable', () async {
      final fake = FakeCampaignApiClient(campaigns: [_campaign('draft')]);
      final created = await fake.createMilestone(
        campaignId: 'camp-d',
        name: 'Stage',
        dueOn: '2030-03-10',
      );
      final moved = await fake.updateMilestone(created.id, dueOn: '2030-03-12');
      expect(moved.dueOn, '2030-03-12');
      await fake.publishCampaign('camp-d');

      for (final attempt in [
        () => fake.updateMilestone(created.id, dueOn: '2030-03-14'),
        () => fake.updateMilestone(created.id, clearDueOn: true),
        () => fake.updateMilestone(created.id, isActive: false),
        () => fake.createMilestone(
              campaignId: 'camp-d',
              name: 'Late',
              dueOn: '2030-03-20',
            ),
      ]) {
        expect((await _apiError(attempt())).code, 'MILESTONE_LOCKED');
      }

      final edited = await fake.updateMilestone(
        created.id,
        name: 'Stage one',
        goal: const MilestoneGoal(
          metric: MilestoneMetric.achievedValue,
          thresholdValue: 5,
          unit: 'days',
        ),
      );
      expect(edited.name, 'Stage one');
      expect(edited.hasGoal, isTrue);
      expect(edited.dueOn, '2030-03-12');
    });

    test('skips evaluation of goal-less milestones', () async {
      final fake = FakeCampaignApiClient(campaigns: [_campaign('started')]);
      fake.milestones = [
        Milestone(
          id: 'ms-x',
          customerId: 'cust-1',
          campaignId: 'camp-d',
          key: 'checkpoint',
          name: 'Checkpoint',
          dueOn: '2030-03-10',
          isActive: true,
          createdByUserId: 'u-1',
          createdAt: DateTime.utc(2030),
          updatedAt: DateTime.utc(2030),
        ),
      ];
      expect((await _apiError(fake.evaluateMilestone('ms-x'))).code,
          'BAD_REQUEST');
      expect(await fake.listMilestoneEvaluations('ms-x'), isEmpty);
      expect((await fake.getMilestoneProgress('ms-x')).hasGoal, isFalse);

      final goal = await fake.createMilestone(
        campaignId: 'camp-d',
        name: 'Ten days',
        goal: const MilestoneGoal(
          metric: MilestoneMetric.achievedValue,
          thresholdValue: 10,
          unit: 'days',
        ),
      );
      fake.fakeMilestoneAchievedValue = 12;
      final evaluation = await fake.evaluateMilestone(goal.id);
      expect(evaluation.crossed, isTrue);
      expect(await fake.listMilestoneEvaluations(goal.id), hasLength(1));
    });
  });
}
