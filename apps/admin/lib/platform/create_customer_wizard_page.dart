import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';
import '../widgets/admin_ui.dart';

class CreateCustomerWizardPage extends StatefulWidget {
  const CreateCustomerWizardPage({super.key});

  @override
  State<CreateCustomerWizardPage> createState() =>
      _CreateCustomerWizardPageState();
}

class _CreateCustomerWizardPageState extends State<CreateCustomerWizardPage> {
  final _name = TextEditingController();
  final _adminName = TextEditingController();
  final _adminEmail = TextEditingController();
  var _adminLocale = 'en';
  var _step = 0;
  var _busy = false;
  String? _fieldError;
  String? _apiError;
  Customer? _created;
  var _done = false;

  @override
  void dispose() {
    _name.dispose();
    _adminName.dispose();
    _adminEmail.dispose();
    super.dispose();
  }

  bool _validateStep1(AppLocalizations l10n) {
    if (_name.text.trim().isEmpty) {
      setState(() => _fieldError = l10n.nameRequired);
      return false;
    }
    setState(() => _fieldError = null);
    return true;
  }

  bool _validateStep2(AppLocalizations l10n) {
    if (_adminName.text.trim().isEmpty) {
      setState(() => _fieldError = l10n.adminNameRequired);
      return false;
    }
    if (!looksLikeEmail(_adminEmail.text)) {
      setState(() => _fieldError = l10n.adminEmailRequired);
      return false;
    }
    setState(() => _fieldError = null);
    return true;
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _apiError = null;
    });
    try {
      final created = await ApiScope.of(context).client.createCustomer(
            name: _name.text.trim(),
            initialAdmin: CreateCustomerInitialAdmin(
              email: _adminEmail.text.trim(),
              displayName: _adminName.text.trim(),
              locale: _adminLocale,
            ),
          );
      if (!mounted) {
        return;
      }
      await ApiScope.of(context).session.refreshCustomers();
      setState(() {
        _busy = false;
        _created = created;
        _done = true;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _apiError = localizeApiError(l10n, error);
      });
    }
  }

  Future<void> _resendFromSuccess() async {
    final created = _created;
    if (created == null) {
      return;
    }
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _apiError = null;
    });
    try {
      await ApiScope.of(context).client.invitePlatformAdmin(
            created.id,
            email: _adminEmail.text.trim(),
            displayName: _adminName.text.trim(),
            locale: _adminLocale,
          );
      if (!mounted) {
        return;
      }
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.activationResentSnackbar)),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busy = false;
        _apiError = localizeApiError(l10n, error);
      });
    }
  }

  void _onNext() {
    final l10n = AppLocalizations.of(context);
    if (_step == 0) {
      if (!_validateStep1(l10n)) {
        return;
      }
      setState(() => _step = 1);
      return;
    }
    if (_step == 1) {
      if (!_validateStep2(l10n)) {
        return;
      }
      setState(() => _step = 2);
      return;
    }
    if (_step == 2) {
      _create();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;

    if (!session.isPlatformAdmin) {
      return AdminPageBody(
        child: ErrorState(
          message: l10n.errorForbidden,
          retryLabel: l10n.retry,
        ),
      );
    }

    if (_done) {
      return AdminPageBody(
        child: _SuccessBody(
          email: _adminEmail.text.trim(),
          customerName: _name.text.trim(),
          customerId: _created?.id,
          busy: _busy,
          apiError: _apiError,
          onResend: _resendFromSuccess,
          onDone: () {
            final id = _created?.id;
            if (id != null) {
              context.go('/platform/customers/$id');
            } else {
              context.go('/platform/customers');
            }
          },
          onBackToList: () => context.go('/platform/customers'),
        ),
      );
    }

    final steps = [
      l10n.wizardStepOrganisation,
      l10n.wizardStepAdmin,
      l10n.wizardStepReview,
    ];

    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(
            title: l10n.createCustomer,
            actions: [
              TextButton(
                onPressed: _busy
                    ? null
                    : () => context.go('/platform/customers'),
                child: Text(l10n.cancel),
              ),
            ],
          ),
          Expanded(
            child: WizardStepper(
              steps: steps,
              currentStep: _step,
              nextLabel: _step == 2 ? l10n.createCustomer : l10n.wizardNext,
              backLabel: l10n.wizardBack,
              onBack: _step == 0 || _busy
                  ? null
                  : () => setState(() {
                        _step -= 1;
                        _fieldError = null;
                        _apiError = null;
                      }),
              onNext: _onNext,
              nextEnabled: !_busy,
              busy: _busy,
              body: SingleChildScrollView(
                child: _stepBody(l10n),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepBody(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_step == 0) ...[
          TextField(
            controller: _name,
            decoration: InputDecoration(
              labelText: l10n.customerNameLabel,
              border: const OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _onNext(),
          ),
        ] else if (_step == 1) ...[
          TextField(
            controller: _adminName,
            decoration: InputDecoration(
              labelText: l10n.adminNameLabel,
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _adminEmail,
            decoration: InputDecoration(
              labelText: l10n.adminEmailLabel,
              border: const OutlineInputBorder(),
            ),
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          InputDecorator(
            decoration: InputDecoration(
              labelText: l10n.adminLocaleLabel,
              border: const OutlineInputBorder(),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _adminLocale,
                isExpanded: true,
                items: [
                  DropdownMenuItem(
                    value: 'en',
                    child: Text(l10n.languageEnglish),
                  ),
                  DropdownMenuItem(
                    value: 'zh-Hans',
                    child: Text(l10n.languageChinese),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _adminLocale = value);
                  }
                },
              ),
            ),
          ),
        ] else ...[
          _ReviewRow(label: l10n.customerNameLabel, value: _name.text.trim()),
          _ReviewRow(label: l10n.adminNameLabel, value: _adminName.text.trim()),
          _ReviewRow(
            label: l10n.adminEmailLabel,
            value: _adminEmail.text.trim(),
          ),
          _ReviewRow(
            label: l10n.adminLocaleLabel,
            value: _adminLocale == 'zh-Hans'
                ? l10n.languageChinese
                : l10n.languageEnglish,
          ),
        ],
        if (_fieldError != null) ...[
          const SizedBox(height: 12),
          Text(
            _fieldError!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        if (_apiError != null) ...[
          const SizedBox(height: 12),
          Text(
            _apiError!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.createCustomerFailureHint,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ],
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(value, style: theme.textTheme.titleMedium),
        ],
      ),
    );
  }
}

class _SuccessBody extends StatelessWidget {
  const _SuccessBody({
    required this.email,
    required this.customerName,
    required this.customerId,
    required this.busy,
    required this.apiError,
    required this.onResend,
    required this.onDone,
    required this.onBackToList,
  });

  final String email;
  final String customerName;
  final String? customerId;
  final bool busy;
  final String? apiError;
  final VoidCallback onResend;
  final VoidCallback onDone;
  final VoidCallback onBackToList;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AdminPageHeader(title: l10n.createCustomerSuccessTitle),
        Icon(Icons.mark_email_read_outlined, size: 48, color: theme.colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          l10n.createCustomerSuccessMessage(email),
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          l10n.createCustomerSuccessDetail(customerName),
          style: theme.textTheme.bodyMedium,
        ),
        if (apiError != null) ...[
          const SizedBox(height: 12),
          Text(
            apiError!,
            style: TextStyle(color: theme.colorScheme.error),
          ),
          Text(l10n.createCustomerFailureHint),
        ],
        const SizedBox(height: 24),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: busy ? null : onDone,
              child: Text(l10n.viewCustomer),
            ),
            OutlinedButton(
              onPressed: busy ? null : onResend,
              child: Text(l10n.resendActivation),
            ),
            TextButton(
              onPressed: busy ? null : onBackToList,
              child: Text(l10n.backToCustomers),
            ),
          ],
        ),
      ],
    );
  }
}
