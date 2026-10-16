import 'package:flutter/material.dart';

import '../data/dates.dart';
import '../data/rules.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'shell.dart';
import 'shifts.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final me = s.me;
    final next = s.nextShift;
    final used = s.hoursThisWeek();
    final open = s.openForMe(days: 7).where((x) => checkTake(d, me, x).isEmpty).take(2).toList();
    final nextWeek = addDays(weekStart(today()), 7);
    final deadline = availabilityDeadline(d, nextWeek);
    final sent = s.availabilitySent(nextWeek);
    final upcoming = d.announcements.where((a) => !a.date.isBefore(today()) && a.date.isBefore(addDays(today(), 14))).toList();
    final todayShift = next != null && s.isRunning(next) ? next : null;
    final tabs = ShellTabs.of(context);

    return ScreenFrame(
      title: l.tr('home.hello', {'name': me.first}),
      subtitle: '${l.dayLong(today())} · ${d.branchName}',
      trailing: Avatar(me, size: 44),
      children: [
        // Announcements first: they matter for the coming days.
        for (final an in upcoming)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Panel(
              color: const Color(0xFFFBF1DD),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.campaign_outlined, color: Color(0xFF7A4F12)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(an.title, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF5A3A0D))),
                    const SizedBox(height: 2),
                    Text('${l.day(an.date)}${an.start != null ? ' · ${an.start}' : ''}', style: const TextStyle(fontSize: 13, color: Color(0xFF7A4F12))),
                    const SizedBox(height: 6),
                    Text(an.body, style: const TextStyle(fontSize: 14, height: 1.4, color: Color(0xFF5A3A0D))),
                  ]),
                ),
              ]),
            ),
          ),

        SectionTitle(todayShift != null ? l.tr('home.now') : l.tr('home.next')),
        if (next != null)
          ShiftCard(next, big: true)
        else
          EmptyNote(
            icon: Icons.event_busy_outlined,
            title: l.tr('home.noShift'),
            body: l.tr('home.noShiftBody'),
            action: OutlinedButton(onPressed: () => tabs.go(1, openShifts: true), child: Text(l.tr('home.findShifts'))),
          ),
        if (todayShift != null) ...[
          const SizedBox(height: 10),
          _TasksStrip(onTap: () => tabs.go(2)),
        ],
        const SizedBox(height: 18),

        Panel(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(l.tr('home.week'), style: const TextStyle(fontWeight: FontWeight.w600)),
              const Spacer(),
              Text(l.tr('home.hoursOf', {'used': _n(used), 'max': me.maxHours}), style: const TextStyle(color: C.muted)),
            ]),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: (used / me.maxHours).clamp(0, 1)),
                duration: const Duration(milliseconds: 700),
                curve: Curves.easeOutCubic,
                builder: (_, v, _) => LinearProgressIndicator(value: v, minHeight: 8, backgroundColor: C.forest50, color: used > me.maxHours ? C.danger : C.forest),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 12),

        Panel(
          color: sent ? C.forest50 : Colors.white,
          onTap: () => tabs.go(3),
          child: Row(children: [
            Icon(sent ? Icons.check_circle : Icons.event_available_outlined, color: C.forest),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                sent ? l.tr('home.availDone') : DateTime.now().isAfter(deadline) ? l.tr('home.availClosed') : l.tr('home.availDue', {'when': '${l.day(deadline)}, ${l.time(deadline)}'}),
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            const Icon(Icons.chevron_right, color: C.muted),
          ]),
        ),
        const SizedBox(height: 22),

        if (open.isNotEmpty) ...[
          SectionTitle(l.tr('home.openTitle'), trailing: TextButton(onPressed: () => tabs.go(1, openShifts: true), child: Text(l.tr('home.openSeeAll')))),
          for (final slot in open) Padding(padding: const EdgeInsets.only(bottom: 10), child: OpenSlotCard(slot)),
        ],
      ],
    );
  }
}

String _n(double v) => v % 1 == 0 ? '${v.toInt()}' : v.toStringAsFixed(1);

class _TasksStrip extends StatelessWidget {
  const _TasksStrip({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final a = s.nextShift!;
    final items = s.checklist(a);
    final done = items.where((i) => i.$5 != null).length;
    return Panel(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(children: [
        const Icon(Icons.checklist, color: C.forest),
        const SizedBox(width: 12),
        Expanded(child: Text(s.l.tr('home.tasksToday', {'done': done, 'total': items.length}), style: const TextStyle(fontWeight: FontWeight.w500))),
        const Icon(Icons.chevron_right, color: C.muted),
      ]),
    );
  }
}
