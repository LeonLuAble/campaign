// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';

Future<({String name, List<int> bytes})?> pickCsvFile() async {
  final input = html.FileUploadInputElement()..accept = '.csv,text/csv';
  input.click();
  await input.onChange.first;
  final file = input.files?.first;
  if (file == null) {
    return null;
  }
  final reader = html.FileReader();
  final loaded = Completer<void>();
  reader.onLoad.listen((_) => loaded.complete());
  reader.readAsArrayBuffer(file);
  await loaded.future;
  final result = reader.result;
  if (result is ByteBuffer) {
    return (name: file.name, bytes: result.asUint8List());
  }
  return null;
}
