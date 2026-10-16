import 'package:flutter/material.dart';

import '../data/dates.dart';
import '../data/rules.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'shell.dart';

/// Availability for the coming weeks, sent to the manager before the deadline (CR-07).
class AvailabilityScreen extends StatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  State<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends State<AvailabilityScreen> {
  int _offset = 1; // next week by default: the one that's being planned
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

    return ScreenFrame(
      title: l.tr('avail.title'),
      subtitle: l.tr('avail.sub'),
      children: [
        Panel(
          padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
          child: Row(children: [
            IconButton(onPressed: _offset > 1 ? () => setState(() => _offset--) : null, icon: const Icon(Icons.chevron_left)),
            Expanded(child: Text(l.tr('avail.week', {'date': l.range(week, days.last)}), textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600))),
            IconButton(onPressed: _offset < 4 ? () => setState(() => _offset++) : null, icon: const Icon(Icons.chevron_right)),
          ]),
        ),
        const SizedBox(height: 10),
        Row(children: [
          Icon(closed ? Icons.lock_outline : Icons.schedule, size: 16, color: closed ? C.muted : C.forest),
          const SizedBox(width: 6),
          Expanded(child: Text(closed ? l.tr('avail.closed') : l.tr('avail.due', {'when': '${l.day(deadline)}, ${l.time(deadline)}'}), style: TextStyle(color: closed ? C.muted : C.forest, fontSize: 13))),
          Pill(sent ? l.tr('avail.sent') : l.tr('avail.notSent'), bg: sent ? C.forest50 : C.warn50, fg: sent ? C.forest : C.warn, icon: sent ? Icons.check : null),
        ]),
        if (!sent) Padding(padding: const EdgeInsets.only(top: 8), child: Text(l.tr('avail.usual'), style: const TextStyle(color: C.muted, fontSize: 13))),
        const SizedBox(height: 14),
        Panel(
          padding: EdgeInsets.zero,
          child: Column(children: [
            for (var i = 0; i < 7; i++) ...[
              if (i > 0) const Divider(),
              _DayRow(
                label: l.dayLong(days[i]),
                value: values[i],
                leave: s.onLeave(days[i]),
                enabled: !closed,
                onChanged: (v) => setState(() => (_draft[week] = List.of(values))[i] = v),
              ),
            ],
          ]),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: closed || (sent && !changed)
              ? null
              : () {
                  s.sendAvailability(week, values);
                  setState(() => _draft.remove(week));
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.tr('avail.saved'))));
                },
          child: Text(l.tr('avail.save')),
        ),
      ],
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({required this.label, required this.value, required this.leave, required this.enabled, required this.onChanged});
  final String label;
  final bool value;
  final bool leave;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final l = AppScope.of(context).l;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(children: [
        Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500))),
        if (leave)
          Pill(l.tr('avail.leave'), bg: C.bark50, fg: C.bark, icon: Icons.flight_outlined)
        else ...[
          Text(value ? l.tr('avail.can') : l.tr('avail.cant'), style: TextStyle(fontSize: 13, color: value ? C.forest : C.muted)),
          const SizedBox(width: 8),
          Switch(value: value, onChanged: enabled ? onChanged : null, activeThumbColor: Colors.white, activeTrackColor: C.forest),
        ],
      ]),
    );
  }
}
