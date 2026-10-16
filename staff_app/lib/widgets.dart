import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'data/dates.dart';
import 'data/models.dart';
import 'state/app_state.dart';
import 'theme.dart';

/// White rounded surface without borders.
class Surface extends StatelessWidget {
  const Surface({super.key, required this.child, this.padding = const EdgeInsets.all(18), this.color = C.surface, this.onTap, this.radius = 22});
  final Widget child;
  final EdgeInsets padding;
  final Color color;
  final VoidCallback? onTap;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final box = Container(
      padding: padding,
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(radius)),
      child: child,
    );
    return onTap == null ? box : Tap(onTap: onTap!, child: box);
  }
}

/// Shrinks slightly while pressed: quiet feedback that the tap registered.
class Tap extends StatefulWidget {
  const Tap({super.key, required this.child, required this.onTap});
  final Widget child;
  final VoidCallback onTap;

  @override
  State<Tap> createState() => _TapState();
}

class _TapState extends State<Tap> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => setState(() => _down = true),
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) => setState(() => _down = false),
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onTap();
      },
      child: AnimatedScale(scale: _down ? 0.975 : 1, duration: const Duration(milliseconds: 120), child: widget.child),
    );
  }
}

/// Fades and lifts its child in once, after [delay]. Used for a single staggered entrance per screen.
class Entrance extends StatefulWidget {
  const Entrance({super.key, required this.child, this.delay = 0});
  final Widget child;
  final int delay;

  @override
  State<Entrance> createState() => _EntranceState();
}

class _EntranceState extends State<Entrance> {
  bool _shown = false;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(Duration(milliseconds: 40 + widget.delay), () {
      if (mounted) setState(() => _shown = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _shown ? 1 : 0,
      duration: const Duration(milliseconds: 380),
      curve: Curves.easeOut,
      child: AnimatedSlide(offset: _shown ? Offset.zero : const Offset(0, 0.04), duration: const Duration(milliseconds: 420), curve: Curves.easeOutCubic, child: widget.child),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar(this.e, {super.key, this.size = 32, this.ring});
  final Employee e;
  final double size;
  final Color? ring;

  @override
  Widget build(BuildContext context) {
    final c = Color(e.color);
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Color.alphaBlend(c.withValues(alpha: 0.18), Colors.white),
        shape: BoxShape.circle,
        border: ring == null ? null : Border.all(color: ring!, width: 2),
      ),
      child: Text(e.initials, style: sans(size * 0.36, color: c, weight: FontWeight.w700)),
    );
  }
}

/// Overlapping faces, for "who's on this shift".
class AvatarStack extends StatelessWidget {
  const AvatarStack(this.people, {super.key, this.size = 26, this.ring = C.surface, this.max = 4});
  final List<Employee> people;
  final double size;
  final Color ring;
  final int max;

  @override
  Widget build(BuildContext context) {
    final shown = people.take(max).toList();
    if (shown.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      width: size + (shown.length - 1) * size * 0.62,
      height: size,
      child: Stack(children: [for (var i = 0; i < shown.length; i++) Positioned(left: i * size * 0.62, child: Avatar(shown[i], size: size, ring: ring))]),
    );
  }
}

class DeptDot extends StatelessWidget {
  const DeptDot(this.dept, {super.key, this.size = 7});
  final Department dept;
  final double size;

  @override
  Widget build(BuildContext context) => Container(width: size, height: size, decoration: BoxDecoration(color: Color(dept.color), shape: BoxShape.circle));
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 14, color: fg), const SizedBox(width: 5)],
        Text(text, style: sans(12.5, color: fg, weight: FontWeight.w600, height: 1.1)),
      ]),
    );
  }
}

/// Small muted heading above a group; optional action on the right.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.action, this.onAction});
  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 10),
      child: Row(children: [
        Expanded(child: Text(text, style: sans(14, color: C.muted, weight: FontWeight.w600))),
        if (action != null) GestureDetector(onTap: onAction, child: Text(action!, style: sans(14, color: C.forest, weight: FontWeight.w600))),
      ]),
    );
  }
}

