import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'data/backend.dart';
import 'screens/shell.dart';
import 'screens/sign_in.dart';
import 'state/app_state.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('en_GB');
  await initializeDateFormatting('de_DE');
  // Demo data for now; swap in the API backend when it exists.
  runApp(RotaStaffApp(state: AppState(MockBackend())));
}

class RotaStaffApp extends StatelessWidget {
  const RotaStaffApp({super.key, required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: state,
      child: Builder(builder: (context) {
        final s = AppScope.of(context);
        return MaterialApp(
          title: 'Rota',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(),
          scrollBehavior: const _SmoothScroll(),
          // Respect the phone's text size, but cap it so layouts stay intact.
          builder: (context, child) {
            final mq = MediaQuery.of(context);
            return MediaQuery(data: mq.copyWith(textScaler: mq.textScaler.clamp(minScaleFactor: 0.9, maxScaleFactor: 1.3)), child: child!);
          },
          home: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: s.signedIn ? const Shell(key: ValueKey('app')) : const SignInScreen(key: ValueKey('signin')),
          ),
        );
      }),
    );
  }
}

/// Natural, bouncy scrolling on every platform, without the Android glow.
class _SmoothScroll extends MaterialScrollBehavior {
  const _SmoothScroll();

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) => const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());

  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) => child;
}
