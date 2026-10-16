import 'package:flutter/material.dart';

import '../data/dates.dart';
import '../data/rules.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'shell.dart';

class ShiftsScreen extends StatefulWidget {
  const ShiftsScreen({super.key, this.startOnOpen = false});
  final bool startOnOpen;

  @override
  State<ShiftsScreen> createState() => _ShiftsScreenState();
}

class _ShiftsScreenState extends State<ShiftsScreen> {
  late bool _open = widget.startOnOpen;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final ws = weekStart(today());
    return ScreenFrame(
      title: l.tr('nav.shifts'),
      children: [
        SegmentedButton<bool>(
          showSelectedIcon: false,
          style: SegmentedButton.styleFrom(selectedBackgroundColor: C.forest, selectedForegroundColor: Colors.white, backgroundColor: Colors.white),
          segments: [
            ButtonSegment(value: false, label: Text(l.tr('shifts.mine'))),
            ButtonSegment(value: true, label: Text('${l.tr('shifts.open')} (${s.openForMe().length})')),
          ],
          selected: {_open},
          onSelectionChanged: (v) => setState(() => _open = v.first),
        ),
        const SizedBox(height: 18),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: _open
              ? _OpenList(key: const ValueKey('open'))
              : Column(key: const ValueKey('mine'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  for (final (label, start) in [(l.tr('shifts.thisWeek'), ws), (l.tr('shifts.nextWeek'), addDays(ws, 7))]) ...[
                    SectionTitle('$label · ${l.range(start, addDays(start, 6))}', trailing: Text(l.hours(weekHours(s.data!, s.employeeId!, start)), style: const TextStyle(color: C.muted, fontWeight: FontWeight.w600))),
                    ..._mine(s, start),
                    const SizedBox(height: 14),
                  ],
                ]),
        ),
      ],
    );
  }

  List<Widget> _mine(AppState s, DateTime start) {
    final list = s.myShifts(from: start, to: addDays(start, 7));
    if (list.isEmpty) {
      return [
        Panel(child: Text(s.l.tr('shifts.noMine'), style: const TextStyle(color: C.muted))),
      ];
    }
    return [
      for (final a in list)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Opacity(opacity: s.span(a).$2.isBefore(DateTime.now()) ? 0.55 : 1, child: ShiftCard(a)),
        ),
    ];
  }
}

class _OpenList extends StatelessWidget {
  const _OpenList({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final slots = s.allOpen();
    if (slots.isEmpty) return EmptyNote(icon: Icons.event_available_outlined, title: l.tr('shifts.noOpen'), body: l.tr('shifts.noOpenBody'));
    // Group by day first, so each day gets one heading.
    final days = <DateTime, List<OpenSlot>>{};
    for (final slot in slots) {
      days.putIfAbsent(slot.date, () => []).add(slot);
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final entry in days.entries) ...[
        SectionTitle(l.dayLong(entry.key)),
        for (final slot in entry.value) Padding(padding: const EdgeInsets.only(bottom: 10), child: OpenSlotCard(slot)),
        const SizedBox(height: 8),
      ],
    ]);
  }
}

/// An open place on a shift, with who's on it and a button to take it.
class OpenSlotCard extends StatelessWidget {
  const OpenSlotCard(this.slot, {super.key});
  final OpenSlot slot;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = slot.template;
    final (bg, fg) = toneColors(tpl.tone);
    final mine = slot.people.any((p) => p.id == s.employeeId);
    final problems = checkTake(d, s.me, slot);
    final extra = d.announcements.where((a) => sameDay(a.date, slot.date) && a.dept == slot.dept && a.start != null && toMin(a.start!) >= tpl.startMin && toMin(a.start!) < tpl.endMin).toList();
    return Panel(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 6, height: 40, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(3))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${tpl.name} · ${tpl.start}–${tpl.end}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              const SizedBox(height: 4),
              Row(children: [
                DeptTag(d.dept(slot.dept)),
                const SizedBox(width: 10),
                Text('${l.day(slot.date)} · ${l.hours(tpl.hours)}', style: const TextStyle(fontSize: 13, color: C.muted)),
              ]),
            ]),
          ),
          Text(l.tr('shifts.places', {'filled': slot.filled, 'needed': slot.needed}), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: slot.full ? C.muted : fg)),
        ]),
        if (extra.isNotEmpty) ...[
          const SizedBox(height: 8),
          Pill(l.tr('shifts.extra', {'count': extra.first.extraStaff, 'title': extra.first.title}), bg: const Color(0xFFFBF1DD), fg: const Color(0xFF7A4F12), icon: Icons.campaign_outlined),
        ],
        const SizedBox(height: 12),
        Row(children: [
          for (final p in slot.people.take(5)) Padding(padding: const EdgeInsets.only(right: 4), child: Avatar(p, size: 24)),
          if (slot.people.isNotEmpty) const SizedBox(width: 4),
          Expanded(child: Text(slot.people.isEmpty ? '' : slot.people.map((p) => p.first).join(', '), style: const TextStyle(fontSize: 13, color: C.muted), overflow: TextOverflow.ellipsis)),
          const SizedBox(width: 8),
          if (mine)
            Pill(l.tr('shifts.yours'), icon: Icons.check)
          else if (slot.full)
            Pill(l.tr('shifts.full'), bg: C.paper, fg: C.muted)
          else
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(0, 40), padding: const EdgeInsets.symmetric(horizontal: 16), backgroundColor: problems.isEmpty ? C.forest : C.sageDark),
              onPressed: () => _take(context, s),
              child: Text(l.tr('shifts.take'), style: const TextStyle(fontSize: 14)),
            ),
        ]),
      ]),
    );
  }

  void _take(BuildContext context, AppState s) {
    final l = s.l;
    final problems = s.takeShift(slot);
    if (problems.isEmpty) {
      final requested = s.data!.selfSelectNeedsApproval;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(requested ? l.tr('shifts.requestSent') : l.tr('shifts.taken', {'shift': slot.template.name, 'date': l.day(slot.date)})),
        action: SnackBarAction(label: l.tr('nav.shifts'), textColor: C.forest100, onPressed: () => ShellTabs.of(context).go(1)),
      ));
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 0, 22, 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(l.tr('shifts.cantTitle'), style: serif(28)),
            const SizedBox(height: 14),
            for (final p in problems)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: p == Problem.overlap ? const Color(0xFFFDEDEB) : C.warn50, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  Icon(_icon(p), size: 18, color: p == Problem.overlap ? C.danger : C.warn),
                  const SizedBox(width: 10),
                  Expanded(child: Text(l.tr('problem.${p.name}', {'max': s.me.maxHours}), style: const TextStyle(height: 1.35))),
                ]),
              ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => Navigator.pop(context), child: Text(l.tr('common.close'))),
          ]),
        ),
      ),
    );
  }

  IconData _icon(Problem p) => switch (p) {
        Problem.rest => Icons.bedtime_outlined,
        Problem.dayMax || Problem.weekMax => Icons.timer_outlined,
        Problem.onLeave => Icons.flight_outlined,
        Problem.unavailable => Icons.event_busy_outlined,
        Problem.overlap => Icons.block,
        _ => Icons.info_outline,
      };
}
