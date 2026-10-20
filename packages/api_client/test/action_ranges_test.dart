import 'dart:convert';
import 'dart:typed_data';

import 'package:api_client/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingAdapter implements HttpClientAdapter {
  _RecordingAdapter(this.respond, {this.status = 200});

  final Object Function(RequestOptions options) respond;
  final int status;
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
      status,
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

Map<String, dynamic> _batchJson({String status = 'approved'}) => {
      'id': 'b-1',
      'customerId': 'cust-1',
      'campaignId': 'camp-1',
      'participationId': 'p-1',
      'userId': 'u-1',
      'actionDefinitionId': 'd-1',
      'startOn': '2030-03-04',
      'endOn': '2030-03-06',
      'dayCount': 3,
      'quantityPerDay': 2,
      'totalQuantity': 6,
      'privacyLevel': 'private',
      'payload': {},
      'idempotencyKey': 'k-1',
      'createdByUserId': 'u-1',
      'createdAt': '2030-03-06T00:00:00.000Z',
      'status': status,
      'cancelled': false,
      'counts': {'submitted': 0, 'approved': 3, 'rejected': 0, 'cancelled': 0},
    };

Map<String, dynamic> _actionJson(String day) => {
      'id': 'a-$day',
      'campaignId': 'camp-1',
      'participationId': 'p-1',
      'userId': 'u-1',
      'actionDefinitionId': 'd-1',
      'occurredOn': day,
      'quantity': 2,
      'status': 'recorded',
      'batchId': 'b-1',
      'submission': {'id': 's-$day', 'actionId': 'a-$day', 'status': 'approved'},
    };

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

