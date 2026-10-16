import 'package:flutter/material.dart';

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

class _ShellState extends State<Shell> {
  int _tab = 0;
  bool _openShifts = false;

  void go(int tab, {bool openShifts = false}) => setState(() {
        _tab = tab;
        _openShifts = openShifts;
      });

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    final pages = [
      const HomeScreen(),
      ShiftsScreen(key: ValueKey(_openShifts), startOnOpen: _openShifts),
      const ChecklistScreen(),
      const AvailabilityScreen(),
      const MeScreen(),
    ];
    return ShellTabs(
      go: go,
      child: Scaffold(
        body: SafeArea(bottom: false, child: IndexedStack(index: _tab, children: pages)),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => go(i),
          destinations: [
            NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: l.tr('nav.home')),
            NavigationDestination(icon: const Icon(Icons.calendar_month_outlined), selectedIcon: const Icon(Icons.calendar_month), label: l.tr('nav.shifts')),
            NavigationDestination(icon: const Icon(Icons.checklist_outlined), selectedIcon: const Icon(Icons.checklist), label: l.tr('nav.checklist')),
            NavigationDestination(icon: const Icon(Icons.event_available_outlined), selectedIcon: const Icon(Icons.event_available), label: l.tr('nav.availability')),
            NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: l.tr('nav.me')),
          ],
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

/// Standard screen frame: big serif title, optional subtitle, scrolling content.
class ScreenFrame extends StatelessWidget {
  const ScreenFrame({super.key, required this.title, this.subtitle, required this.children, this.trailing});
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: serif(36)),
                  if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(subtitle!, style: const TextStyle(color: C.muted, height: 1.4))),
                ]),
              ),
              ?trailing,
            ]),
            const SizedBox(height: 18),
            ...children,
          ],
        ),
      ),
    );
  }
}
