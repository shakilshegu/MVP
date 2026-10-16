import 'package:flutter/material.dart';

import '../data/dates.dart';
import '../data/models.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Profile, earnings and shift history (CR-08).
class MeScreen extends StatefulWidget {
  const MeScreen({super.key});

  @override
  State<MeScreen> createState() => _MeScreenState();
}

class _MeScreenState extends State<MeScreen> {
  int _period = 1; // 0 week, 1 month, 2 last month
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
    final periods = [
      (l.tr('me.weekEarn'), worked.where((a) => !a.date.isBefore(ws)).toList()),
      (l.tr('me.monthEarn'), worked.where((a) => !a.date.isBefore(month)).toList()),
      (l.tr('me.lastMonth'), worked.where((a) => !a.date.isBefore(lastMonth) && a.date.isBefore(month)).toList()),
    ];
    final list = periods[_period].$2;
    final hours = list.fold(0.0, (t, a) => t + d.template(a.templateId).hours);
    final weeks = List.generate(6, (i) => addDays(ws, (i - 5) * 7));
    final perWeek = [for (final w in weeks) worked.where((a) => !a.date.isBefore(w) && a.date.isBefore(addDays(w, 7))).fold(0.0, (t, a) => t + d.template(a.templateId).hours)];
    final peak = [me.maxHours.toDouble(), ...perWeek].reduce((a, b) => a > b ? a : b);
    final shown = _all ? worked : worked.take(6).toList();

    return PageFrame(
      title: me.first,
      subtitle: '${me.position} · ${d.branchName}',
      trailing: Avatar(me, size: 56),
      children: [
        Surface(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              for (var i = 0; i < periods.length; i++)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => setState(() => _period = i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(color: _period == i ? C.forest : C.forest50, borderRadius: BorderRadius.circular(99)),
                      child: Text(periods[i].$1, style: sans(12.5, color: _period == i ? Colors.white : C.forest, weight: FontWeight.w600)),
                    ),
                  ),
                ),
            ]),
            const SizedBox(height: 18),
            TweenAnimationBuilder<double>(
              tween: Tween(end: s.earned(list)),
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeOutCubic,
              builder: (_, v, _) => Text(l.money(v.roundToDouble(), d.currency), style: serif(54, color: C.forest)),
            ),
            const SizedBox(height: 6),
            Text('${l.hours(hours)} · ${l.plural('shifts', list.length)}', style: sans(14, color: C.muted)),
            const SizedBox(height: 22),
            Text(l.tr('me.chart'), style: sans(12.5, color: C.muted, weight: FontWeight.w600)),
            const SizedBox(height: 10),
            SizedBox(
              height: 92,
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                for (var i = 0; i < weeks.length; i++)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                        Text(perWeek[i] == 0 ? '' : _n(perWeek[i]), style: sans(10.5, color: C.muted)),
                        const SizedBox(height: 4),
                        TweenAnimationBuilder<double>(
                          tween: Tween(begin: 0, end: perWeek[i] / peak),
                          duration: Duration(milliseconds: 500 + i * 60),
                          curve: Curves.easeOutCubic,
                          builder: (_, v, _) => Container(height: 4 + 52 * v, decoration: BoxDecoration(color: i == weeks.length - 1 ? C.forest : C.mint, borderRadius: BorderRadius.circular(6))),
                        ),
                        const SizedBox(height: 6),
                        Text('${weeks[i].day}.${weeks[i].month}', style: sans(10, color: C.faint)),
                      ]),
                    ),
                  ),
              ]),
            ),
          ]),
        ),
        Padding(padding: const EdgeInsets.fromLTRB(4, 10, 4, 0), child: Text(l.tr('me.estimate'), style: sans(12, color: C.faint))),
        const SizedBox(height: 26),
        SectionLabel(l.tr('me.history')),
        if (worked.isEmpty)
          Surface(child: Text(l.tr('me.noHistory'), style: sans(14.5, color: C.muted)))
        else
          Surface(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(children: [
              for (var i = 0; i < shown.length; i++) ...[
                if (i > 0) const Divider(indent: 16, endIndent: 16),
                _HistoryRow(shown[i]),
              ],
              if (worked.length > 6) TextButton(onPressed: () => setState(() => _all = !_all), child: Text(_all ? l.tr('me.showLess') : l.tr('me.showAll', {'count': worked.length}))),
            ]),
          ),
        const SizedBox(height: 26),
        Surface(
          padding: const EdgeInsets.fromLTRB(18, 12, 12, 12),
          child: Row(children: [
            Text(l.tr('me.language'), style: sans(15, weight: FontWeight.w500)),
            const Spacer(),
            for (final (code, label) in [('en', 'EN'), ('de', 'DE')])
              Padding(
                padding: const EdgeInsets.only(left: 6),
                child: GestureDetector(
                  onTap: () => s.setLang(code),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(color: s.lang == code ? C.forest : C.forest50, borderRadius: BorderRadius.circular(10)),
                    child: Text(label, style: sans(13, color: s.lang == code ? Colors.white : C.forest, weight: FontWeight.w700)),
                  ),
                ),
              ),
          ]),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(onPressed: s.signOut, icon: const Icon(Icons.logout_rounded, size: 18), label: Text(l.tr('me.signOut'))),
        if (s.backend.isDemo) Padding(padding: const EdgeInsets.only(top: 14), child: Text(l.tr('me.demo'), textAlign: TextAlign.center, style: sans(12, color: C.faint))),
      ],
    );
  }
}

String _n(double v) => v % 1 == 0 ? '${v.toInt()}' : v.toStringAsFixed(1);

class _HistoryRow extends StatelessWidget {
  const _HistoryRow(this.a);
  final Assignment a;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final l = s.l;
    final d = s.data!;
    final tpl = d.template(a.templateId);
    final (bg, _) = toneColors(tpl.tone);
    final items = s.checklist(a);
    final done = items.where((i) => i.$5 != null).length;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(children: [
        Container(width: 4, height: 34, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.day(a.date), style: sans(14.5, weight: FontWeight.w600)),
            const SizedBox(height: 2),
            Row(children: [
              Text('${tpl.start}–${tpl.end}', style: sans(13, color: C.muted)),
              const SizedBox(width: 10),
              Icon(Icons.task_alt_rounded, size: 14, color: done < items.length ? C.bark : C.faint),
              const SizedBox(width: 3),
              Text('$done/${items.length}', style: sans(13, color: done < items.length ? C.bark : C.faint)),
            ]),
          ]),
        ),
        Text(l.money(tpl.hours * s.me.hourlyRate, d.currency), style: sans(15, weight: FontWeight.w600)),
      ]),
    );
  }
}
