import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/dates.dart';
import '../data/models.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Today's checklist (CR-03). Leaders also see their team's progress (CR-04).
class ChecklistScreen extends StatelessWidget {
  const ChecklistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final todays = s.myShifts(from: addDays(today(), -1), to: addDays(today(), 1)).where((a) => s.span(a).$2.isAfter(DateTime.now())).toList();
    final a = todays.isEmpty ? null : todays.first;

    if (a == null) {
      return PageFrame(title: l.tr('check.title'), subtitle: l.tr('check.sub'), children: [
        EmptyNote(icon: Icons.task_alt_rounded, title: l.tr('check.noShift'), body: l.tr('check.noShiftBody')),
      ]);
    }
    final tpl = d.template(a.templateId);
    final items = s.checklist(a);
    final done = items.where((i) => i.$5 != null).length;
    final open = s.isRunning(a);
    final team = a.isLeader && d.leadersSeeReport ? s.teammates(a) : <Assignment>[];
    final all = items.isNotEmpty && done == items.length;

    return PageFrame(
      title: l.tr('check.title'),
      children: [
        Surface(
          padding: const EdgeInsets.all(20),
          child: Row(children: [
            _Ring(value: items.isEmpty ? 0 : done / items.length, label: '$done/${items.length}', complete: all),
            const SizedBox(width: 18),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${tpl.start} – ${tpl.end}', style: serif(28)),
                const SizedBox(height: 4),
                Text('${tpl.name} · ${d.dept(a.dept).name}', style: sans(14, color: C.muted)),
                const SizedBox(height: 8),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: Text(
                    !open ? l.tr('check.upcoming') : all ? l.tr('check.allDone') : l.tr('check.sub'),
                    key: ValueKey('$open$all'),
                    style: sans(13.5, color: !open ? C.warn : all ? C.forest : C.muted, weight: all ? FontWeight.w600 : FontWeight.w400, height: 1.35),
                  ),
                ),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 14),
        for (var i = 0; i < items.length; i++) Padding(padding: const EdgeInsets.only(bottom: 8), child: Entrance(delay: i * 45, child: _Item(a: a, item: items[i], enabled: open))),
        if (team.isNotEmpty) ...[
          const SizedBox(height: 22),
          SectionLabel(l.tr('check.team')),
          Padding(padding: const EdgeInsets.fromLTRB(4, 0, 4, 12), child: Text(l.tr('check.teamSub'), style: sans(13.5, color: C.muted, height: 1.4))),
          for (final x in team) _TeamRow(x),
        ],
      ],
    );
  }
}

/// Progress ring with the count inside.
class _Ring extends StatelessWidget {
  const _Ring({required this.value, required this.label, required this.complete});
  final double value;
  final String label;
  final bool complete;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 86,
      height: 86,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: value),
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeOutCubic,
        builder: (_, v, _) => CustomPaint(
          painter: _RingPainter(v),
          child: Center(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: complete ? const Icon(Icons.check_rounded, key: ValueKey('ok'), color: C.forest, size: 34) : Text(label, key: ValueKey(label), style: serif(26, color: C.forest)),
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.v);
  final double v;

  @override
  void paint(Canvas canvas, Size size) {
    final r = Rect.fromLTWH(5, 5, size.width - 10, size.height - 10);
    final base = Paint()
      ..color = C.forest50
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8;
    final fg = Paint()
      ..color = C.forest
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(r, 0, math.pi * 2, false, base);
    if (v > 0) canvas.drawArc(r, -math.pi / 2, math.pi * 2 * v, false, fg);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.v != v;
}

class _Item extends StatelessWidget {
  const _Item({required this.a, required this.item, required this.enabled});
  final Assignment a;
  final (String, String, String, bool, DateTime?) item;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final (id, title, detail, extra, tick) = item;
    final on = tick != null;
    return GestureDetector(
      onTap: enabled
          ? () {
              HapticFeedback.lightImpact();
              s.tick(a, id, !on);
            }
          : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 260),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        decoration: BoxDecoration(color: on ? C.forest50 : C.surface, borderRadius: BorderRadius.circular(18)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: on ? C.forest : Colors.transparent, shape: BoxShape.circle, border: Border.all(color: on ? C.forest : C.sageDark, width: 2)),
            child: AnimatedScale(scale: on ? 1 : 0, duration: const Duration(milliseconds: 240), curve: Curves.easeOutBack, child: const Icon(Icons.check_rounded, size: 18, color: Colors.white)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(
                  child: AnimatedDefaultTextStyle(
                    duration: const Duration(milliseconds: 200),
                    style: sans(15.5, color: on ? C.muted : C.ink, weight: FontWeight.w600),
                    child: Text(title),
                  ),
                ),
                if (extra) ...[const SizedBox(width: 8), Pill(s.l.tr('check.extra'), bg: C.brass50, fg: C.brassInk)],
              ]),
              if (detail.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(detail, style: sans(13.5, color: C.muted, height: 1.4))),
            ]),
          ),
          if (on) Padding(padding: const EdgeInsets.only(left: 10, top: 3), child: Text(s.l.time(tick), style: sans(12.5, color: C.forest, weight: FontWeight.w600))),
        ]),
      ),
    );
  }
}

class _TeamRow extends StatelessWidget {
  const _TeamRow(this.a);
  final Assignment a;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final e = s.data!.employee(a.employeeId);
    final items = s.checklist(a);
    final done = items.where((i) => i.$5 != null).length;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Surface(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Avatar(e, size: 36),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(e.name, style: sans(15, weight: FontWeight.w600)),
              const SizedBox(height: 8),
              ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: items.isEmpty ? 0 : done / items.length, minHeight: 6, backgroundColor: C.forest50, color: C.forest)),
            ]),
          ),
          const SizedBox(width: 14),
          Text('$done/${items.length}', style: serif(22, color: C.forest)),
        ]),
      ),
    );
  }
}
