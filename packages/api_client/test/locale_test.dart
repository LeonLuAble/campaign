import 'package:api_client/api_client.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps Flutter and BCP-47 Chinese tags to zh-Hans', () {
    expect(toApiLocale('zh'), 'zh-Hans');
    expect(toApiLocale('zh-CN'), 'zh-Hans');
    expect(toApiLocale('zh_Hans'), 'zh-Hans');
    expect(toApiLocale('zh-Hans'), 'zh-Hans');
    expect(toApiLocale('en'), 'en');
    expect(toApiLocale(null), 'en');
  });
}
