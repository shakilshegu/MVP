import 'package:flutter/material.dart';

import '../data/dates.dart';
import '../data/models.dart';
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
    final news = d.announcements.where((a) => !a.date.isBefore(today()) && a.date.isBefore(addDays(today(), 14))).toList();
    final tabs = ShellTabs.of(context);

    return ListView(
      padding: const EdgeInsets.only(bottom: 120),
      children: [
        _Hero(next: next),
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                for (var i = 0; i < news.length; i++) ...[
                  Entrance(delay: 80 + i * 60, child: _NewsRow(news[i])),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 14),
                Entrance(
                  delay: 160,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    SectionLabel(l.tr('home.week'), action: l.tr('home.hoursOf', {'used': _n(used), 'max': me.maxHours}), onAction: () => tabs.go(1)),
                    Surface(
                      padding: const EdgeInsets.fromLTRB(8, 10, 8, 14),
                      child: Column(children: [
                        WeekStrip(start: weekStart(today()), onSelect: (_) => tabs.go(1)),
                        const SizedBox(height: 12),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(99),
                            child: TweenAnimationBuilder<double>(
                              tween: Tween(begin: 0, end: (used / me.maxHours).clamp(0, 1)),
                              duration: const Duration(milliseconds: 800),
                              curve: Curves.easeOutCubic,
                              builder: (_, v, _) => LinearProgressIndicator(value: v, minHeight: 6, backgroundColor: C.forest50, color: used > me.maxHours ? C.danger : C.forest),
                            ),
                          ),
                        ),
                      ]),
                    ),
                  ]),
                ),
                if (open.isNotEmpty) ...[
                  const SizedBox(height: 26),
                  Entrance(
                    delay: 220,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      SectionLabel(l.tr('home.openTitle'), action: l.tr('home.openSeeAll'), onAction: () => tabs.go(1, openShifts: true)),
                      for (final slot in open) Padding(padding: const EdgeInsets.only(bottom: 10), child: OpenSlotRow(slot)),
                    ]),
                  ),
                ],
                const SizedBox(height: 16),
                Entrance(
                  delay: 280,
                  child: Surface(
                    onTap: () => tabs.go(3),
                    color: sent ? C.forest50 : C.surface,
                    padding: const EdgeInsets.fromLTRB(16, 16, 12, 16),
                    child: Row(children: [
                      Icon(sent ? Icons.check_circle_rounded : Icons.event_available_rounded, color: C.forest),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          sent ? l.tr('home.availDone') : DateTime.now().isAfter(deadline) ? l.tr('home.availClosed') : l.tr('home.availDue', {'when': '${l.day(deadline)}, ${l.time(deadline)}'}),
                          style: sans(14.5, weight: FontWeight.w500),
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: C.faint),
                    ]),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ],
    );
  }
}

String _n(double v) => v % 1 == 0 ? '${v.toInt()}' : v.toStringAsFixed(1);

/// Deep green top: greeting, then the next shift with its time as the biggest thing on screen.
class _Hero extends StatelessWidget {
  const _Hero({required this.next});
  final Assignment? next;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final me = s.me;
    final tabs = ShellTabs.of(context);
    return Container(
      decoration: const BoxDecoration(color: C.forestDeep, borderRadius: BorderRadius.vertical(bottom: Radius.circular(32))),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 18, 22, 26),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(l.tr('home.hello', {'name': me.first}), style: serif(32, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text('${l.dayLong(today())} · ${d.branchName}', style: sans(13.5, color: C.mint.withValues(alpha: 0.8))),
                  ]),
                ),
                GestureDetector(onTap: () => tabs.go(4), child: Avatar(me, size: 44, ring: C.forest600)),
              ]),
              const SizedBox(height: 26),
              if (next == null) _NoShift(onFind: () => tabs.go(1, openShifts: true)) else Entrance(child: _NextShift(next!)),
            ]),
          ),
        ),
      ),
    );
  }
}

