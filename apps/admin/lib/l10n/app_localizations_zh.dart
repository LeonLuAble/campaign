// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => '社区活动管理';

  @override
  String get homeMessage => '管理端应用外壳';

  @override
  String environmentLabel(String environment) {
    return '环境：$environment';
  }

  @override
  String get openCampaignDashboard => '活动仪表板';

  @override
  String get openCommunityDashboard => '社区仪表板';

  @override
  String get campaignDashboardTitle => '活动仪表板';

  @override
  String get communityDashboardTitle => '社区仪表板';

  @override
  String get emptyDashboard => '暂无仪表板数据。请先配置测量定义和影响系数，并等待已核准的行动。';

  @override
  String get progressSection => '进度';

  @override
  String get measurementsSection => '测量';

  @override
  String get outcomesSection => '成果';

  @override
  String get timeSeriesSection => '时间序列';

  @override
  String get visualizationSection => '可视化';

  @override
  String completionLabel(String percent) {
    return '完成度：$percent';
  }

  @override
  String achievedOfTarget(String achieved, String target, String unit) {
    return '$achieved / $target $unit';
  }

  @override
  String get noOutcomes => '暂无成果。影响系数按活动或租户配置，平台不会硬编码数值。';

  @override
  String factorSourceLabel(String source) {
    return '来源：$source';
  }

  @override
  String outcomeValueLabel(String value, String unit) {
    return '$value $unit';
  }

  @override
  String measurementQuantityLabel(String quantity, String unit) {
    return '$quantity $unit';
  }

  @override
  String periodLabel(String start, String end) {
    return '$start – $end';
  }

  @override
  String get treeInactive => '活动可视化尚未配置。';

  @override
  String get anonymousTotalsNote => '合计为匿名统计，不对个人进行比较或排名。';

  @override
  String get languageLabel => '语言';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChinese => '简体中文';

  @override
  String get openCampaignReport => '活动报告';

  @override
  String get campaignReportTitle => '活动报告';

  @override
  String get emptyReport => '暂无报告数据。';

  @override
  String get exportCsv => '导出 CSV';

  @override
  String get exportRequiresPermission =>
      'CSV 导出需要 reports.export 权限，并会写入审计日志。';

  @override
  String get anonymousReportNote => '合计报告不含联系方式，也不对个人排名。';
}
