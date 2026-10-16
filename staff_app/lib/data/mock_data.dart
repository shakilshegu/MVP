import 'dart:math';

import 'dates.dart';
import 'models.dart';

/// Demo restaurant: Harbor House in Hamburg, the same team as the web demo.
/// Restaurant content (checklists, announcements, positions) comes in [lang].
StaffData buildDemoData([String lang = 'en']) {
  final de = lang == 'de';
  String t(String en, String deText) => de ? deText : en;

  const bar = 'c1-bar', service = 'c1-service', kitchen = 'c1-kitchen';
  final departments = [
    Department(id: bar, name: 'Bar', color: 0xFFB7791F, needsLeader: false),
    Department(id: service, name: 'Service', color: 0xFF2F7A64, needsLeader: true),
    Department(id: kitchen, name: t('Kitchen', 'Küche'), color: 0xFF8A4B42, needsLeader: true),
  ];
  final templates = [
    ShiftTemplate(id: 't1', name: t('Morning', 'Früh'), start: '06:00', end: '14:00', tone: Tone.morning, needed: {service: 1, kitchen: 1}),
    ShiftTemplate(id: 't2', name: t('Day', 'Tag'), start: '10:00', end: '18:00', tone: Tone.day, needed: {bar: 1, service: 1, kitchen: 1}),
    ShiftTemplate(id: 't3', name: t('Evening', 'Spät'), start: '16:00', end: '23:00', tone: Tone.evening, needed: {bar: 1, service: 2, kitchen: 2}),
    ShiftTemplate(id: 't4', name: t('Night', 'Nacht'), start: '22:00', end: '02:00', tone: Tone.night, needed: {bar: 1, kitchen: 1}),
  ];

  List<ChecklistItem> items(String key, List<(String, String)> rows) => [for (var i = 0; i < rows.length; i++) ChecklistItem(id: '$key-$i', title: rows[i].$1, detail: rows[i].$2)];
  final barList = items('bar', de
      ? [('Bestand und Kühlung prüfen', 'Spirituosen, Filler, Eis und Garnituren vor dem Öffnen auffüllen; Engpässe der Schichtleitung melden'), ('Bar vorbereiten', 'Theke abwischen, Gläser polieren, Matten und Werkzeug bereitlegen'), ('Kasse bereit', 'Wechselgeld zählen, Kartenterminal prüfen'), ('Bar schließen', 'Zapfanlage und Maschinen reinigen, Eiswanne leeren, offene Flaschen verstauen, Alkohol abschließen')]
      : [('Check stock and fridges', 'Restock spirits, mixers, ice and garnishes before opening; tell the shift leader what is running low'), ('Set up the bar', 'Wipe counters, polish glasses, lay out mats and tools'), ('Till ready', 'Count the float and check the card terminal'), ('Close the bar', 'Clean taps and machines, empty the ice well, store open bottles, lock the alcohol')]);
  final serviceList = items('service', de
      ? [('Tische eindecken', 'Besteck, Gläser, Servietten und Karten auf jedem Tisch vor der Öffnung'), ('Reservierungen prüfen', 'Reservierungsliste lesen und die Platzierung mit der Schichtleitung planen'), ('Stationen auffüllen', 'Menagen, Wasser, Beilagenteller und Besteck an jeder Servicestation'), ('Gastraum schließen', 'Tische abräumen und abwischen, Stühle hochstellen, Trinkgeld und Notizen übergeben')]
      : [('Set up tables', 'Cutlery, glasses, napkins and menus on every table before doors open'), ('Check reservations', 'Read the booking list and plan seating with the shift leader'), ('Refill stations', 'Condiments, water, side plates and cutlery at every service station'), ('Close the floor', 'Clear and wipe tables, stack chairs, hand over tips and notes')]);
  final kitchenList = items('kitchen', de
      ? [('Mise en place', 'Zutaten für den eigenen Posten vor dem Service vorbereiten und beschriften'), ('Kühltemperaturen', 'Kühl- und Tiefkühltemperaturen ins Protokoll eintragen (max. 7 °C / −18 °C)'), ('Sauber arbeiten', 'Posten, Bretter und Messer während des Service sauber halten'), ('Küche schließen', 'Reste beschriften und einlagern, Flächen und Boden reinigen, Geräte ausschalten')]
      : [('Mise en place', 'Prepare and label the ingredients for your station before service'), ('Fridge temperatures', 'Write fridge and freezer temperatures in the log (max 7 °C / −18 °C)'), ('Clean as you go', 'Keep your station, boards and knives clean during service'), ('Close the kitchen', 'Store and date leftovers, clean surfaces and floor, switch off equipment')]);

  const colors = [0xFF2F7A64, 0xFF3A6F9E, 0xFFB7791F, 0xFF8A4B42, 0xFF7A5AA6, 0xFFC2577A, 0xFF4F8A3A, 0xFFB5652B, 0xFF2E7D8C, 0xFF6B6F2A];
  var ci = 0;
  Employee emp(String id, String name, String dept, String posEn, String posDe, int max, double rate, List<int> off, {List<String> also = const []}) {
    final list = dept == bar ? barList : dept == service ? serviceList : kitchenList;
    return Employee(
      id: id,
      name: name,
      email: '${name.split(' ').first.toLowerCase()}@harborhouse.co',
      position: t(posEn, posDe),
      dept: dept,
      skills: [dept, ...also],
      maxHours: max,
      hourlyRate: rate,
      color: colors[ci++ % colors.length],
      availability: List.generate(7, (i) => !off.contains(i)),
      checklist: list,
    );
  }

  final employees = [
    emp('e1', 'Marco Bellini', bar, 'Head bartender', 'Barchef', 40, 18.5, [0]),
    emp('e2', 'Aisha Khan', bar, 'Bartender', 'Barkeeper', 32, 15.5, [2]),
    emp('e3', 'Tom Lindqvist', bar, 'Barback', 'Barhilfe', 24, 14, [5, 6]),
    emp('e4', 'Zoe Achterberg', bar, 'Bartender', 'Barkeeper', 30, 15.5, [1]),
    emp('e40', 'Lukas Weber', bar, 'Bartender', 'Barkeeper', 32, 15.5, [3]),
    emp('e5', 'Sofia Alvarez', service, 'Floor lead', 'Serviceleitung', 40, 18, [6], also: [bar]),
    emp('e6', 'Jonah Weiss', service, 'Server', 'Servicekraft', 32, 14.5, [3]),
    emp('e7', 'Lina Haddad', service, 'Server', 'Servicekraft', 30, 14.5, []),
    emp('e8', 'Kwame Mensah', service, 'Server', 'Servicekraft', 36, 14.5, [0, 1], also: [bar]),
    emp('e9', 'Mei Tanaka', service, 'Host', 'Empfang', 24, 14.5, [4]),
    emp('e41', 'Ana Petrović', service, 'Server', 'Servicekraft', 30, 14.5, [0], also: [bar]),
    emp('e42', 'Jonas Richter', service, 'Runner', 'Runner', 28, 14, [2]),
    emp('e11', 'Elena Rostova', kitchen, 'Sous chef', 'Sous-Chef', 45, 20, [0]),
    emp('e12', 'Dario Fontana', kitchen, 'Line cook', 'Koch', 40, 16, [2]),
    emp('e13', 'Hana Kim', kitchen, 'Line cook', 'Koch', 38, 16, [6]),
    emp('e14', 'Samuel Osei', kitchen, 'Prep cook', 'Beikoch', 32, 14.5, [], also: [service]),
    emp('e15', 'Nora Byrne', kitchen, 'Pastry chef', 'Patissier', 30, 17, [5, 6]),
    emp('e16', 'Ibrahim Farah', kitchen, 'Porter', 'Küchenhilfe', 28, 14, [3]),
    emp('e43', 'Mira Schulz', kitchen, 'Line cook', 'Koch', 36, 16, [1]),
  ];

  // Shifts: five past weeks, this week and next. Some upcoming slots are left open so staff can pick them.
  final rnd = Random(7);
  final now = today();
  final ws = weekStart(now);
  final assignments = <Assignment>[];
  var n = 0;
  final hoursByWeek = <String, double>{};
  final lastEnd = <String, DateTime>{};
  for (var w = -5; w <= 1; w++) {
    for (final date in weekDays(addDays(ws, w * 7))) {
      final busy = <String>{};
      for (final tpl in templates) {
        for (final entry in tpl.needed.entries) {
          var need = entry.value;
          // Leave gaps in the future so the open-shifts list has something in it.
          if (!date.isBefore(now) && rnd.nextDouble() < (w == 1 ? 0.45 : 0.25)) need -= 1;
          final pool = employees.where((e) => e.skills.contains(entry.key)).toList()..shuffle(rnd);
          final placed = <Assignment>[];
          for (final e in pool) {
            if (need <= 0) break;
            if (busy.contains(e.id) || !e.availability[date.weekday - 1]) continue;
            final key = '${e.id}|${weekStart(date)}';
            if ((hoursByWeek[key] ?? 0) + tpl.hours > e.maxHours) continue;
            final (s, end) = shiftSpan(date, tpl.start, tpl.end);
            final prev = lastEnd[e.id];
            if (prev != null && s.difference(prev).inMinutes < 11 * 60) continue;
            // Keep the demo login (Lina) around 20 hours, so she has room to pick up open shifts.
            if (e.id == 'e7' && (hoursByWeek[key] ?? 0) >= 16) continue;
            final a = Assignment(id: 'a${n++}', employeeId: e.id, date: date, templateId: tpl.id, dept: entry.key);
            assignments.add(a);
            placed.add(a);
            busy.add(e.id);
            hoursByWeek[key] = (hoursByWeek[key] ?? 0) + tpl.hours;
            lastEnd[e.id] = end;
            need--;
          }
          // A leader on every staffed shift in departments that need one: the best-paid person.
          if (departments.firstWhere((d) => d.id == entry.key).needsLeader && placed.isNotEmpty) {
            placed.sort((a, b) => employees.firstWhere((e) => e.id == b.employeeId).hourlyRate.compareTo(employees.firstWhere((e) => e.id == a.employeeId).hourlyRate));
            placed.first.isLeader = true;
          }
        }
      }
    }
  }

  // Tasks a manager added to some of Lina's upcoming shifts.
  for (final a in assignments.where((a) => a.employeeId == 'e7' && !a.date.isBefore(now)).take(2)) {
    a.tasks.add(t('Polish the wine glasses for Friday', 'Weingläser für Freitag polieren'));
  }

  // Checklist ticks on shifts already worked, as staff would have recorded them.
  final ticks = <String, Map<String, DateTime>>{};
  for (final a in assignments.where((a) => a.date.isBefore(now))) {
    final e = employees.firstWhere((x) => x.id == a.employeeId);
    final tpl = templates.firstWhere((x) => x.id == a.templateId);
    final m = <String, DateTime>{};
    for (var i = 0; i < e.checklist.length; i++) {
      if (rnd.nextDouble() < 0.1) continue;
      m[e.checklist[i].id] = a.date.add(Duration(minutes: tpl.startMin + ((i + 1) * tpl.hours * 60 / (e.checklist.length + 1)).round()));
    }
    ticks[a.id] = m;
  }

  final fri = addDays(ws, 4);
  return StaffData(
    companyName: 'Harbor Group',
    branchName: 'Harbor House',
    city: 'Hamburg',
    currency: 'EUR',
    departments: departments,
    templates: templates,
    employees: employees,
    assignments: assignments,
    announcements: [
      Announcement(id: 'an1', date: fri.isBefore(now) ? addDays(fri, 7) : fri, start: '19:00', end: '23:30', title: t('Private party — 40 guests', 'Geschlossene Gesellschaft – 40 Gäste'), body: t('Birthday dinner in the main room with a set menu and drinks package. Black shirts, please. Briefing at 18:30.', 'Geburtstagsessen im Hauptraum mit festem Menü und Getränkepauschale. Bitte schwarze Hemden. Briefing um 18:30.'), extraStaff: 2, dept: service),
      Announcement(id: 'an2', date: addDays(ws, 10), start: '18:00', end: '21:00', title: t('Wine tasting evening', 'Weinprobe am Abend'), body: t('A local winery presents six wines. The bar team pours; service helps set out glasses from 17:00.', 'Ein Weingut aus der Region stellt sechs Weine vor. Die Bar schenkt aus, der Service stellt ab 17:00 die Gläser bereit.'), extraStaff: 1, dept: bar),
    ],
    leave: {
      'e7': [addDays(ws, 19), addDays(ws, 20)],
    },
    weekAvailability: {},
    ticks: ticks,
    deadlineWeekday: 6,
    deadlineTime: '20:00',
    leadersSeeReport: true,
    selfSelectNeedsApproval: false,
  );
}
