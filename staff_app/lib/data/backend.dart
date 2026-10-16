import 'mock_data.dart';
import 'models.dart';

/// Where the staff app's data comes from. Same idea as restaurant-scheduler/src/data/backend.ts:
/// screens use [AppState], never this directly, so switching from demo data to the real API
/// doesn't touch any screen.
abstract class Backend {
  bool get isDemo;

  /// Signs in and returns the employee id, or null when the email isn't on any team.
  Future<String?> signIn(String email, String password);

  /// Everything the signed-in employee may see.
  Future<StaffData> load(String employeeId);

  /// Called after every change with the new data.
  Future<void> save(StaffData data);
}

/// Demo data kept in memory, built from the same restaurants as the web demo.
class MockBackend implements Backend {
  StaffData? _data;

  /// Language of the demo restaurant's content (checklists, announcements), set at sign-in.
  String lang = 'en';

  @override
  bool get isDemo => true;

  @override
  Future<String?> signIn(String email, String password) async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    _data ??= buildDemoData(lang);
    final e = email.trim().toLowerCase();
    for (final emp in _data!.employees) {
      if (emp.email == e) return emp.id;
    }
    return null;
  }

  @override
  Future<StaffData> load(String employeeId) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    return _data ??= buildDemoData(lang);
  }

  @override
  Future<void> save(StaffData data) async {
    _data = data;
  }
}

// The real API arrives with the backend. It will implement [Backend] over HTTP:
// class ApiBackend implements Backend { ... }