class _NextShift extends StatelessWidget {
  const _NextShift(this.a);
  final Assignment a;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = d.template(a.templateId);
    final (start, end) = s.span(a);
    final running = s.isRunning(a);
    final leader = s.leaderOf(a);
    final mates = s.teammates(a).map((x) => d.employee(x.employeeId)).toList();
    final items = s.checklist(a);
    final done = items.where((i) => i.$5 != null).length;
    final (toneBg, _) = toneColors(tpl.tone);
    return GestureDetector(
      onTap: () => showShiftSheet(context, a),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: running ? const Color(0xFF7FD3A7) : toneBg, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(running ? l.tr('home.now') : l.tr('home.next'), style: sans(13.5, color: C.mint, weight: FontWeight.w600)),
          const SizedBox(width: 8),
          Countdown(start: start, end: end, style: sans(13.5, color: C.mint.withValues(alpha: 0.7))),
        ]),
        const SizedBox(height: 10),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text('${tpl.start} – ${tpl.end}', style: serif(60, color: Colors.white))),
        const SizedBox(height: 8),
        Text('${l.dayLong(a.date)} · ${tpl.name} · ${d.dept(a.dept).name}', style: sans(15, color: Colors.white.withValues(alpha: 0.85))),
        const SizedBox(height: 18),
        Row(children: [
          Icon(Icons.workspace_premium_rounded, size: 18, color: a.isLeader || leader != null ? C.brass : C.mint.withValues(alpha: 0.5)),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              a.isLeader ? l.tr('shift.youLead') : leader != null ? l.tr('shift.ledBy', {'name': leader.first}) : l.tr('shift.noLeader'),
              style: sans(14, color: Colors.white, weight: a.isLeader ? FontWeight.w600 : FontWeight.w400),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const Spacer(),
          AvatarStack(mates, size: 28, ring: C.forestDeep),
        ]),
        if (running && items.isNotEmpty) ...[
          const SizedBox(height: 18),
          Material(
            color: Colors.white.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => ShellTabs.of(context).go(2),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(children: [
                  const Icon(Icons.task_alt_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Expanded(child: Text(l.tr('home.openChecklist'), style: sans(15, color: Colors.white, weight: FontWeight.w600))),
                  Text('$done/${items.length}', style: sans(15, color: C.mint, weight: FontWeight.w600)),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right_rounded, color: C.mint),
                ]),
              ),
            ),
          ),
        ],
      ]),
    );
  }
}

class _NoShift extends StatelessWidget {
  const _NoShift({required this.onFind});
  final VoidCallback onFind;

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(l.tr('home.noShift'), style: serif(34, color: Colors.white)),
      const SizedBox(height: 8),
      Text(l.tr('home.noShiftBody'), style: sans(15, color: C.mint, height: 1.45)),
      const SizedBox(height: 18),
      FilledButton(
        style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: C.forest, minimumSize: const Size(0, 48), padding: const EdgeInsets.symmetric(horizontal: 20)),
        onPressed: onFind,
        child: Text(l.tr('home.findShifts')),
      ),
    ]);
  }
}

class _NewsRow extends StatefulWidget {
  const _NewsRow(this.an);
  final Announcement an;

  @override
  State<_NewsRow> createState() => _NewsRowState();
}

class _NewsRowState extends State<_NewsRow> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    final an = widget.an;
    return Surface(
      color: C.brass50,
      padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
      onTap: () => setState(() => _open = !_open),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.campaign_rounded, color: C.brass, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(an.title, style: sans(15, color: C.brassInk, weight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text('${l.day(an.date)}${an.start != null ? ' · ${an.start}' : ''}', style: sans(13, color: C.brassInk.withValues(alpha: 0.75))),
            ]),
          ),
          AnimatedRotation(turns: _open ? 0.5 : 0, duration: const Duration(milliseconds: 200), child: Icon(Icons.expand_more_rounded, color: C.brassInk.withValues(alpha: 0.6))),
        ]),
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          child: _open ? Padding(padding: const EdgeInsets.only(left: 34, top: 10), child: Text(an.body, style: sans(14.5, color: C.brassInk, height: 1.45))) : const SizedBox(width: double.infinity),
        ),
      ]),
    );
  }
}
