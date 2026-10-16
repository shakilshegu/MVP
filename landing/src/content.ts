// All page copy lives here, in English and German, so wording can be changed in one place.

export type Lang = 'en' | 'de'

export const site = {
  /** Link to the Rota app. Set NEXT_PUBLIC_APP_URL when deploying; until then the demo button opens an email. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
  /** Contact address for demos and sales. Replace with the real one. */
  email: 'hello@rota.app',
  price: 65,
}

const en = {
  meta: {
    title: 'Rota — Staff scheduling for restaurants',
    description: 'Plan the week, cover every shift and keep your team informed. Rota checks German labour rules for you. €65 per month per restaurant.',
  },
  nav: { skip: 'Skip to content', features: 'How it works', pricing: 'Pricing', faq: 'Questions', demo: 'Open the live demo', lang: 'Deutsch', langHref: '/de' },
  hero: {
    title: 'Every shift covered before the first ticket prints.',
    lead: 'Rota is the weekly rota for restaurants. Plan Bar, Service and Kitchen in one place, let it check the rules, and tell only the people whose shifts changed.',
    primary: 'Open the live demo',
    secondary: 'See the price',
    note: '€65 a month per restaurant. Everything included.',
    board: { title: 'Harbor House', week: 'Week 42', covered: 'covered', open: 'Open', published: 'Published, 6 people notified', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], shifts: ['Morning', 'Evening', 'Night'] },
  },
  week: {
    title: 'A week in your restaurant, with Rota',
    lead: 'Rota follows the way a restaurant week actually goes. Here is what that looks like for a manager.',
    days: [
      {
        day: 'Mon',
        title: 'Plan the whole week in one go',
        body: 'Every department and shift on one screen. Copy last week, then click an open slot: Rota suggests the best person first, with their hours and why they fit. Or let auto-fill staff the gaps as drafts you can check.',
        img: 'schedule',
        alt: 'The weekly schedule with Bar, Service and Kitchen, open slots and the weather for each day',
      },
      {
        day: 'Wed',
        title: 'Someone calls in sick',
        body: 'Open the shift and see who is free, who prefers evenings and who is close to their weekly limit. People on holiday or without enough rest are flagged before you pick them.',
        img: 'fill-panel',
        alt: 'The panel for filling a shift, with the best matches and hours for each person',
      },
      {
        day: 'Thu',
        title: 'Publish, and only bother the right people',
        body: 'Changes stay as drafts until you publish. Review every change in one list, undo what you need, and Rota tells only the people whose shifts changed.',
        img: 'review',
        alt: 'Review and publish, listing each change and who will be notified',
      },
      {
        day: 'Fri',
        title: 'A private party for 40',
        body: 'Add an announcement with the time, the details and two extra people for Service. The extra places show up as open slots on the schedule, next to the weather for that evening.',
        img: 'announcements',
        alt: 'Announcements for a private party and a wine tasting, with extra staff needed',
      },
      {
        day: 'Sat',
        title: 'After closing, see what got done',
        body: 'Every person has a checklist for their shift. The daily report shows what was ticked off, by whom and when, and highlights what was missed. Download it as a PDF.',
        img: 'report',
        alt: 'The daily report showing checklist tasks done and missed for each shift',
      },
    ],
  },
  rules: {
    title: 'German labour rules, checked on every shift',
    lead: 'Each time you add or move someone, Rota checks these for you. You can still decide, and every exception is recorded.',
    items: [
      ['11 hours of rest', 'between the end of one shift and the start of the next'],
      ['10 hours a day', 'at most, across all shifts that day'],
      ['Weekly maximum', 'each person’s own limit of hours per week'],
      ['Holidays and time off', 'approved leave and the days people can’t work'],
      ['No double bookings', 'not even across two branches'],
      ['A shift leader', 'on every shift in departments that need one'],
    ],
  },
  more: {
    title: 'Also in Rota',
    items: [
      ['Availability', 'Usual weekly pattern, changes for a single week, and hours like 17:00–23:00.'],
      ['Leave requests', 'Approve or decline in one click, with a warning if shifts clash.'],
      ['Team profiles', 'Departments, hours, pay, and earnings history for each person.'],
      ['Weather per shift', 'The forecast for each shift’s hours, for planning the terrace.'],
      ['Several branches', 'Every location in one account, with managers per branch.'],
      ['Printable rota', 'A clean PDF of the week for the staff room wall.'],
      ['On the phone', 'Works in the browser on any phone or tablet, no install needed.'],
      ['English and German', 'Switch language at any time; the whole app is translated.'],
      ['Permissions', 'Decide what managers may do, or let them send changes for approval.'],
    ],
  },
  roles: {
    title: 'Made for the people who run the restaurant',
    items: [
      ['Owners', 'See every branch, set what managers may do, and keep an eye on hours and costs.'],
      ['Managers', 'Plan, swap and publish shifts, handle leave and run the day from one screen.'],
      ['Staff', 'An app for staff to see their shifts, set availability and tick off checklists is coming next.'],
    ],
  },
  pricing: {
    title: 'One plan, everything included',
    lead: 'No tiers, no feature locks, no per-user maths.',
    name: 'Rota',
    per: 'per month, per restaurant',
    vat: 'Prices excl. VAT. Pay monthly, cancel any month.',
    includes: ['Weekly and monthly schedule', 'Rule checks and shift leaders', 'Review & publish with notifications', 'Checklists and daily report', 'Availability and leave', 'Announcements and weather', 'Team profiles and earnings', 'English and German'],
    cta: 'Open the live demo',
    talk: 'Talk to us',
  },
  faq: {
    title: 'Questions',
    items: [
      ['What does €65 cover?', 'One restaurant location with every feature in Rota. If you run several locations, each one is €65 a month.'],
      ['Do I need to install anything?', 'No. Rota runs in the browser on a computer, tablet or phone.'],
      ['Can I try it first?', 'Yes. The live demo is a complete restaurant group with staff, shifts and leave requests. Click around as much as you like.'],
      ['Does it follow German labour law?', 'Rota checks rest time, daily and weekly hours, leave and double bookings every time you plan. You stay in control and can override where it makes sense; every exception is recorded.'],
      ['What about our data?', 'Each restaurant only ever sees its own data. Pay rates are visible to owners only.'],
      ['Can my staff use it?', 'Managers and owners use Rota today. A staff app for shifts, availability and checklists is coming next.'],
    ],
  },
  final: { title: 'Plan next week in Rota', body: 'Open the demo and plan a week for Harbor House. It takes a few minutes to see how it works.', cta: 'Open the live demo', talk: 'Talk to us' },
  footer: { imprint: 'Imprint', privacy: 'Privacy', contact: 'Contact', rights: 'Staff scheduling for restaurants.' },
}