/// Standard screen: big serif title, optional subtitle and trailing widget, scrolling content.
class PageFrame extends StatelessWidget {
  const PageFrame({super.key, required this.title, this.subtitle, this.trailing, required this.children});
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: serif(40, color: C.forest)),
                  if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(subtitle!, style: sans(15, color: C.muted, height: 1.4))),
                ]),
              ),
              ?trailing,
            ]),
            const SizedBox(height: 22),
            ...children,
          ],
        ),
      ),
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
    return Surface(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 26),
      child: Column(children: [
        Container(width: 52, height: 52, decoration: const BoxDecoration(color: C.forest50, shape: BoxShape.circle), child: Icon(icon, color: C.forest, size: 24)),
        const SizedBox(height: 14),
        Text(title, style: sans(17, weight: FontWeight.w600), textAlign: TextAlign.center),
        const SizedBox(height: 6),
        Text(body, style: sans(14.5, color: C.muted, height: 1.45), textAlign: TextAlign.center),
        if (action != null) ...[const SizedBox(height: 18), action!],
      ]),
    );
  }
}

/// "in 3 h 12 min" / "ends in 40 min", refreshed every minute.
class Countdown extends StatefulWidget {
  const Countdown({super.key, required this.start, required this.end, this.style});
  final DateTime start;
  final DateTime end;
  final TextStyle? style;

  @override
  State<Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<Countdown> {
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    final now = DateTime.now();
    final running = !now.isBefore(widget.start);
    final d = (running ? widget.end : widget.start).difference(now);
    String span;
    if (d.inDays >= 2) {
      span = l.tr('time.days', {'n': d.inDays});
    } else if (d.inHours >= 1) {
      span = l.tr('time.hm', {'h': d.inHours, 'm': d.inMinutes % 60});
    } else {
      span = l.tr('time.m', {'m': d.inMinutes.clamp(1, 59)});
    }
    return Text(l.tr(running ? 'time.endsIn' : 'time.in', {'span': span}), style: widget.style);
  }
}

/// The week at a glance: each day with a dot when I work, today outlined.
class WeekStrip extends StatelessWidget {
  const WeekStrip({super.key, required this.start, this.selected, this.onSelect});
  final DateTime start;
  final DateTime? selected;
  final ValueChanged<DateTime>? onSelect;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final mine = s.myShifts(from: start, to: addDays(start, 7));
    final now = today();
    return Row(children: [
      for (final d in weekDays(start))
        Expanded(
          child: Builder(builder: (context) {
            final shift = mine.where((a) => sameDay(a.date, d)).toList();
            final isToday = sameDay(d, now);
            final isSel = selected != null && sameDay(selected!, d);
            final past = d.isBefore(now);
            final tone = shift.isEmpty ? null : toneColors(s.data!.template(shift.first.templateId).tone);
            return GestureDetector(
              onTap: onSelect == null ? null : () => onSelect!(d),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 2.5),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSel ? C.forest : (isToday ? C.forest50 : Colors.transparent),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(children: [
                  Text(l.weekdayShort(d).substring(0, 2), style: sans(12, color: isSel ? C.mint : C.faint, weight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('${d.day}', style: sans(16, color: isSel ? Colors.white : (past ? C.faint : C.ink), weight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    width: 18,
                    height: 4,
                    decoration: BoxDecoration(color: tone == null ? Colors.transparent : (isSel ? Colors.white : tone.$2.withValues(alpha: past ? 0.35 : 0.85)), borderRadius: BorderRadius.circular(2)),
                  ),
                ]),
              ),
            );
          }),
        ),
    ]);
  }
}

