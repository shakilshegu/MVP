import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../state/app_state.dart';
import '../theme.dart';
import 'availability.dart';
import 'checklist.dart';
import 'home.dart';
import 'me.dart';
import 'shifts.dart';

/// The five tabs. Other screens switch tabs through [ShellTabs.of].
class Shell extends StatefulWidget {
  const Shell({super.key});

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> with SingleTickerProviderStateMixin {
  late final AnimationController _fade = AnimationController(vsync: this, duration: const Duration(milliseconds: 220), value: 1);

  @override
  void dispose() {
    _fade.dispose();
    super.dispose();
  }

  int _tab = 0;
  bool _openShifts = false;

  /// Bumped on every "go to open shifts", so the Shifts tab switches even if it was already shown.
  int _request = 0;

  void go(int tab, {bool openShifts = false}) => setState(() {
        if (tab != _tab) _fade.forward(from: 0);
        _tab = tab;
        _openShifts = openShifts;
        if (openShifts) _request++;
      });

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    final pages = [
      const HomeScreen(),
      ShiftsScreen(startOnOpen: _openShifts, request: _request),
      const ChecklistScreen(),
      const AvailabilityScreen(),
      const MeScreen(),
    ];
    final items = [
      (Icons.wb_twilight_rounded, l.tr('nav.home')),
      (Icons.calendar_today_rounded, l.tr('nav.shifts')),
      (Icons.task_alt_rounded, l.tr('nav.checklist')),
      (Icons.event_available_rounded, l.tr('nav.availability')),
      (Icons.person_rounded, l.tr('nav.me')),
    ];
    return ShellTabs(
      go: go,
      child: Scaffold(
        extendBody: true,
        // Every tab stays alive (scroll position and state kept); only the current one is shown, fading in.
        body: SafeArea(
          bottom: false,
          child: FadeTransition(opacity: CurvedAnimation(parent: _fade, curve: Curves.easeOut), child: IndexedStack(index: _tab, children: pages)),
        ),
        bottomNavigationBar: _BottomBar(items: items, index: _tab, onTap: (i) => go(i)),
      ),
    );
  }
}

/// Floating, quiet bottom bar: icons, a small label, and a dot under the current tab.
class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.items, required this.index, required this.onTap});
  final List<(IconData, String)> items;
  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(14, 0, 14, 12),
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Container(
            height: 70,
            decoration: BoxDecoration(
              color: C.surface,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: C.forest.withValues(alpha: 0.10), blurRadius: 30, offset: const Offset(0, 10))],
            ),
            child: Row(children: [
              for (var i = 0; i < items.length; i++)
                Expanded(
                  child: Semantics(
                    selected: i == index,
                    button: true,
                    label: items[i].$2,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () {
                        HapticFeedback.selectionClick();
                        onTap(i);
                      },
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        AnimatedScale(
                          scale: i == index ? 1.08 : 1,
                          duration: const Duration(milliseconds: 180),
                          child: Icon(items[i].$1, size: 23, color: i == index ? C.forest : C.faint),
                        ),
                        const SizedBox(height: 4),
                        Text(items[i].$2, maxLines: 1, overflow: TextOverflow.fade, softWrap: false, style: sans(11, color: i == index ? C.forest : C.faint, weight: i == index ? FontWeight.w700 : FontWeight.w500)),
                        const SizedBox(height: 3),
                        AnimatedContainer(duration: const Duration(milliseconds: 200), width: i == index ? 4 : 0, height: 4, decoration: const BoxDecoration(color: C.brass, shape: BoxShape.circle)),
                      ]),
                    ),
                  ),
                ),
            ]),
          ),
        ),
      ),
    );
  }
}

class ShellTabs extends InheritedWidget {
  const ShellTabs({super.key, required this.go, required super.child});
  final void Function(int tab, {bool openShifts}) go;

  static ShellTabs of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<ShellTabs>()!;

  @override
  bool updateShouldNotify(ShellTabs old) => false;
}
