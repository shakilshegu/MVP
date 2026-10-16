import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/dates.dart';
import '../data/rules.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';

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
    final openCount = s.openForMe().length;
    return PageFrame(
      title: l.tr('nav.shifts'),
      children: [
        _Toggle(
          left: l.tr('shifts.mine'),
          right: l.tr('shifts.open'),
          badge: openCount,
          value: _open,
          onChanged: (v) => setState(() => _open = v),
        ),
        const SizedBox(height: 22),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: _open
              ? const _OpenList(key: ValueKey('open'))
              : Column(key: const ValueKey('mine'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  for (final (label, start) in [(l.tr('shifts.thisWeek'), ws), (l.tr('shifts.nextWeek'), addDays(ws, 7))]) ...[
                    SectionLabel('$label · ${l.range(start, addDays(start, 6))}', action: l.hours(weekHours(s.data!, s.employeeId!, start))),
                    ..._mine(s, start),
                    const SizedBox(height: 18),
                  ],
                ]),
        ),
      ],
    );
  }

  List<Widget> _mine(AppState s, DateTime start) {
    final list = s.myShifts(from: start, to: addDays(start, 7));
    if (list.isEmpty) return [Surface(child: Text(s.l.tr('shifts.noMine'), style: sans(14.5, color: C.muted)))];
    return [for (var i = 0; i < list.length; i++) Padding(padding: const EdgeInsets.only(bottom: 10), child: Entrance(delay: i * 40, child: ShiftRow(list[i])))];
  }
}

/// Two-option switch with a sliding thumb.
class _Toggle extends StatelessWidget {
  const _Toggle({required this.left, required this.right, required this.value, required this.onChanged, this.badge = 0});
  final String left;
  final String right;
  final bool value;
  final ValueChanged<bool> onChanged;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: C.line.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(16)),
      child: Stack(children: [
        AnimatedAlign(
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
          child: FractionallySizedBox(
            widthFactor: 0.5,
            child: Container(decoration: BoxDecoration(color: C.surface, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: C.forest.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 2))])),
          ),
        ),
        Row(children: [
          for (final (i, label) in [(false, left), (true, right)])
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.selectionClick();
                  onChanged(i);
                },
                child: Center(
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(label, style: sans(14.5, color: value == i ? C.ink : C.muted, weight: FontWeight.w600)),
                    if (i && badge > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(color: C.brass, borderRadius: BorderRadius.circular(99)),
                        child: Text('$badge', style: sans(11.5, color: Colors.white, weight: FontWeight.w700)),
                      ),
                    ],
                  ]),
                ),
              ),
            ),
        ]),
      ]),
    );
  }
}

class _OpenList extends StatelessWidget {
  const _OpenList({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final slots = s.allOpen();
    if (slots.isEmpty) return EmptyNote(icon: Icons.event_available_rounded, title: l.tr('shifts.noOpen'), body: l.tr('shifts.noOpenBody'));
    final days = <DateTime, List<OpenSlot>>{};
    for (final slot in slots) {
      days.putIfAbsent(slot.date, () => []).add(slot);
    }
    var i = 0;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final entry in days.entries) ...[
        SectionLabel(l.dayLong(entry.key)),
        for (final slot in entry.value) Padding(padding: const EdgeInsets.only(bottom: 10), child: Entrance(delay: (i++).clamp(0, 8) * 40, child: OpenSlotRow(slot))),
        const SizedBox(height: 12),
      ],
    ]);
  }
}

