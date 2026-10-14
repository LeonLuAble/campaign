import 'dart:convert';
import 'dart:typed_data';

import 'package:api_client/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

class _ScriptedAdapter implements HttpClientAdapter {
  _ScriptedAdapter(this.handlers);

  final List<ResponseBody Function(RequestOptions options)> handlers;
  int index = 0;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (index >= handlers.length) {
      throw StateError('Unexpected request ${options.method} ${options.path}');
    }
    return handlers[index++](options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(int status, Map<String, dynamic> body) {
  return ResponseBody.fromString(
    jsonEncode(body),
    status,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

void main() {
  test('attaches Bearer token and zh-Hans Accept-Language', () async {
    final adapter = _ScriptedAdapter([
      (options) {
        expect(options.headers['Authorization'], 'Bearer access-1');
        expect(options.headers['Accept-Language'], 'zh-Hans');
        return _json(200, {
          'id': 'user-1',
          'firstName': 'A',
          'lastName': 'B',
          'displayName': 'A B',
          'locale': 'zh-Hans',
          'timezone': 'Asia/Kuala_Lumpur',
          'isActive': true,
          'isPlatformAdmin': false,
          'identities': [],
        });
      },
    ]);
    final dio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    dio.httpClientAdapter = adapter;
    final refreshDio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    refreshDio.httpClientAdapter = _ScriptedAdapter([]);
    final client = HttpCampaignApiClient(
      baseUrl: 'http://example.test/api/v1',
      tokenStore: MemoryTokenStore(
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      ),
      localeProvider: () => 'zh',
      dio: dio,
      refreshDio: refreshDio,
    );

    final me = await client.getMe();
    expect(me.locale, 'zh-Hans');
    expect(me.isPlatformAdmin, isFalse);
  });

  test('rotates tokens after 401 and retries the original request', () async {
    final adapter = _ScriptedAdapter([
      (options) => _json(401, {
        'statusCode': 401,
        'code': 'UNAUTHORIZED',
        'error': 'Unauthorized',
        'message': 'expired',
        'correlationId': null,
        'timestamp': '2026-01-01T00:00:00.000Z',
        'path': '/api/v1/me',
      }),
      (options) {
        expect(options.headers['Authorization'], 'Bearer access-2');
        return _json(200, {
          'id': 'user-1',
          'isActive': true,
          'isPlatformAdmin': false,
          'identities': [],
        });
      },
    ]);
    final refreshAdapter = _ScriptedAdapter([
      (options) {
        expect(options.path, '/auth/refresh');
        final data = options.data as Map;
        expect(data['refreshToken'], 'refresh-1');
        return _json(200, {
          'accessToken': 'access-2',
          'refreshToken': 'refresh-2',
        });
      },
    ]);
    final dio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    dio.httpClientAdapter = adapter;
    final refreshDio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    refreshDio.httpClientAdapter = refreshAdapter;
    final store = MemoryTokenStore(
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    );
    final client = HttpCampaignApiClient(
      baseUrl: 'http://example.test/api/v1',
      tokenStore: store,
      dio: dio,
      refreshDio: refreshDio,
    );

    final me = await client.getMe();
    expect(me.id, 'user-1');
    expect(store.accessToken, 'access-2');
    expect(store.refreshToken, 'refresh-2');
  });

  test('TOKEN_REUSED clears storage and notifies logout', () async {
    var expired = false;
    final adapter = _ScriptedAdapter([
      (options) => _json(401, {
        'statusCode': 401,
        'code': 'UNAUTHORIZED',
        'error': 'Unauthorized',
        'message': 'expired',
        'correlationId': null,
        'timestamp': '2026-01-01T00:00:00.000Z',
        'path': '/api/v1/me',
      }),
    ]);
    final refreshAdapter = _ScriptedAdapter([
      (options) => _json(401, {
        'statusCode': 401,
        'code': 'TOKEN_REUSED',
        'error': 'Unauthorized',
        'message': 'Refresh token reused',
        'correlationId': null,
        'timestamp': '2026-01-01T00:00:00.000Z',
        'path': '/api/v1/auth/refresh',
      }),
    ]);
    final dio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    dio.httpClientAdapter = adapter;
    final refreshDio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    refreshDio.httpClientAdapter = refreshAdapter;
    final store = MemoryTokenStore(
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    );
    final client = HttpCampaignApiClient(
      baseUrl: 'http://example.test/api/v1',
      tokenStore: store,
      onSessionExpired: () => expired = true,
      dio: dio,
      refreshDio: refreshDio,
    );

    await expectLater(client.getMe(), throwsA(isA<ApiException>()));
    expect(expired, isTrue);
    expect(store.accessToken, isNull);
    expect(store.refreshToken, isNull);
  });
}
