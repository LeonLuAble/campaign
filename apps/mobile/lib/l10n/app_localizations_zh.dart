// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => '社区活动';

  @override
  String get homeMessage => '社区活动平台';

  @override
  String environmentLabel(String environment) {
    return '环境：$environment';
  }
}
