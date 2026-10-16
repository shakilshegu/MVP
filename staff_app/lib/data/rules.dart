import 'dates.dart';
import 'models.dart';

/// A place on a shift that still needs someone.
class OpenSlot {
  OpenSlot({required this.date, required this.template, required this.dept, required this.filled, required this.needed, required this.people});
  final DateTime date;
  final ShiftTemplate template;
  final String dept;
  final int filled;
  final int needed;

  /// Who is already on it.
  final List<Employee> people;
  bool get full => filled >= needed;
  String get key => '${date.toIso8601String()}|${template.id}|$dept';
}

enum Problem { notTrained, full, already, onLeave, unavailable, overlap, rest, dayMax, weekMax, started }


/// Week availability: that week's own answer if given, otherwise the usual week.
List<bool> weekPattern(StaffData d, Employee e, DateTime week) => d.weekAvailability[e.id]?[weekStart(week)] ?? e.availability;

double weekHours(StaffData d, String employeeId, DateTime week) {
  final ws = weekStart(week), we = addDays(ws, 7);
  return d.assignments
      .where((a) => a.employeeId == employeeId && !a.date.isBefore(ws) && a.date.isBefore(we))
      .fold(0.0, (sum, a) => sum + d.template(a.templateId).hours);
}

/// Places still open from now on, with announcement extras added, sorted by time.
List<OpenSlot> openSlots(StaffData d, {required DateTime from, required DateTime to}) {
  final out = <OpenSlot>[];
  final now = DateTime.now();
  for (var day = dayOf(from); !day.isAfter(to); day = addDays(day, 1)) {
    for (final tpl in d.templates) {
      final (start, _) = shiftSpan(day, tpl.start, tpl.end);
      if (start.isBefore(now)) continue;
      for (final dept in d.departments) {
        var needed = tpl.needed[dept.id] ?? 0;
        for (final an in d.announcements) {
          if (sameDay(an.date, day) && an.dept == dept.id && an.start != null && toMin(an.start!) >= tpl.startMin && toMin(an.start!) < tpl.endMin) needed += an.extraStaff;
        }
        if (needed == 0) continue;
        final on = d.assignments.where((a) => sameDay(a.date, day) && a.templateId == tpl.id && a.dept == dept.id).toList();
        out.add(OpenSlot(date: day, template: tpl, dept: dept.id, filled: on.length, needed: needed, people: [for (final a in on) d.employee(a.employeeId)]));
      }
    }
  }
  out.sort((a, b) => shiftSpan(a.date, a.template.start, a.template.end).$1.compareTo(shiftSpan(b.date, b.template.start, b.template.end).$1));
  return out;
}

/// What stops [e] from taking [slot]; empty when they can.
List<Problem> checkTake(StaffData d, Employee e, OpenSlot slot) {
  final out = <Problem>[];
  final (s, end) = shiftSpan(slot.date, slot.template.start, slot.template.end);
  if (s.isBefore(DateTime.now())) out.add(Problem.started);
  if (!e.skills.contains(slot.dept)) out.add(Problem.notTrained);
  if (slot.people.any((p) => p.id == e.id)) return [...out, Problem.already];
  if (slot.full) out.add(Problem.full);
  if ((d.leave[e.id] ?? []).any((x) => sameDay(x, slot.date))) {
    out.add(Problem.onLeave);
  } else if (!weekPattern(d, e, slot.date)[slot.date.weekday - 1]) {
    out.add(Problem.unavailable);
  }
  var dayHours = slot.template.hours;
  for (final a in d.assignments.where((a) => a.employeeId == e.id && (a.date.difference(slot.date).inDays).abs() <= 1)) {
    final t = d.template(a.templateId);
    final (s2, e2) = shiftSpan(a.date, t.start, t.end);
    if (s.isBefore(e2) && s2.isBefore(end)) {
      out.add(Problem.overlap);
      continue;
    }
    final gap = s.isAfter(e2) ? s.difference(e2) : s2.difference(end);
    if (gap.inMinutes < 11 * 60) out.add(Problem.rest);
    if (sameDay(a.date, slot.date)) dayHours += t.hours;
  }
  if (dayHours > 10) out.add(Problem.dayMax);
  if (weekHours(d, e.id, slot.date) + slot.template.hours > e.maxHours) out.add(Problem.weekMax);
  return out.toSet().toList();
}

/// When staff must have entered availability for the week starting [week].
DateTime availabilityDeadline(StaffData d, DateTime week) {
  final day = addDays(weekStart(week), d.deadlineWeekday - 7);
  return day.add(Duration(minutes: toMin(d.deadlineTime)));
}

/// Shifts already worked: published and finished.
bool isWorked(StaffData d, Assignment a) {
  if (a.state != AssignmentState.published) return false;
  final t = d.template(a.templateId);
  return shiftSpan(a.date, t.start, t.end).$2.isBefore(DateTime.now());
}
