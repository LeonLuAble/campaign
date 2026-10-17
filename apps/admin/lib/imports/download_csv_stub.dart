/// Last download captured in tests / non-web environments.
({String filename, String content})? lastDownloadedCsv;

void downloadTextFile({
  required String filename,
  required String content,
}) {
  lastDownloadedCsv = (filename: filename, content: content);
}

void clearLastDownloadedCsv() {
  lastDownloadedCsv = null;
}