export type Copy = typeof en

const de: Copy = {
  meta: {
    title: 'Rota – Dienstplanung für Restaurants',
    description: 'Woche planen, jede Schicht besetzen und das Team informieren. Rota prüft das Arbeitszeitgesetz für dich. 65 € pro Monat und Restaurant.',
  },
  nav: { skip: 'Zum Inhalt springen', features: 'So funktioniert’s', pricing: 'Preis', faq: 'Fragen', demo: 'Live-Demo öffnen', lang: 'English', langHref: '/' },
  hero: {
    title: 'Jede Schicht besetzt, bevor der erste Bon druckt.',
    lead: 'Rota ist der Wochendienstplan für Restaurants. Bar, Service und Küche an einem Ort planen, die Regeln prüfen lassen und nur die informieren, deren Schichten sich ändern.',
    primary: 'Live-Demo öffnen',
    secondary: 'Zum Preis',
    note: '65 € im Monat pro Restaurant. Alles inklusive.',
    board: { title: 'Harbor House', week: 'KW 42', covered: 'besetzt', open: 'Offen', published: 'Veröffentlicht, 6 Personen informiert', days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], shifts: ['Früh', 'Abend', 'Nacht'] },
  },
  week: {
    title: 'Eine Woche in deinem Restaurant, mit Rota',
    lead: 'Rota folgt dem echten Ablauf einer Restaurantwoche. So sieht das für die Leitung aus.',
    days: [
      {
        day: 'Mo',
        title: 'Die ganze Woche in einem Zug planen',
        body: 'Alle Bereiche und Schichten auf einem Bildschirm. Vorwoche kopieren, dann auf einen offenen Platz klicken: Rota schlägt zuerst die passendste Person vor, mit ihren Stunden und dem Grund. Oder Lücken automatisch als Entwurf füllen lassen.',
        img: 'schedule',
        alt: 'Der Wochenplan mit Bar, Service und Küche, offenen Plätzen und dem Wetter pro Tag',
      },
      {
        day: 'Mi',
        title: 'Jemand meldet sich krank',
        body: 'Schicht öffnen und sehen, wer frei ist, wer gern abends arbeitet und wer kurz vor seinem Wochenlimit steht. Wer Urlaub hat oder zu wenig Ruhezeit, wird markiert, bevor du ihn auswählst.',
        img: 'fill-panel',
        alt: 'Das Fenster zum Besetzen einer Schicht mit den besten Vorschlägen und Stunden pro Person',
      },
      {
        day: 'Do',
        title: 'Veröffentlichen und nur die Richtigen informieren',
        body: 'Änderungen bleiben Entwürfe, bis du veröffentlichst. Alle Änderungen in einer Liste prüfen, bei Bedarf rückgängig machen – Rota informiert nur, wessen Schicht sich geändert hat.',
        img: 'review',
        alt: 'Prüfen und veröffentlichen mit allen Änderungen und den Personen, die informiert werden',
      },
      {
        day: 'Fr',
        title: 'Geschlossene Gesellschaft, 40 Gäste',
        body: 'Eine Ankündigung mit Uhrzeit, Details und zwei zusätzlichen Personen im Service anlegen. Die Plätze erscheinen als offene Schicht im Plan, neben dem Wetter für den Abend.',
        img: 'announcements',
        alt: 'Ankündigungen für eine Feier und eine Weinprobe mit zusätzlichem Personal',
      },
      {
        day: 'Sa',
        title: 'Nach Feierabend sehen, was erledigt ist',
        body: 'Jede Person hat eine Checkliste für ihre Schicht. Der Tagesbericht zeigt, was abgehakt wurde, von wem und wann, und hebt Vergessenes hervor. Als PDF herunterladen.',
        img: 'report',
        alt: 'Der Tagesbericht mit erledigten und offenen Aufgaben pro Schicht',
      },
    ],
  },
  rules: {
    title: 'Das Arbeitszeitgesetz, bei jeder Schicht geprüft',
    lead: 'Jedes Mal, wenn du jemanden einteilst oder verschiebst, prüft Rota das für dich. Die Entscheidung bleibt bei dir, jede Ausnahme wird festgehalten.',
    items: [
      ['11 Stunden Ruhezeit', 'zwischen dem Ende einer Schicht und dem Beginn der nächsten'],
      ['10 Stunden am Tag', 'höchstens, über alle Schichten des Tages'],
      ['Wochenmaximum', 'das persönliche Stundenlimit pro Woche'],
      ['Urlaub und freie Tage', 'genehmigter Urlaub und Tage, an denen jemand nicht kann'],
      ['Keine Doppelbuchung', 'auch nicht über zwei Filialen hinweg'],
      ['Eine Schichtleitung', 'in jeder Schicht der Bereiche, die eine brauchen'],
    ],
  },
  more: {
    title: 'Außerdem in Rota',
    items: [
      ['Verfügbarkeit', 'Übliche Woche, Änderungen für eine einzelne Woche und Zeiten wie 17:00–23:00.'],
      ['Urlaubsanträge', 'Mit einem Klick genehmigen oder ablehnen, mit Hinweis bei Überschneidungen.'],
      ['Teamprofile', 'Bereiche, Stunden, Lohn und Verdienstverlauf pro Person.'],
      ['Wetter pro Schicht', 'Die Vorhersage für die Stunden jeder Schicht, zum Planen der Terrasse.'],
      ['Mehrere Filialen', 'Alle Standorte in einem Konto, mit Leitung pro Filiale.'],
      ['Dienstplan zum Ausdrucken', 'Ein sauberes PDF der Woche für den Aushang.'],
      ['Auf dem Handy', 'Läuft im Browser auf jedem Handy und Tablet, ohne Installation.'],
      ['Deutsch und Englisch', 'Sprache jederzeit wechseln; die ganze App ist übersetzt.'],
      ['Berechtigungen', 'Festlegen, was die Leitung darf, oder Änderungen zur Freigabe schicken lassen.'],
    ],
  },
  roles: {
    title: 'Für die Menschen, die das Restaurant führen',
    items: [
      ['Inhaber', 'Alle Filialen im Blick, festlegen, was die Leitung darf, Stunden und Kosten verfolgen.'],
      ['Leitung', 'Schichten planen, tauschen und veröffentlichen, Urlaub bearbeiten und den Tag steuern.'],
      ['Team', 'Eine App für das Team – Schichten sehen, Verfügbarkeit eintragen, Checklisten abhaken – kommt als Nächstes.'],
    ],
  },
  pricing: {
    title: 'Ein Tarif, alles inklusive',
    lead: 'Keine Stufen, keine gesperrten Funktionen, kein Rechnen pro Nutzer.',
    name: 'Rota',
    per: 'pro Monat und Restaurant',
    vat: 'Preise zzgl. MwSt. Monatlich zahlen, monatlich kündbar.',
    includes: ['Wochen- und Monatsplan', 'Regelprüfung und Schichtleitung', 'Prüfen & veröffentlichen mit Benachrichtigung', 'Checklisten und Tagesbericht', 'Verfügbarkeit und Urlaub', 'Ankündigungen und Wetter', 'Teamprofile und Verdienst', 'Deutsch und Englisch'],
    cta: 'Live-Demo öffnen',
    talk: 'Mit uns sprechen',
  },
  faq: {
    title: 'Fragen',
    items: [
      ['Was ist in den 65 € enthalten?', 'Ein Restaurantstandort mit allen Funktionen von Rota. Bei mehreren Standorten kostet jeder 65 € im Monat.'],
      ['Muss ich etwas installieren?', 'Nein. Rota läuft im Browser auf Computer, Tablet oder Handy.'],
      ['Kann ich es vorher ausprobieren?', 'Ja. Die Live-Demo ist eine komplette Restaurantgruppe mit Team, Schichten und Urlaubsanträgen. Klick dich in Ruhe durch.'],
      ['Berücksichtigt Rota das Arbeitszeitgesetz?', 'Rota prüft bei jeder Planung Ruhezeiten, Tages- und Wochenstunden, Urlaub und Doppelbuchungen. Du behältst die Kontrolle und kannst begründet abweichen; jede Ausnahme wird festgehalten.'],
      ['Was ist mit unseren Daten?', 'Jedes Restaurant sieht nur seine eigenen Daten. Stundenlöhne sehen nur Inhaber.'],
      ['Kann mein Team es nutzen?', 'Heute nutzen Leitung und Inhaber Rota. Eine App für das Team mit Schichten, Verfügbarkeit und Checklisten kommt als Nächstes.'],
    ],
  },
  final: { title: 'Plane die nächste Woche in Rota', body: 'Öffne die Demo und plane eine Woche für Harbor House. In wenigen Minuten siehst du, wie es funktioniert.', cta: 'Live-Demo öffnen', talk: 'Mit uns sprechen' },
  footer: { imprint: 'Impressum', privacy: 'Datenschutz', contact: 'Kontakt', rights: 'Dienstplanung für Restaurants.' },
}

export const copy: Record<Lang, Copy> = { en, de }