/// An open place on a shift. Tapping it asks to confirm, or explains why it can't be taken.
class OpenSlotRow extends StatelessWidget {
  const OpenSlotRow(this.slot, {super.key});
  final OpenSlot slot;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = slot.template;
    final (bg, _) = toneColors(tpl.tone);
    final mine = slot.people.any((p) => p.id == s.employeeId);
    final problems = checkTake(d, s.me, slot);
    final canTake = problems.isEmpty;
    final extra = _extraFor(s, slot);
    return Surface(
      padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
      onTap: mine ? null : () => canTake ? _confirm(context, s) : _explain(context, s, problems),
      child: Row(children: [
        Container(width: 5, height: 48, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(3))),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${tpl.start} – ${tpl.end}', style: serif(24, color: canTake || mine ? C.ink : C.faint)),
            const SizedBox(height: 4),
            Row(children: [
              DeptDot(d.dept(slot.dept)),
              const SizedBox(width: 6),
              Flexible(child: Text('${tpl.name} · ${d.dept(slot.dept).name} · ${l.tr('shifts.places', {'filled': slot.filled, 'needed': slot.needed})}', style: sans(13.5, color: C.muted), overflow: TextOverflow.ellipsis)),
            ]),
            if (extra != null) ...[
              const SizedBox(height: 8),
              Pill(l.tr('shifts.extra', {'count': extra.$1, 'title': extra.$2}), bg: C.brass50, fg: C.brassInk, icon: Icons.campaign_rounded),
            ],
          ]),
        ),
        const SizedBox(width: 10),
        if (mine)
          Pill(l.tr('shifts.yours'), icon: Icons.check_rounded)
        else if (canTake)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(color: C.forest, borderRadius: BorderRadius.circular(12)),
            child: Text(l.tr('shifts.take'), style: sans(13.5, color: Colors.white, weight: FontWeight.w600)),
          )
        else
          const Icon(Icons.info_outline_rounded, color: C.faint),
      ]),
    );
  }

  (int, String)? _extraFor(AppState s, OpenSlot slot) {
    for (final a in s.data!.announcements) {
      if (sameDay(a.date, slot.date) && a.dept == slot.dept && a.start != null && toMin(a.start!) >= slot.template.startMin && toMin(a.start!) < slot.template.endMin) return (a.extraStaff, a.title);
    }
    return null;
  }

  void _confirm(BuildContext context, AppState s) {
    final l = s.l;
    final d = s.data!;
    final tpl = slot.template;
    final now = weekHours(d, s.employeeId!, slot.date);
    final (bg, fg) = toneColors(tpl.tone);
    showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.tr('shifts.confirmTitle'), style: sans(15, color: C.muted, weight: FontWeight.w600)),
            const SizedBox(height: 14),
            Row(children: [Pill(tpl.name, bg: bg, fg: fg), const SizedBox(width: 8), Text(l.dayLong(slot.date), style: sans(14, color: C.muted))]),
            const SizedBox(height: 12),
            Text('${tpl.start} – ${tpl.end}', style: serif(46, color: C.forest)),
            const SizedBox(height: 8),
            Text('${d.dept(slot.dept).name} · ${l.hours(tpl.hours)}', style: sans(15, color: C.muted)),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: C.forest50, borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(Icons.schedule_rounded, size: 18, color: C.forest),
                const SizedBox(width: 10),
                Expanded(child: Text(l.tr('shifts.hoursAfter', {'now': _n(now), 'after': _n(now + tpl.hours), 'max': s.me.maxHours}), style: sans(14.5, color: C.forest, weight: FontWeight.w500))),
              ]),
            ),
            const SizedBox(height: 10),
            Text(d.selfSelectNeedsApproval ? l.tr('shifts.confirmBodyRequest') : l.tr('shifts.confirmBody'), style: sans(13.5, color: C.muted, height: 1.4)),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: () {
                final problems = s.takeShift(slot);
                Navigator.pop(sheet);
                if (problems.isNotEmpty) return _explain(context, s, problems);
                HapticFeedback.mediumImpact();
                _celebrate(context, s);
              },
              child: Text(l.tr('shifts.take')),
            ),
          ]),
        ),
      ),
    );
  }

  void _celebrate(BuildContext context, AppState s) {
    final l = s.l;
    final requested = s.data!.selfSelectNeedsApproval;
    showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '',
      barrierColor: C.ink.withValues(alpha: 0.25),
      transitionDuration: const Duration(milliseconds: 260),
      pageBuilder: (dialog, _, _) {
        Future<void>.delayed(const Duration(milliseconds: 1500), () {
          if (dialog.mounted && Navigator.canPop(dialog)) Navigator.pop(dialog);
        });
        return Center(
          child: Material(
            color: C.surface,
            borderRadius: BorderRadius.circular(28),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(32, 30, 32, 28),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 420),
                  curve: Curves.easeOutBack,
                  builder: (_, v, child) => Transform.scale(scale: v, child: child),
                  child: Container(width: 64, height: 64, decoration: const BoxDecoration(color: C.forest, shape: BoxShape.circle), child: const Icon(Icons.check_rounded, color: Colors.white, size: 36)),
                ),
                const SizedBox(height: 16),
                Text(requested ? l.tr('shifts.requestSent') : l.tr('shifts.taken', {'shift': slot.template.name, 'date': l.day(slot.date)}), textAlign: TextAlign.center, style: sans(16, weight: FontWeight.w600)),
              ]),
            ),
          ),
        );
      },
      transitionBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: ScaleTransition(scale: Tween(begin: 0.94, end: 1.0).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)), child: child)),
    );
  }

  void _explain(BuildContext context, AppState s, List<Problem> problems) {
    final l = s.l;
    showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(l.tr('shifts.cantTitle'), style: serif(32, color: C.forest)),
            const SizedBox(height: 16),
            for (final p in problems)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: p == Problem.overlap ? C.danger50 : C.warn50, borderRadius: BorderRadius.circular(14)),
                child: Row(children: [
                  Icon(_icon(p), size: 20, color: p == Problem.overlap ? C.danger : C.warn),
                  const SizedBox(width: 12),
                  Expanded(child: Text(l.tr('problem.${p.name}', {'max': s.me.maxHours}), style: sans(14.5, height: 1.4))),
                ]),
              ),
            const SizedBox(height: 10),
            OutlinedButton(onPressed: () => Navigator.pop(sheet), child: Text(l.tr('common.close'))),
          ]),
        ),
      ),
    );
  }

  IconData _icon(Problem p) => switch (p) {
        Problem.rest => Icons.bedtime_rounded,
        Problem.dayMax || Problem.weekMax => Icons.timer_rounded,
        Problem.onLeave => Icons.flight_rounded,
        Problem.unavailable => Icons.event_busy_rounded,
        Problem.overlap => Icons.block_rounded,
        _ => Icons.info_rounded,
      };
}

String _n(double v) => v % 1 == 0 ? '${v.toInt()}' : v.toStringAsFixed(1);