/// One of my shifts as a compact row: date, big time, meta, leader mark.
class ShiftRow extends StatelessWidget {
  const ShiftRow(this.a, {super.key});
  final Assignment a;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = d.template(a.templateId);
    final (bg, fg) = toneColors(tpl.tone);
    final past = s.span(a).$2.isBefore(DateTime.now());
    final running = s.isRunning(a);
    final mates = s.teammates(a).map((x) => d.employee(x.employeeId)).toList();
    return Opacity(
      opacity: past ? 0.5 : 1,
      child: Surface(
        padding: const EdgeInsets.fromLTRB(14, 14, 16, 14),
        onTap: () => showShiftSheet(context, a),
        child: Row(children: [
          Container(
            width: 52,
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
            child: Column(children: [
              Text(l.weekdayShort(a.date), style: sans(11.5, color: fg, weight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text('${a.date.day}', style: serif(26, color: fg)),
            ]),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${tpl.start} – ${tpl.end}', style: serif(25)),
              const SizedBox(height: 4),
              Row(children: [
                DeptDot(d.dept(a.dept)),
                const SizedBox(width: 6),
                Flexible(child: Text('${tpl.name} · ${d.dept(a.dept).name} · ${l.hours(tpl.hours)}', style: sans(13.5, color: C.muted), overflow: TextOverflow.ellipsis)),
              ]),
            ]),
          ),
          if (running)
            Pill(l.tr('home.now'), bg: C.forest, fg: Colors.white)
          else if (a.state == AssignmentState.requested)
            Pill(l.tr('shift.requested'), bg: C.warn50, fg: C.warn)
          else if (a.isLeader)
            const Icon(Icons.workspace_premium, color: C.brass, size: 22)
          else
            AvatarStack(mates, size: 24, max: 2),
        ]),
      ),
    );
  }
}

/// Everything about one shift: time, leader, team, extra tasks.
void showShiftSheet(BuildContext context, Assignment a) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => AppScope(state: AppScope.of(context), child: _ShiftSheet(a)),
  );
}

class _ShiftSheet extends StatelessWidget {
  const _ShiftSheet(this.a);
  final Assignment a;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = d.template(a.templateId);
    final (bg, fg) = toneColors(tpl.tone);
    final (start, end) = s.span(a);
    final leader = s.leaderOf(a);
    final mates = s.teammates(a).map((x) => d.employee(x.employeeId)).toList();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Pill(tpl.name, bg: bg, fg: fg),
            const SizedBox(width: 8),
            Text(l.dayLong(a.date), style: sans(14, color: C.muted)),
          ]),
          const SizedBox(height: 14),
          Text('${tpl.start} – ${tpl.end}', style: serif(48, color: C.forest)),
          const SizedBox(height: 6),
          if (end.isAfter(DateTime.now())) Countdown(start: start, end: end, style: sans(15, color: C.muted)),
          const SizedBox(height: 22),
          _InfoRow(icon: Icons.storefront_outlined, text: '${d.dept(a.dept).name} · ${d.branchName} · ${l.hours(tpl.hours)}'),
          _InfoRow(
            icon: Icons.workspace_premium_outlined,
            iconColor: C.brass,
            text: a.isLeader ? l.tr('shift.youLead') : leader != null ? l.tr('shift.ledBy', {'name': leader.name}) : l.tr('shift.noLeader'),
            strong: a.isLeader,
          ),
          _InfoRow(icon: Icons.group_outlined, text: mates.isEmpty ? l.tr('shift.alone') : l.tr('shift.with', {'names': mates.map((m) => m.first).join(', ')}), trailing: AvatarStack(mates, size: 26)),
          if (a.tasks.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(l.tr('shift.tasks'), style: sans(13, color: C.muted, weight: FontWeight.w600)),
            const SizedBox(height: 8),
            for (final t in a.tasks) _InfoRow(icon: Icons.task_alt, text: t),
          ],
        ]),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text, this.iconColor = C.muted, this.strong = false, this.trailing});
  final IconData icon;
  final String text;
  final Color iconColor;
  final bool strong;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(children: [
        Icon(icon, size: 20, color: iconColor),
        const SizedBox(width: 14),
        Expanded(child: Text(text, style: sans(15, weight: strong ? FontWeight.w600 : FontWeight.w400, color: strong ? C.forest : C.ink))),
        ?trailing,
      ]),
    );
  }
}
