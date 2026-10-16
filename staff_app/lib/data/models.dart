// Data model for the staff app. Mirrors restaurant-scheduler/src/lib/types.ts so both apps
// can share one backend later.

enum Tone { morning, day, evening, night }

enum AssignmentState { published, requested }

class Department {
  const Department({required this.id, required this.name, required this.color, required this.needsLeader});
  final String id;
  final String name;
  final int color;
  final bool needsLeader;
}

class ShiftTemplate {
  const ShiftTemplate({required this.id, required this.name, required this.start, required this.end, required this.tone, required this.needed});
  final String id;
  final String name;
  final String start; // 'HH:MM'
  final String end;
  final Tone tone;

  /// Staff needed per department id.
  final Map<String, int> needed;

  double get hours {
    var m = _min(end) - _min(start);
    if (m <= 0) m += 24 * 60;
    return m / 60;
  }

  int get startMin => _min(start);
  int get endMin => _min(end) <= _min(start) ? _min(end) + 24 * 60 : _min(end);
}

int _min(String t) {
  final p = t.split(':');
  return int.parse(p[0]) * 60 + int.parse(p[1]);
}

class ChecklistItem {
  const ChecklistItem({required this.id, required this.title, required this.detail});
  final String id;
  final String title;
  final String detail;
}

class Employee {
  const Employee({
    required this.id,
    required this.name,
    required this.email,
    required this.position,
    required this.dept,
    required this.skills,
    required this.maxHours,
    required this.hourlyRate,
    required this.color,
    required this.availability,
    required this.checklist,
  });
  final String id;
  final String name;
  final String email;
  final String position;
  final String dept;
  final List<String> skills;
  final int maxHours;
  final double hourlyRate;
  final int color;

  /// Usual week, Monday first.
  final List<bool> availability;
  final List<ChecklistItem> checklist;

  String get first => name.split(' ').first;
  String get initials => name.split(' ').map((p) => p[0]).take(2).join();
}

class Assignment {
  Assignment({
    required this.id,
    required this.employeeId,
    required this.date,
    required this.templateId,
    required this.dept,
    this.state = AssignmentState.published,
    this.isLeader = false,
    List<String>? tasks,
  }) : tasks = tasks ?? [];
  final String id;
  final String employeeId;
  final DateTime date; // midnight, local
  final String templateId;
  final String dept;
  AssignmentState state;
  bool isLeader;

  /// Extra tasks a manager added to this shift.
  final List<String> tasks;
}

class Announcement {
  const Announcement({required this.id, required this.date, required this.title, required this.body, this.start, this.end, this.extraStaff = 0, this.dept});
  final String id;
  final DateTime date;
  final String title;
  final String body;
  final String? start;
  final String? end;
  final int extraStaff;
  final String? dept;
}

/// Everything the signed-in staff member can see.
class StaffData {
  StaffData({
    required this.companyName,
    required this.branchName,
    required this.city,
    required this.currency,
    required this.departments,
    required this.templates,
    required this.employees,
    required this.assignments,
    required this.announcements,
    required this.leave,
    required this.weekAvailability,
    required this.ticks,
    required this.deadlineWeekday,
    required this.deadlineTime,
    required this.leadersSeeReport,
    required this.selfSelectNeedsApproval,
  });
  final String companyName;
  final String branchName;
  final String city;
  final String currency;
  final List<Department> departments;
  final List<ShiftTemplate> templates;
  final List<Employee> employees;
  final List<Assignment> assignments;
  final List<Announcement> announcements;

  /// employeeId → approved leave days.
  final Map<String, List<DateTime>> leave;

  /// employeeId → week start → Mon..Sun availability for that week.
  final Map<String, Map<DateTime, List<bool>>> weekAvailability;

  /// assignmentId → ticked checklist/task ids → time ticked.
  final Map<String, Map<String, DateTime>> ticks;

  /// Staff submit next week's availability by this weekday (0 = Mon) of the week before.
  final int deadlineWeekday;
  final String deadlineTime;
  final bool leadersSeeReport;

  /// When true, picking an open shift is a request a manager approves; otherwise first come, first served.
  final bool selfSelectNeedsApproval;

  Department dept(String id) => departments.firstWhere((d) => d.id == id);
  ShiftTemplate template(String id) => templates.firstWhere((t) => t.id == id);
  Employee employee(String id) => employees.firstWhere((e) => e.id == id);
}
