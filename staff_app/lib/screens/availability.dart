import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/dates.dart';
import '../data/rules.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Availability for the coming weeks, sent to the manager before the deadline (CR-07).
class AvailabilityScreen extends StatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  State<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends State<AvailabilityScreen> {
  int _offset = 1; // next week: the one being planned
  final Map<DateTime, List<bool>> _draft = {};

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final week = addDays(weekStart(today()), _offset * 7);
    final days = weekDays(week);
    final deadline = availabilityDeadline(s.data!, week);
    final closed = DateTime.now().isAfter(deadline);
    final sent = s.availabilitySent(week);
    final values = _draft[week] ?? s.weekAvailability(week);
    final changed = _draft[week] != null;
    final count = values.where((v) => v).length;

    return PageFrame(
      title: l.tr('avail.title'),
      subtitle: l.tr('avail.sub'),
      children: [
        Row(children: [
          _Arrow(icon: Icons.chevron_left_rounded, onTap: _offset > 1 ? () => setState(() => _offset--) : null),
          Expanded(
            child: Column(children: [
              Text(l.range(week, days.last), style: serif(26, color: C.forest)),
              const SizedBox(height: 4),
              Text(closed ? l.tr('avail.closed') : l.tr('avail.due', {'when': '${l.day(deadline)}, ${l.time(deadline)}'}), textAlign: TextAlign.center, style: sans(13, color: closed ? C.muted : C.forest)),
            ]),
          ),
          _Arrow(icon: Icons.chevron_right_rounded, onTap: _offset < 4 ? () => setState(() => _offset++) : null),
        ]),
        const SizedBox(height: 20),
        GridView.count(
          crossAxisCount: 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 0.78,
          children: [
            for (var i = 0; i < 7; i++)
              _DayTile(
                day: days[i],
                value: values[i],
                leave: s.onLeave(days[i]),
                enabled: !closed,
                onTap: () => setState(() => (_draft[week] = List.of(values))[i] = !values[i]),
              ),
            _Summary(count: count, sent: sent && !changed),
          ],
        ),
        const SizedBox(height: 12),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(sent ? l.tr('avail.tapHint') : '${l.tr('avail.usual')} ${l.tr('avail.tapHint')}', style: sans(13, color: C.muted, height: 1.4))),
        const SizedBox(height: 22),
        FilledButton(
          onPressed: closed || (sent && !changed)
              ? null
              : () {
                  HapticFeedback.mediumImpact();
                  s.sendAvailability(week, values);
                  setState(() => _draft.remove(week));
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.tr('avail.saved'))));
                },
          child: Text(sent && !changed ? '✓ ${l.tr('avail.sent')}' : l.tr('avail.save')),
        ),
      ],
    );
  }
}

class _Arrow extends StatelessWidget {
  const _Arrow({required this.icon, this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: onTap == null ? Colors.transparent : C.surface,
      shape: const CircleBorder(),
      child: InkWell(customBorder: const CircleBorder(), onTap: onTap, child: Padding(padding: const EdgeInsets.all(10), child: Icon(icon, color: onTap == null ? C.line : C.ink))),
    );
  }
}

/// One day: tap to switch between "can work" and "off". Leave is fixed.
class _DayTile extends StatelessWidget {
  const _DayTile({required this.day, required this.value, required this.leave, required this.enabled, required this.onTap});
  final DateTime day;
  final bool value;
  final bool leave;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    final on = value && !leave;
    final bg = leave ? C.bark50 : on ? C.forest : C.surface;
    final fg = leave ? C.bark : on ? Colors.white : C.muted;
    return GestureDetector(
      onTap: enabled && !leave
          ? () {
              HapticFeedback.selectionClick();
              onTap();
            }
          : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(18), border: Border.all(color: on || leave ? Colors.transparent : C.line)),
        child: Column(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(l.weekdayShort(day), style: sans(13, color: fg.withValues(alpha: on ? 0.8 : 1), weight: FontWeight.w600)),
          Text('${day.day}', style: serif(32, color: on ? Colors.white : (leave ? C.bark : C.ink))),
          Icon(leave ? Icons.flight_rounded : on ? Icons.check_rounded : Icons.remove_rounded, size: 18, color: fg),
        ]),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.count, required this.sent});
  final int count;
  final bool sent;

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
      decoration: BoxDecoration(color: sent ? C.forest50 : C.warn50, borderRadius: BorderRadius.circular(18)),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text('$count/7', style: serif(30, color: sent ? C.forest : C.warn)),
        const SizedBox(height: 4),
        Text(sent ? l.tr('avail.sent') : l.tr('avail.notSent'), textAlign: TextAlign.center, style: sans(11.5, color: sent ? C.forest : C.warn, weight: FontWeight.w600)),
      ]),
    );
  }
}
