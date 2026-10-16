import 'package:flutter/material.dart';

import 'data/models.dart';
import 'state/app_state.dart';
import 'theme.dart';

class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.color = Colors.white, this.onTap});
  final Widget child;
  final EdgeInsets padding;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: color == Colors.white ? C.line : Colors.transparent)),
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar(this.e, {super.key, this.size = 32});
  final Employee e;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = Color(e.color);
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: c.withValues(alpha: 0.16), shape: BoxShape.circle),
      child: Text(e.initials, style: TextStyle(fontSize: size * 0.36, fontWeight: FontWeight.w600, color: c)),
    );
  }
}

class DeptTag extends StatelessWidget {
  const DeptTag(this.dept, {super.key});
  final Department dept;

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 8, height: 8, decoration: BoxDecoration(color: Color(dept.color), shape: BoxShape.circle)),
      const SizedBox(width: 6),
      Text(dept.name, style: const TextStyle(fontSize: 13, color: C.muted)),
    ]);
  }
}

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.bg = C.forest50, this.fg = C.forest, this.icon});
  final String text;
  final Color bg;
  final Color fg;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 4)],
        Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg)),
      ]),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, top: 4),
      child: Row(children: [
        Expanded(child: Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: C.muted))),
        ?trailing,
      ]),
    );
  }
}

class EmptyNote extends StatelessWidget {
  const EmptyNote({super.key, required this.icon, required this.title, required this.body, this.action});
  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Panel(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
      child: Column(children: [
        Container(width: 44, height: 44, decoration: const BoxDecoration(color: C.forest50, shape: BoxShape.circle), child: Icon(icon, color: C.forest)),
        const SizedBox(height: 12),
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16), textAlign: TextAlign.center),
        const SizedBox(height: 6),
        Text(body, style: const TextStyle(color: C.muted, height: 1.4), textAlign: TextAlign.center),
        if (action != null) ...[const SizedBox(height: 16), action!],
      ]),
    );
  }
}

/// One of my shifts: day, time, department, leader and who I work with.
class ShiftCard extends StatelessWidget {
  const ShiftCard(this.a, {super.key, this.big = false});
  final Assignment a;
  final bool big;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = d.template(a.templateId);
    final (bg, fg) = toneColors(tpl.tone);
    final leader = s.leaderOf(a);
    final mates = s.teammates(a).map((x) => d.employee(x.employeeId)).toList();
    final running = s.isRunning(a);
    return Panel(
      padding: EdgeInsets.all(big ? 18 : 14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: big ? 58 : 50,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
          child: Column(children: [
            Text(l.weekdayShort(a.date), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg)),
            Text('${a.date.day}', style: serif(big ? 28 : 24, color: fg)),
          ]),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
              Text('${tpl.name} · ${tpl.start}–${tpl.end}', style: TextStyle(fontSize: big ? 17 : 15, fontWeight: FontWeight.w600)),
              if (running) Pill(l.tr('home.now'), bg: C.forest, fg: Colors.white),
              if (a.state == AssignmentState.requested) Pill(l.tr('shift.requested'), bg: C.warn50, fg: C.warn),
            ]),
            const SizedBox(height: 6),
            Row(children: [DeptTag(d.dept(a.dept)), const SizedBox(width: 10), Text(l.hours(tpl.hours), style: const TextStyle(fontSize: 13, color: C.muted))]),
            const SizedBox(height: 8),
            Row(children: [
              Icon(Icons.workspace_premium_outlined, size: 16, color: a.isLeader ? C.brass : C.muted),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  a.isLeader ? l.tr('shift.youLead') : leader != null ? l.tr('shift.ledBy', {'name': leader.first}) : l.tr('shift.noLeader'),
                  style: TextStyle(fontSize: 13, fontWeight: a.isLeader ? FontWeight.w600 : FontWeight.w400, color: a.isLeader ? C.forest : C.ink.withValues(alpha: 0.75)),
                ),
              ),
            ]),
            const SizedBox(height: 6),
            Row(children: [
              for (final m in mates.take(4)) Padding(padding: const EdgeInsets.only(right: 4), child: Avatar(m, size: 22)),
              const SizedBox(width: 4),
              Expanded(child: Text(mates.isEmpty ? l.tr('shift.alone') : l.tr('shift.with', {'names': mates.map((m) => m.first).join(', ')}), style: const TextStyle(fontSize: 13, color: C.muted), overflow: TextOverflow.ellipsis)),
            ]),
            if (a.tasks.isNotEmpty) ...[
              const SizedBox(height: 10),
              for (final t in a.tasks)
                Row(children: [const Icon(Icons.assignment_outlined, size: 15, color: C.muted), const SizedBox(width: 6), Expanded(child: Text(t, style: const TextStyle(fontSize: 13)))]),
            ],
          ]),
        ),
      ]),
    );
  }
}
