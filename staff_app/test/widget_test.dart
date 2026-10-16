import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:rota_staff/data/backend.dart';
import 'package:rota_staff/data/rules.dart';
import 'package:rota_staff/state/app_state.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('en_GB');
  });

  test('demo staff can sign in and see their shifts', () async {
    final s = AppState(MockBackend());
    expect(await s.signIn('lina@harborhouse.co', 'x'), isNull);
    expect(s.me.name, 'Lina Haddad');
    expect(s.myShifts(), isNotEmpty);
  });

  test('unknown email is refused', () async {
    final s = AppState(MockBackend());
    expect(await s.signIn('nobody@example.com', 'x'), 'signin.unknown');
  });

  test('taking an open shift follows the rules', () async {
    final s = AppState(MockBackend());
    await s.signIn('lina@harborhouse.co', 'x');
    final slots = s.openForMe();
    final ok = slots.where((x) => checkTake(s.data!, s.me, x).isEmpty).toList();
    if (ok.isNotEmpty) {
      final before = s.myShifts().length;
      expect(s.takeShift(ok.first), isEmpty);
      expect(s.myShifts().length, before + 1);
      // Taking the same shift again is refused.
      final again = s.openForMe().where((x) => x.key == ok.first.key);
      expect(again.isEmpty || checkTake(s.data!, s.me, again.first).isNotEmpty, isTrue);
    }
  });

  test('ticking a checklist item records it, unticking removes it', () async {
    final s = AppState(MockBackend());
    await s.signIn('lina@harborhouse.co', 'x');
    final a = s.myShifts().first;
    final id = s.checklist(a).first.$1;
    s.tick(a, id, true);
    expect(s.checklist(a).first.$5, isNotNull);
    s.tick(a, id, false);
    expect(s.checklist(a).first.$5, isNull);
  });

  test('availability for a week is sent and kept', () async {
    final s = AppState(MockBackend());
    await s.signIn('lina@harborhouse.co', 'x');
    final week = DateTime.now().add(const Duration(days: 14));
    expect(s.availabilitySent(week), isFalse);
    final days = List.of(s.weekAvailability(week))..[2] = false;
    s.sendAvailability(week, days);
    expect(s.availabilitySent(week), isTrue);
    expect(s.weekAvailability(week)[2], isFalse);
  });
}