FakeCampaignApiClient _fake({bool dated = false, String review = 'auto'}) {
  final api = FakeCampaignApiClient(
    campaigns: [
      Campaign(
        id: 'camp-1',
        customerId: 'cust-1',
        templateId: 'tmpl-1',
        scopeId: 'scope-1',
        name: 'Ranges',
        status: 'started',
        timezone: 'UTC',
        startsOn: '2030-03-01',
        endsOn: '2030-03-31',
        communityIds: const [],
        configuration: {'submissionReview': review},
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
  api.fakeToday = '2030-03-15';
  if (dated) {
    api.milestones = [_milestone('m-1', '2030-03-10')];
  }
  return api;
}

void main() {
  group('HttpCampaignApiClient ranges', () {
    test('posts a range and parses the batch with its days', () async {
      final adapter = _RecordingAdapter(
        (_) => {
          'batch': _batchJson(),
          'actions': [
            _actionJson('2030-03-04'),
            _actionJson('2030-03-05'),
            _actionJson('2030-03-06'),
          ],
        },
      );
      final detail = await _client(adapter).recordActionRange(
        participationId: 'p-1',
        actionDefinitionId: 'd-1',
        startOn: '2030-03-04',
        days: 3,
        quantityPerDay: 2,
        idempotencyKey: 'k-1',
      );
      final request = adapter.requests.single;
      expect(request.path, '/participations/p-1/action-ranges');
      expect(request.data, {
        'actionDefinitionId': 'd-1',
        'startOn': '2030-03-04',
        'days': 3,
        'quantityPerDay': 2,
        'idempotencyKey': 'k-1',
      });
      expect(detail.batch.status, ActionBatchStatus.approved);
      expect(detail.batch.approvedCount, 3);
      expect(detail.batch.totalQuantity, 6);
      expect(detail.actions.map((row) => row.batchId).toSet(), {'b-1'});
    });

    test('exposes conflictingDates from SUBMISSION_OVERLAP', () async {
      final adapter = _RecordingAdapter(
        (_) => {
          'statusCode': 409,
          'code': 'SUBMISSION_OVERLAP',
          'error': 'Conflict',
          'message': 'Actions are already recorded on some of these days',
          'details': {
            'conflictingDates': ['2030-03-05'],
          },
        },
        status: 409,
      );
      final error = await _apiError(
        _client(adapter).recordActionRange(
          participationId: 'p-1',
          actionDefinitionId: 'd-1',
          startOn: '2030-03-04',
          days: 3,
          quantityPerDay: 2,
        ),
      );
      expect(error.code, 'SUBMISSION_OVERLAP');
      expect(error.conflictingDates, ['2030-03-05']);
    });

    test('uses the batch routes for list, get, cancel and review', () async {
      final adapter = _RecordingAdapter(
        (options) => options.path.endsWith('/action-batches')
            ? [_batchJson()]
            : {'batch': _batchJson(status: 'mixed'), 'actions': []},
      );
      final client = _client(adapter);
      final list = await client.listActionBatches('p-1');
      await client.getActionBatch('b-1');
      await client.cancelActionBatch('b-1');
      await client.approveActionBatch('b-1', note: 'ok');
      final rejected = await client.rejectActionBatch('b-1');
      expect(list.single.id, 'b-1');
      expect(rejected.batch.status, ActionBatchStatus.mixed);
      expect(
        adapter.requests.map((row) => '${row.method} ${row.path}').toList(),
        [
          'GET /participations/p-1/action-batches',
          'GET /action-batches/b-1',
          'POST /action-batches/b-1/cancel',
          'POST /action-batches/b-1/approve',
          'POST /action-batches/b-1/reject',
        ],
      );
      expect(adapter.requests[3].data, {'note': 'ok'});
    });
  });

  group('FakeCampaignApiClient ranges', () {
    test('rejects overlaps with the conflicting dates and allows re-entry after cancel',
        () async {
      final api = _fake();
      await api.recordAction(
        participationId: 'p-1',
        actionDefinitionId: 'd-1',
        occurredOn: '2030-03-05',
      );
      final overlap = await _apiError(
        api.recordActionRange(
          participationId: 'p-1',
          actionDefinitionId: 'd-1',
          startOn: '2030-03-04',
          days: 3,
          quantityPerDay: 1,
        ),
      );
      expect(overlap.code, 'SUBMISSION_OVERLAP');
      expect(overlap.conflictingDates, ['2030-03-05']);
      final duplicate = await _apiError(
        api.recordAction(
          participationId: 'p-1',
          actionDefinitionId: 'd-1',
          occurredOn: '2030-03-05',
        ),
      );
      expect(duplicate.code, 'SUBMISSION_OVERLAP');

      final range = await api.recordActionRange(
        participationId: 'p-1',
        actionDefinitionId: 'd-1',
        startOn: '2030-03-06',
        days: 3,
        quantityPerDay: 1,
      );
      expect(range.actions.map((row) => row.occurredOn), [
        '2030-03-06',
        '2030-03-07',
        '2030-03-08',
      ]);
      final cancelled = await api.cancelActionBatch(range.batch.id);
      expect(cancelled.batch.cancelled, isTrue);
      expect(cancelled.batch.cancelledCount, 3);
      final again = await api.recordActionRange(
        participationId: 'p-1',
        actionDefinitionId: 'd-1',
        startOn: '2030-03-06',
        days: 3,
        quantityPerDay: 1,
      );
      expect(again.batch.id, isNot(range.batch.id));
      expect(await api.listActionBatches('p-1'), hasLength(2));
    });

    test('replays an idempotency key and rejects a changed range', () async {
      final api = _fake();
      Future<ActionBatchDetail> post(num quantity) => api.recordActionRange(
            participationId: 'p-1',
            actionDefinitionId: 'd-1',
            startOn: '2030-03-02',
            days: 2,
            quantityPerDay: quantity,
            idempotencyKey: 'k',
          );
      final first = await post(1);
      expect((await post(1)).batch.id, first.batch.id);
      expect((await _apiError(post(2))).code, 'CONFLICT');
    });

    test('rejects future ends and too many days', () async {
      final api = _fake();
      expect(
        (await _apiError(
          api.recordActionRange(
            participationId: 'p-1',
            actionDefinitionId: 'd-1',
            startOn: '2030-03-14',
            days: 3,
            quantityPerDay: 1,
          ),
        ))
            .code,
        'BAD_REQUEST',
      );
      expect(
        (await _apiError(
          api.recordActionRange(
            participationId: 'p-1',
            actionDefinitionId: 'd-1',
            startOn: '2030-03-01',
            days: 93,
            quantityPerDay: 1,
          ),
        ))
            .code,
        'VALIDATION_FAILED',
      );
    });

    test('manual review: whole batch approve, single reject makes it mixed',
        () async {
      final api = _fake(review: 'manual');
      final range = await api.recordActionRange(
        participationId: 'p-1',
        actionDefinitionId: 'd-1',
        startOn: '2030-03-02',
        days: 3,
        quantityPerDay: 1,
      );
      expect(range.batch.status, ActionBatchStatus.submitted);
      final approved = await api.approveActionBatch(range.batch.id);
      expect(approved.batch.status, ActionBatchStatus.approved);
      await api.rejectSubmission(approved.actions[1].submission!.id);
      final mixed = await api.getActionBatch(range.batch.id);
      expect(mixed.batch.status, ActionBatchStatus.mixed);
      expect(mixed.batch.rejectedCount, 1);
      final rejected = await api.rejectActionBatch(range.batch.id);
      expect(rejected.batch.status, ActionBatchStatus.rejected);
    });

    test('needs a committed window once milestones are dated', () async {
      final api = _fake(dated: true);
      final none = await _apiError(
        api.recordAction(
          participationId: 'p-1',
          actionDefinitionId: 'd-1',
          occurredOn: '2030-03-14',
        ),
      );
      expect(none.code, 'NO_COMMITMENT_FOR_DATE');
      await api.createCommitment(
        participationId: 'p-1',
        targetValue: 3,
        unit: 'days',
      );
      final spans = await _apiError(
        api.recordActionRange(
          participationId: 'p-1',
          actionDefinitionId: 'd-1',
          startOn: '2030-03-09',
          days: 7,
          quantityPerDay: 1,
        ),
      );
      expect(spans.code, 'RANGE_SPANS_PERIODS');
      final today = await api.recordActionRange(
        participationId: 'p-1',
        actionDefinitionId: 'd-1',
        startOn: '2030-03-15',
        days: 1,
        quantityPerDay: 1,
      );
      expect(today.batch.dayCount, 1);
    });

    test('blocks recording while not taking part', () async {
      final api = _fake();
      await api.createCommitment(
        participationId: 'p-1',
        decision: CommitmentDecision.notTakingPart,
      );
      final blocked = await _apiError(
        api.recordAction(
          participationId: 'p-1',
          actionDefinitionId: 'd-1',
          occurredOn: '2030-03-14',
        ),
      );
      expect(blocked.code, 'NO_COMMITMENT_FOR_DATE');
    });
  });
}
