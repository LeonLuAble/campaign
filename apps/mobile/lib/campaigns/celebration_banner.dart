import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

/// Calm celebratory banner. Skips motion when the OS requests reduced motion.
class CelebrationBanner extends StatefulWidget {
  const CelebrationBanner({
    required this.title,
    required this.body,
    this.onDismiss,
    this.dismissLabel,
    super.key,
  });

  final String title;
  final String body;
  final VoidCallback? onDismiss;
  final String? dismissLabel;

  @override
  State<CelebrationBanner> createState() => _CelebrationBannerState();
}

class _CelebrationBannerState extends State<CelebrationBanner>
    with SingleTickerProviderStateMixin {
  AnimationController? _controller;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (!reduceMotion && _controller == null) {
      _controller = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 400),
      )..forward();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final scheme = Theme.of(context).colorScheme;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    final card = Semantics(
      liveRegion: true,
      label: '${widget.title}. ${widget.body}',
      child: Card(
        color: scheme.tertiaryContainer,
        child: Padding(
          padding: EdgeInsets.all(tokens.spaceLg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.eco_outlined, color: scheme.onTertiaryContainer),
                  SizedBox(width: tokens.spaceSm),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: scheme.onTertiaryContainer,
                          ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: tokens.spaceSm),
              Text(
                widget.body,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onTertiaryContainer,
                    ),
              ),
              if (widget.onDismiss != null) ...[
                SizedBox(height: tokens.spaceMd),
                SizedBox(
                  height: 48,
                  child: TextButton(
                    onPressed: widget.onDismiss,
                    child: Text(widget.dismissLabel ?? 'OK'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );

    if (reduceMotion || _controller == null) {
      return card;
    }
    return FadeTransition(
      opacity: _controller!,
      child: card,
    );
  }
}
