DateTime dayOf(DateTime d) => DateTime(d.year, d.month, d.day);
DateTime today() => dayOf(DateTime.now());

/// Monday of the week containing [d].
DateTime weekStart(DateTime d) => dayOf(d).subtract(Duration(days: d.weekday - 1));
List<DateTime> weekDays(DateTime start) => List.generate(7, (i) => DateTime(start.year, start.month, start.day + i));
DateTime addDays(DateTime d, int n) => DateTime(d.year, d.month, d.day + n);
bool sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

int toMin(String t) {
  final p = t.split(':');
  return int.parse(p[0]) * 60 + int.parse(p[1]);
}

/// A shift's start and end as absolute times.
(DateTime, DateTime) shiftSpan(DateTime date, String start, String end) {
  final s = date.add(Duration(minutes: toMin(start)));
  var e = date.add(Duration(minutes: toMin(end)));
  if (!e.isAfter(s)) e = e.add(const Duration(days: 1));
  return (s, e);
}
