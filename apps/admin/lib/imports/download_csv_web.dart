// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:convert';
import 'dart:html' as html;

({String filename, String content})? lastDownloadedCsv;

void downloadTextFile({
  required String filename,
  required String content,
}) {
  lastDownloadedCsv = (filename: filename, content: content);
  final bytes = utf8.encode(content);
  final blob = html.Blob([bytes], 'text/csv;charset=utf-8');
  final url = html.Url.createObjectUrlFromBlob(blob);
  html.AnchorElement(href: url)
    ..setAttribute('download', filename)
    ..click();
  html.Url.revokeObjectUrl(url);
}

void clearLastDownloadedCsv() {
  lastDownloadedCsv = null;
}
