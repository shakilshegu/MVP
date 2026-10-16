import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _pw = TextEditingController();
  String? _error;

  static const _demo = [('Lina Haddad', 'lina@harborhouse.co', 'Service'), ('Sofia Alvarez', 'sofia@harborhouse.co', 'Service'), ('Dario Fontana', 'dario@harborhouse.co', 'Kitchen')];

  Future<void> _submit(AppState s) async {
    FocusScope.of(context).unfocus();
    final err = await s.signIn(_email.text, _pw.text);
    if (mounted) setState(() => _error = err == null ? null : s.l.tr(err));
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    return Scaffold(
      backgroundColor: C.forestDeep,
      body: SafeArea(
        bottom: false,
        child: Column(children: [
          // Brand and promise on deep green.
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 30),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(width: 38, height: 38, alignment: Alignment.center, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(11)), child: Text('R', style: serif(26, color: C.forest))),
                const SizedBox(width: 10),
                Text('Rota', style: sans(19, color: Colors.white, weight: FontWeight.w600)),
                const Spacer(),
                _Lang(s),
              ]),
              const SizedBox(height: 34),
              Entrance(child: Text(l.tr('signin.title'), style: serif(46, color: Colors.white, height: 1.02))),
              const SizedBox(height: 12),
              Entrance(delay: 80, child: Text(l.tr('signin.sub'), style: sans(15.5, color: C.mint, height: 1.45))),
            ]),
          ),
          // Form on a white sheet.
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(color: C.bg, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: AutofillGroup(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        TextField(controller: _email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], textInputAction: TextInputAction.next, decoration: InputDecoration(labelText: l.tr('signin.email'))),
                        const SizedBox(height: 10),
                        TextField(controller: _pw, obscureText: true, autofillHints: const [AutofillHints.password], decoration: InputDecoration(labelText: l.tr('signin.password')), onSubmitted: (_) => _submit(s)),
                        AnimatedSize(
                          duration: const Duration(milliseconds: 200),
                          child: _error == null ? const SizedBox(width: double.infinity) : Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: sans(14, color: C.danger, height: 1.4))),
                        ),
                        const SizedBox(height: 18),
                        FilledButton(
                          onPressed: s.busy ? null : () => _submit(s),
                          child: s.busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: C.forest)) : Text(l.tr('signin.button')),
                        ),
                        if (s.backend.isDemo) ...[
                          const SizedBox(height: 30),
                          Text(l.tr('signin.demo'), style: sans(13.5, color: C.muted, weight: FontWeight.w600)),
                          const SizedBox(height: 10),
                          for (final (name, email, dept) in _demo)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Surface(
                                radius: 16,
                                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                                onTap: () {
                                  _email.text = email;
                                  _pw.text = 'demo';
                                  _submit(s);
                                },
                                child: Row(children: [
                                  CircleAvatar(radius: 16, backgroundColor: C.forest50, child: Text(name.split(' ').map((p) => p[0]).join(), style: sans(12, color: C.forest, weight: FontWeight.w700))),
                                  const SizedBox(width: 12),
                                  Expanded(child: Text(name, style: sans(15, weight: FontWeight.w600))),
                                  Text(dept, style: sans(13.5, color: C.muted)),
                                  const SizedBox(width: 6),
                                  const Icon(Icons.arrow_forward_rounded, size: 18, color: C.faint),
                                ]),
                              ),
                            ),
                          const SizedBox(height: 4),
                          Text(l.tr('signin.demoHint'), style: sans(12.5, color: C.faint)),
                        ],
                      ]),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

class _Lang extends StatelessWidget {
  const _Lang(this.s);
  final AppState s;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        for (final code in ['en', 'de'])
          GestureDetector(
            onTap: () => s.setLang(code),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: s.lang == code ? Colors.white : Colors.transparent, borderRadius: BorderRadius.circular(9)),
              child: Text(code.toUpperCase(), style: sans(13, color: s.lang == code ? C.forest : C.mint, weight: FontWeight.w700)),
            ),
          ),
      ]),
    );
  }
}
