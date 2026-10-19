import 'dart:convert';
import 'dart:typed_data';

import 'package:api_client/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingAdapter implements HttpClientAdapter {
  _RecordingAdapter(this.respond);

  final Map<String, dynamic> Function(RequestOptions options) respond;
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

void main() {
  test('sends only the decision when not taking part and parses the reply',
      () async {
    final adapter = _RecordingAdapter(
      (_) => {
        'id': 'c-1',
        'participationId': 'p-1',
        'decision': 'not_taking_part',
        'typeKey': null,
        'targetValue': 0,
        'unit': null,
      },
    );
    final commitment = await _client(adapter).createCommitment(
      participationId: 'p-1',
      typeKey: 'fa_yuan_su',
      targetValue: 10,
      unit: 'days',
      decision: CommitmentDecision.notTakingPart,
    );
    expect(adapter.requests.single.data, {'decision': 'not_taking_part'});
    expect(commitment.isNotTakingPart, isTrue);
    expect(commitment.targetValue, 0);
    expect(commitment.unit, '');
  });

  test('keeps the legacy commit payload and defaults decision to committed',
      () async {
    final adapter = _RecordingAdapter(
      (_) => {
        'id': 'c-1',
        'participationId': 'p-1',
        'typeKey': 'fa_yuan_su',
        'targetValue': 10,
        'unit': 'days',
      },
    );
    final commitment = await _client(adapter).createCommitment(
      participationId: 'p-1',
      typeKey: 'fa_yuan_su',
      targetValue: 10,
      unit: 'days',
    );
    expect(adapter.requests.single.data, {
      'decision': 'committed',
      'typeKey': 'fa_yuan_su',
      'targetValue': 10,
      'unit': 'days',
    });
    expect(commitment.decision, CommitmentDecision.committed);
  });

  test('reads the participation summary with an optional community scope',
      () async {
    final adapter = _RecordingAdapter(
      (_) => {
        'customerId': 'cust-1',
        'campaignId': 'camp-1',
        'communityId': 'com-1',
        'enrolled': 3,
        'awaitingCommitment': 1,
        'takingPart': 1,
        'notTakingPart': 1,
        'withdrawn': 2,
      },
    );
    final summary = await _client(adapter).getParticipationSummary(
      'camp-1',
      communityId: 'com-1',
    );
    final request = adapter.requests.single;
    expect(request.path, '/campaigns/camp-1/participation-summary');
    expect(request.queryParameters, {'communityId': 'com-1'});
    expect(summary.enrolled, 3);
    expect(summary.notTakingPart, 1);
    expect(summary.withdrawn, 2);
  });

  test('parses the new aggregate counts on reports', () {
    final report = AggregateReport.fromJson({
      'scope': 'campaign',
      'campaignId': 'camp-1',
      'generatedAt': '2026-10-19T00:00:00.000Z',
      'progress': {
        'participantCount': 3,
        'committedParticipantCount': 1,
        'notTakingPartCount': 1,
        'awaitingCommitmentCount': 1,
        'units': [],
      },
    });
    expect(report.notTakingPartCount, 1);
    expect(report.awaitingCommitmentCount, 1);
  });

  group('FakeCampaignApiClient', () {
    FakeCampaignApiClient fake() => FakeCampaignApiClient(
          communities: const [
            Community(
              id: 'region',
              customerId: 'cust-1',
              name: 'Region',
              slug: 'region',
              isActive: true,
            ),
            Community(
              id: 'chapter',
              customerId: 'cust-1',
              parentId: 'region',
              name: 'Chapter',
              slug: 'chapter',
              isActive: true,
            ),
          ],
          participations: const [
            Participation(
              id: 'p-1',
              customerId: 'cust-1',
              campaignId: 'camp-1',
              userId: 'u-1',
              status: 'enrolled',
              communityId: 'region',
            ),
            Participation(
              id: 'p-2',
              customerId: 'cust-1',
              campaignId: 'camp-1',
              userId: 'u-2',
              status: 'enrolled',
              communityId: 'chapter',
            ),
            Participation(
              id: 'p-3',
              customerId: 'cust-1',
              campaignId: 'camp-1',
              userId: 'u-3',
              status: 'withdrawn',
              engagement: 'withdrawn',
              communityId: 'chapter',
            ),
          ],
        );

    test('switches between not taking part and committed on one row',
        () async {
      final api = fake();
      final declined = await api.createCommitment(
        participationId: 'p-2',
        decision: CommitmentDecision.notTakingPart,
      );
      expect(declined.isNotTakingPart, isTrue);
      expect(declined.targetValue, 0);
      expect(
        api.participations.firstWhere((row) => row.id == 'p-2').engagement,
        'not_taking_part',
      );

      final recommitted = await api.createCommitment(
        participationId: 'p-2',
        targetValue: 7,
        unit: 'days',
      );
      expect(recommitted.id, declined.id);
      expect(recommitted.isNotTakingPart, isFalse);
      expect(
        api.participations.firstWhere((row) => row.id == 'p-2').engagement,
        'taking_part',
      );
      expect(await api.listCommitments('p-2'), hasLength(1));
    });

    test('requires a target when committing', () async {
      await expectLater(
        fake().createCommitment(participationId: 'p-1'),
        throwsA(isA<ApiException>()),
      );
    });

    test('summarises engagement with subtree scope', () async {
      final api = fake();
      await api.createCommitment(
        participationId: 'p-1',
        targetValue: 10,
        unit: 'days',
      );
      await api.createCommitment(
        participationId: 'p-2',
        decision: CommitmentDecision.notTakingPart,
      );
      final all = await api.getParticipationSummary('camp-1');
      expect(all.enrolled, 2);
      expect(all.takingPart, 1);
      expect(all.notTakingPart, 1);
      expect(all.awaitingCommitment, 0);
      expect(all.withdrawn, 1);

      final chapter =
          await api.getParticipationSummary('camp-1', communityId: 'chapter');
      expect(chapter.enrolled, 1);
      expect(chapter.notTakingPart, 1);
      expect(chapter.takingPart, 0);
      expect(chapter.withdrawn, 1);
    });
  });
}
