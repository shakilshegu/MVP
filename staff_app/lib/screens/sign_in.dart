import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../theme.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _pw = TextEditingController();
  String? _error;

  static const _demo = [('Lina Haddad', 'lina@harborhouse.co', 'Service'), ('Sofia Alvarez', 'sofia@harborhouse.co', 'Service · Lead'), ('Dario Fontana', 'dario@harborhouse.co', 'Kitchen')];

  Future<void> _submit(AppState s) async {
    final err = await s.signIn(_email.text, _pw.text);
    if (mounted) setState(() => _error = err == null ? null : s.l.tr(err));
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AutofillGroup(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Container(width: 40, height: 40, alignment: Alignment.center, decoration: BoxDecoration(color: C.forest, borderRadius: BorderRadius.circular(10)), child: Text('R', style: serif(26, color: Colors.white))),
                    const SizedBox(width: 10),
                    const Text('Rota', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: C.forest)),
                    const Spacer(),
                    _LangToggle(s),
                  ]),
                  const SizedBox(height: 40),
                  Text(l.tr('signin.title'), style: serif(40)),
                  const SizedBox(height: 10),
                  Text(l.tr('signin.sub'), style: const TextStyle(fontSize: 16, color: C.muted, height: 1.4)),
                  const SizedBox(height: 28),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: InputDecoration(labelText: l.tr('signin.email')),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _pw,
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(labelText: l.tr('signin.password')),
                    onSubmitted: (_) => _submit(s),
                  ),
                  if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: C.danger))),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: s.busy ? null : () => _submit(s),
                    child: s.busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : Text(l.tr('signin.button')),
                  ),
                  if (s.backend.isDemo) ...[
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: C.sageDark)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Text(l.tr('signin.demo'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: C.muted)),
                        const SizedBox(height: 8),
                        for (final (name, email, role) in _demo)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Material(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: () {
                                  _email.text = email;
                                  _pw.text = 'demo';
                                  _submit(s);
                                },
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                                  child: Row(children: [
                                    Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                    const SizedBox(width: 6),
                                    Text('· $role', style: const TextStyle(color: C.muted)),
                                    const Spacer(),
                                    const Icon(Icons.arrow_forward, size: 18, color: C.muted),
                                  ]),
                                ),
                              ),
                            ),
                          ),
                        const SizedBox(height: 8),
                        Text(l.tr('signin.demoHint'), style: const TextStyle(fontSize: 12, color: C.muted)),
                      ]),
                    ),
                  ],
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LangToggle extends StatelessWidget {
  const _LangToggle(this.s);
  final AppState s;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<String>(
      showSelectedIcon: false,
      style: SegmentedButton.styleFrom(visualDensity: VisualDensity.compact, selectedBackgroundColor: C.forest, selectedForegroundColor: Colors.white, backgroundColor: Colors.white),
      segments: const [ButtonSegment(value: 'en', label: Text('EN')), ButtonSegment(value: 'de', label: Text('DE'))],
      selected: {s.lang},
      onSelectionChanged: (v) => s.setLang(v.first),
    );
  }
}
