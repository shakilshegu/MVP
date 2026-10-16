import 'package:flutter/widgets.dart';

import '../data/backend.dart';
import '../data/dates.dart';
import '../data/models.dart';
import '../data/rules.dart';
import '../l10n.dart';

/// The signed-in staff member and everything the screens need. Screens read this and call
/// its actions; only this class talks to the [Backend].
class AppState extends ChangeNotifier {
  AppState(this.backend);
  final Backend backend;

  String lang = 'en';
  L10n get l => L10n(lang);

  String? employeeId;
  StaffData? data;
  bool busy = false;

  bool get signedIn => employeeId != null && data != null;
  Employee get me => data!.employee(employeeId!);

  void setLang(String value) {
    lang = value;
    notifyListeners();
  }

  /// Returns an error message key, or null when signed in.
  Future<String?> signIn(String email, String password) async {
    busy = true;
    notifyListeners();
    try {
      if (backend is MockBackend) (backend as MockBackend).lang = lang;
      final id = await backend.signIn(email, password);
      if (id == null) return 'signin.unknown';
      data = await backend.load(id);
      employeeId = id;
      return null;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void signOut() {
    employeeId = null;
    data = null;
    notifyListeners();
  }

  void _changed() {
    backend.save(data!);
    notifyListeners();
  }

  // ---------- Reading ----------

  List<Assignment> myShifts({DateTime? from, DateTime? to}) {
    final list = data!.assignments.where((a) => a.employeeId == employeeId && (from == null || !a.date.isBefore(from)) && (to == null || a.date.isBefore(to))).toList();
    list.sort((a, b) => _start(a).compareTo(_start(b)));
    return list;
  }

  DateTime _start(Assignment a) {
    final t = data!.template(a.templateId);
    return shiftSpan(a.date, t.start, t.end).$1;
  }

  (DateTime, DateTime) span(Assignment a) {
    final t = data!.template(a.templateId);
    return shiftSpan(a.date, t.start, t.end);
  }

  /// The shift happening now, or the next one coming up.
  Assignment? get nextShift {
    final now = DateTime.now();
    for (final a in myShifts(from: addDays(today(), -1))) {
      if (span(a).$2.isAfter(now)) return a;
    }
    return null;
  }

  bool isRunning(Assignment a) {
    final (s, e) = span(a);
    final now = DateTime.now();
    return !now.isBefore(s) && now.isBefore(e);
  }

  /// Everyone else on the same shift and department.
  List<Assignment> teammates(Assignment a) => data!.assignments.where((x) => x.id != a.id && sameDay(x.date, a.date) && x.templateId == a.templateId && x.dept == a.dept).toList();

  Employee? leaderOf(Assignment a) {
    if (a.isLeader) return me;
    for (final x in teammates(a)) {
      if (x.isLeader) return data!.employee(x.employeeId);
    }
    return null;
  }

  double hoursThisWeek() => weekHours(data!, employeeId!, today());

  List<OpenSlot> openForMe({int days = 14}) => openSlots(data!, from: today(), to: addDays(today(), days)).where((s) => me.skills.contains(s.dept) && !s.full).toList();

  List<OpenSlot> allOpen({int days = 14}) => openSlots(data!, from: today(), to: addDays(today(), days)).where((s) => me.skills.contains(s.dept) && (!s.full || s.people.any((p) => p.id == employeeId))).toList();

  /// Checklist items and extra tasks for a shift, with tick times.
  List<(String id, String title, String detail, bool extra, DateTime? tick)> checklist(Assignment a) {
    final e = data!.employee(a.employeeId);
    final ticks = data!.ticks[a.id] ?? {};
    return [
      for (final i in e.checklist) (i.id, i.title, i.detail, false, ticks[i.id]),
      for (var k = 0; k < a.tasks.length; k++) ('${a.id}-task-$k', a.tasks[k], '', true, ticks['${a.id}-task-$k']),
    ];
  }

  List<Assignment> worked() => myShifts().where((a) => isWorked(data!, a)).toList().reversed.toList();

  double earned(Iterable<Assignment> list) => list.fold(0.0, (s, a) => s + data!.template(a.templateId).hours * me.hourlyRate);

  // ---------- Actions ----------

  /// Takes an open shift. Returns the problems when it isn't allowed.
  List<Problem> takeShift(OpenSlot slot) {
    final problems = checkTake(data!, me, slot);
    if (problems.isNotEmpty) return problems;
    data!.assignments.add(Assignment(
      id: 'own-${DateTime.now().microsecondsSinceEpoch}',
      employeeId: employeeId!,
      date: slot.date,
      templateId: slot.template.id,
      dept: slot.dept,
      state: data!.selfSelectNeedsApproval ? AssignmentState.requested : AssignmentState.published,
    ));
    _changed();
    return const [];
  }

  void tick(Assignment a, String itemId, bool on) {
    final m = data!.ticks.putIfAbsent(a.id, () => {});
    if (on) {
      m[itemId] = DateTime.now();
    } else {
      m.remove(itemId);
    }
    _changed();
  }

  List<bool> weekAvailability(DateTime week) => weekPattern(data!, me, week);
  bool availabilitySent(DateTime week) => data!.weekAvailability[employeeId]?[weekStart(week)] != null;

  void sendAvailability(DateTime week, List<bool> days) {
    data!.weekAvailability.putIfAbsent(employeeId!, () => {})[weekStart(week)] = List.of(days);
    _changed();
  }

  bool onLeave(DateTime day) => (data!.leave[employeeId] ?? []).any((d) => sameDay(d, day));
}

/// Gives every widget below it access to [AppState] and rebuilds them when it changes.
class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child}) : super(notifier: state);

  static AppState of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;
}
