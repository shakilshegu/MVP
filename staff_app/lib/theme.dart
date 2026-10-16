import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'data/models.dart';

/// Rota brand colours: the same as the web app and landing page.
class C {
  static const forest = Color(0xFF1E4034);
  static const forest600 = Color(0xFF2A5646);
  static const forest100 = Color(0xFFDCE8E0);
  static const forest50 = Color(0xFFEEF3EF);
  static const sage = Color(0xFFDDE5DE);
  static const sageDark = Color(0xFFC4CEC7);
  static const paper = Color(0xFFF7F8F6);
  static const ink = Color(0xFF17221D);
  static const muted = Color(0xFF626C66);
  static const line = Color(0xFFE2E7E3);
  static const bark = Color(0xFF54302C);
  static const bark50 = Color(0xFFF6EEEC);
  static const brass = Color(0xFFB7791F);
  static const warn = Color(0xFF8A5300);
  static const warn50 = Color(0xFFFFF4DC);
  static const danger = Color(0xFFB42318);
}

/// Shift colours (background, text) by time of day.
(Color, Color) toneColors(Tone t) => switch (t) {
      Tone.morning => (const Color(0xFFF4E3AE), const Color(0xFF654A08)),
      Tone.day => (const Color(0xFFD2E6D8), const Color(0xFF1E4034)),
      Tone.evening => (const Color(0xFFEDD5CC), const Color(0xFF54302C)),
      Tone.night => (const Color(0xFFD6DAEA), const Color(0xFF2C3457)),
    };

TextStyle serif(double size, {Color color = C.forest}) => GoogleFonts.instrumentSerif(fontSize: size, height: 1.05, color: color);

ThemeData buildTheme() {
  final base = ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: C.forest, primary: C.forest, surface: Colors.white));
  return base.copyWith(
    scaffoldBackgroundColor: C.sage,
    textTheme: base.textTheme.apply(fontFamily: GoogleFonts.instrumentSans().fontFamily, bodyColor: C.ink, displayColor: C.ink),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: C.forest,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.instrumentSans(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: C.forest,
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(color: C.line),
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.instrumentSans(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: C.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: C.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: C.forest, width: 1.6)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: C.forest50,
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith((s) => GoogleFonts.instrumentSans(fontSize: 12, fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500, color: s.contains(WidgetState.selected) ? C.forest : C.muted)),
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(color: s.contains(WidgetState.selected) ? C.forest : C.muted)),
    ),
    snackBarTheme: SnackBarThemeData(backgroundColor: C.ink, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
    dividerTheme: const DividerThemeData(color: C.line, space: 1),
  );
}
