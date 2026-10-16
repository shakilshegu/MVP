import 'package:flutter/material.dart';

import 'data/models.dart';

/// Rota staff palette: cool and quiet, green for what matters, brass for leaders and news.
class C {
  static const bg = Color(0xFFF2F5F3);
  static const surface = Colors.white;
  static const ink = Color(0xFF14211B);
  static const muted = Color(0xFF66716B);
  static const faint = Color(0xFF9AA49E);
  static const line = Color(0xFFE4E9E6);
  static const forest = Color(0xFF1E4034);
  static const forestDeep = Color(0xFF173329);
  static const forest600 = Color(0xFF2A5646);
  static const mint = Color(0xFFCFE3D7);
  static const forest50 = Color(0xFFEAF1ED);
  static const brass = Color(0xFFC08A2E);
  static const brass50 = Color(0xFFF7EEDD);
  static const brassInk = Color(0xFF6E4A10);
  static const danger = Color(0xFFB42318);
  static const danger50 = Color(0xFFFCECEA);
  static const warn = Color(0xFF8A5300);
  static const warn50 = Color(0xFFFFF3DA);

  // Kept for screens that name them.
  static const sage = bg;
  static const sageDark = Color(0xFFCBD3CE);
  static const paper = Color(0xFFF7F9F8);
  static const forest100 = mint;
  static const bark = Color(0xFF6B3A33);
  static const bark50 = Color(0xFFF6ECEA);
}

/// Shift colours (background, text) by time of day.
(Color, Color) toneColors(Tone t) => switch (t) {
      Tone.morning => (const Color(0xFFF3E2A9), const Color(0xFF5E4407)),
      Tone.day => (const Color(0xFFD0E5D7), const Color(0xFF1E4034)),
      Tone.evening => (const Color(0xFFEDD3C9), const Color(0xFF54302C)),
      Tone.night => (const Color(0xFFD4D9EC), const Color(0xFF2C3457)),
    };

const kSans = 'Figtree';
const kSerif = 'InstrumentSerif';
const _tabular = [FontFeature.tabularFigures()];

/// Display type for times and big numbers.
TextStyle serif(double size, {Color color = C.ink, double height = 1.0}) => TextStyle(fontFamily: kSerif, fontSize: size, height: height, color: color, letterSpacing: size > 30 ? -0.6 : -0.2);

/// UI text. Figures line up (hours, money, times) and small sizes get a touch more spacing.
TextStyle sans(double size, {Color color = C.ink, FontWeight weight = FontWeight.w400, double height = 1.35}) => TextStyle(
      fontFamily: kSans,
      fontSize: size,
      color: color,
      fontWeight: weight,
      height: height,
      letterSpacing: size <= 13 ? 0.15 : (size >= 20 ? -0.2 : 0),
      fontFeatures: _tabular,
    );

ThemeData buildTheme() {
  final base = ThemeData(useMaterial3: true, fontFamily: kSans, colorScheme: ColorScheme.fromSeed(seedColor: C.forest, primary: C.forest, surface: C.surface));
  return base.copyWith(
    scaffoldBackgroundColor: C.bg,
    splashFactory: InkSparkle.splashFactory,
    textTheme: base.textTheme.apply(fontFamily: kSans, bodyColor: C.ink, displayColor: C.ink),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: C.forest,
        foregroundColor: Colors.white,
        disabledBackgroundColor: C.line,
        disabledForegroundColor: C.faint,
        minimumSize: const Size.fromHeight(54),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: sans(16, weight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: C.ink,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: C.line),
        backgroundColor: C.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: sans(15, weight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: C.forest, textStyle: sans(14, weight: FontWeight.w600))),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: C.surface,
      labelStyle: sans(15, color: C.muted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.forest, width: 1.6)),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: C.ink,
      contentTextStyle: sans(14, color: Colors.white, weight: FontWeight.w500),
      behavior: SnackBarBehavior.floating,
      insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(backgroundColor: C.surface, showDragHandle: true, dragHandleColor: C.line, shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28)))),
    dividerTheme: const DividerThemeData(color: C.line, space: 1, thickness: 1),
    switchTheme: SwitchThemeData(thumbColor: const WidgetStatePropertyAll(Colors.white), trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? C.forest : C.line), trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent)),
  );
}
