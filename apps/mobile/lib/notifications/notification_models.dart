class InAppNotificationData {
  const InAppNotificationData({
    required this.id,
    required this.title,
    required this.body,
    required this.read,
  });

  final String id;
  final String title;
  final String body;
  final bool read;

  factory InAppNotificationData.fromJson(Map<String, dynamic> json) {
    return InAppNotificationData(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      read: json['readAt'] != null,
    );
  }
}
