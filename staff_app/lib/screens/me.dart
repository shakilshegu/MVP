import 'package:flutter/material.dart';

import '../data/dates.dart';
import '../data/models.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'shell.dart';

/// Profile, earnings and shift history (CR-08).
class MeScreen extends StatefulWidget {
  const MeScreen({super.key});

  @override
  State<MeScreen> createState() => _MeScreenState();
}

class _MeScreenState extends State<MeScreen> {
  bool _all = false;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final me = s.me;
    final worked = s.worked();
    final now = today();
    final ws = weekStart(now);
    final month = DateTime(now.year, now.month);
    final lastMonth = DateTime(now.year, now.month - 1);
    final tiles = [
      (l.tr('me.weekEarn'), worked.where((a) => !a.date.isBefore(ws))),
      (l.tr('me.monthEarn'), worked.where((a) => !a.date.isBefore(month))),
      (l.tr('me.lastMonth'), worked.where((a) => !a.date.isBefore(lastMonth) && a.date.isBefore(month))),
    ];
    final shown = _all ? worked : worked.take(8).toList();

    return ScreenFrame(
      title: me.name,
      subtitle: '${me.position} · ${d.branchName}',
      trailing: Avatar(me, size: 52),
      children: [
        Panel(
          child: Row(children: [
            Text(l.tr('me.departments'), style: const TextStyle(color: C.muted)),
            const Spacer(),
            Wrap(spacing: 12, children: [for (final id in me.skills) DeptTag(d.dept(id))]),
          ]),
        ),
        const SizedBox(height: 20),
        SectionTitle(l.tr('me.earnings')),
        Row(children: [
          for (var i = 0; i < tiles.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(
              child: Panel(
                padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(tiles[i].$1, style: const TextStyle(fontSize: 12, color: C.muted)),
                  const SizedBox(height: 4),
                  FittedBox(child: Text(l.money(s.earned(tiles[i].$2), d.currency), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700))),
                  Text('${l.hours(tiles[i].$2.fold(0.0, (t, a) => t + d.template(a.templateId).hours))} · ${l.plural('shifts', tiles[i].$2.length)}', style: const TextStyle(fontSize: 11, color: C.muted)),
                ]),
              ),
            ),
          ],
        ]),
        const SizedBox(height: 8),
        Text(l.tr('me.estimate'), style: const TextStyle(fontSize: 12, color: C.muted)),
        const SizedBox(height: 22),
        SectionTitle(l.tr('me.history')),
        if (worked.isEmpty)
          Panel(child: Text(l.tr('me.noHistory'), style: const TextStyle(color: C.muted)))
        else
          Panel(
            padding: EdgeInsets.zero,
            child: Column(children: [
              for (var i = 0; i < shown.length; i++) ...[
                if (i > 0) const Divider(),
                _HistoryRow(shown[i]),
              ],
              if (worked.length > 8) ...[
                const Divider(),
                TextButton(onPressed: () => setState(() => _all = !_all), child: Text(_all ? '−' : '+ ${worked.length - 8}')),
              ],
            ]),
          ),
        const SizedBox(height: 22),
        Panel(
          child: Row(children: [
            Text(l.tr('me.language'), style: const TextStyle(fontWeight: FontWeight.w500)),
            const Spacer(),
            SegmentedButton<String>(
              showSelectedIcon: false,
              style: SegmentedButton.styleFrom(visualDensity: VisualDensity.compact, selectedBackgroundColor: C.forest, selectedForegroundColor: Colors.white, backgroundColor: Colors.white),
              segments: const [ButtonSegment(value: 'en', label: Text('English')), ButtonSegment(value: 'de', label: Text('Deutsch'))],
              selected: {s.lang},
              onSelectionChanged: (v) => s.setLang(v.first),
            ),
          ]),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(onPressed: s.signOut, icon: const Icon(Icons.logout, size: 18), label: Text(l.tr('me.signOut'))),
        if (s.backend.isDemo) Padding(padding: const EdgeInsets.only(top: 14), child: Text(l.tr('me.demo'), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: C.muted))),
      ],
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow(this.a);
  final Assignment a;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = d.template(a.templateId);
    final (bg, fg) = toneColors(tpl.tone);
    final items = s.checklist(a);
    final done = items.where((i) => i.$5 != null).length;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(children: [
        SizedBox(width: 92, child: Text(l.day(a.date), style: const TextStyle(fontWeight: FontWeight.w500))),
        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)), child: Text(tpl.name, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg))),
        const SizedBox(width: 10),
        Icon(Icons.checklist, size: 15, color: done < items.length ? C.bark : C.muted),
        const SizedBox(width: 3),
        Text('$done/${items.length}', style: TextStyle(fontSize: 12, color: done < items.length ? C.bark : C.muted)),
        const Spacer(),
        Text(l.hours(tpl.hours), style: const TextStyle(color: C.muted, fontSize: 13)),
        const SizedBox(width: 12),
        Text(l.money(tpl.hours * s.me.hourlyRate, d.currency), style: const TextStyle(fontWeight: FontWeight.w600)),
      ]),
    );
  }
}
