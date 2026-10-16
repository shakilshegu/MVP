import 'package:flutter/material.dart';

import '../data/dates.dart';
import '../data/models.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'shell.dart';

/// Today's checklist (CR-03). Leaders also see their team's progress (CR-04).
class ChecklistScreen extends StatelessWidget {
  const ChecklistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    // The shift running now, else today's next one, else one from last night still running.
    final todays = s.myShifts(from: addDays(today(), -1), to: addDays(today(), 1)).where((a) => s.span(a).$2.isAfter(DateTime.now())).toList();
    final a = todays.isEmpty ? null : todays.first;

    if (a == null) {
      return ScreenFrame(title: l.tr('check.title'), subtitle: l.tr('check.sub'), children: [
        EmptyNote(icon: Icons.checklist, title: l.tr('check.noShift'), body: l.tr('check.noShiftBody')),
      ]);
    }
    final tpl = d.template(a.templateId);
    final items = s.checklist(a);
    final done = items.where((i) => i.$5 != null).length;
    final open = s.isRunning(a);
    final team = a.isLeader && d.leadersSeeReport ? s.teammates(a) : <Assignment>[];

    return ScreenFrame(
      title: l.tr('check.title'),
      subtitle: l.tr('check.sub'),
      children: [
        Panel(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: Text('${tpl.name} · ${tpl.start}–${tpl.end}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
              Text(l.tr('check.done', {'done': done, 'total': items.length}), style: const TextStyle(color: C.muted, fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 4),
            Text(d.dept(a.dept).name, style: const TextStyle(color: C.muted)),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: TweenAnimationBuilder<double>(
                tween: Tween(end: items.isEmpty ? 0 : done / items.length),
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeOutCubic,
                builder: (_, v, _) => LinearProgressIndicator(value: v, minHeight: 8, backgroundColor: C.forest50, color: C.forest),
              ),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 250),
              child: done == items.length && items.isNotEmpty
                  ? Padding(padding: const EdgeInsets.only(top: 12), child: Row(children: [const Icon(Icons.celebration_outlined, color: C.forest, size: 18), const SizedBox(width: 8), Text(l.tr('check.allDone'), style: const TextStyle(color: C.forest, fontWeight: FontWeight.w600))]))
                  : const SizedBox(width: double.infinity),
            ),
            if (!open) Padding(padding: const EdgeInsets.only(top: 12), child: Text(l.tr('check.upcoming'), style: const TextStyle(color: C.warn))),
          ]),
        ),
        const SizedBox(height: 12),
        Panel(
          padding: EdgeInsets.zero,
          child: Column(children: [
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0) const Divider(),
              _Item(a: a, item: items[i], enabled: open),
            ],
          ]),
        ),
        if (team.isNotEmpty) ...[
          const SizedBox(height: 22),
          SectionTitle(l.tr('check.team')),
          Text(l.tr('check.teamSub'), style: const TextStyle(color: C.muted)),
          const SizedBox(height: 10),
          for (final x in team) _TeamRow(x),
        ],
      ],
    );
  }
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
    return InkWell(
      onTap: enabled ? () => s.tick(a, id, !on) : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        color: on ? C.forest50.withValues(alpha: 0.6) : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 26,
            height: 26,
            decoration: BoxDecoration(color: on ? C.forest : Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: on ? C.forest : C.sageDark, width: 2)),
            child: AnimatedScale(scale: on ? 1 : 0, duration: const Duration(milliseconds: 220), curve: Curves.easeOutBack, child: const Icon(Icons.check, size: 18, color: Colors.white)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: on ? C.muted : C.ink)),
                if (extra) Pill(s.l.tr('check.extra'), bg: C.paper, fg: C.muted),
              ]),
              if (detail.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 3), child: Text(detail, style: const TextStyle(fontSize: 13, color: C.muted, height: 1.35))),
            ]),
          ),
          if (on) Padding(padding: const EdgeInsets.only(left: 8, top: 2), child: Text(s.l.time(tick), style: const TextStyle(fontSize: 12, color: C.muted))),
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
      child: Panel(
        child: Row(children: [
          Avatar(e),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(e.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: items.isEmpty ? 0 : done / items.length, minHeight: 6, backgroundColor: C.forest50, color: C.forest)),
            ]),
          ),
          const SizedBox(width: 12),
          Text('$done/${items.length}', style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
