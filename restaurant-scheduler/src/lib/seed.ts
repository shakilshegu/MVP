import { addDays, daysAgoIso, startOfWeek, todayKey, weekDays } from './date'
import { tr } from '../i18n/core'
import type { Assignment, Dept, Employee, Preferred, ShiftTemplate, State } from './types'
import { DEPTS } from './types'
import { checkAssignment, needFor } from './validation'

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let phone = 100
function emp(
  id: string,
  branchId: string,
  name: string,
  dept: Dept,
  position: string,
  maxHours: number,
  off: number[] = [],
  preferred: Preferred = 'Flexible',
  status: Employee['status'] = 'active',
): Employee {
  const domain = branchId === 'b1' ? 'harborhouse.co' : 'gardenroom.co'
  return {
    id,
    branchId,
    name,
    dept,
    position,
    maxHours,
    email: `${name.split(' ')[0].toLowerCase()}@${domain}`,
    phone: `+49 151 2345 6${String(phone++).slice(-3)}`,
    availability: Array.from({ length: 7 }, (_, i) => !off.includes(i)),
    preferred,
    status,
  }
}

const templates = (): ShiftTemplate[] => [
  { id: 't1', name: tr('seed.shift.morning'), start: '06:00', end: '14:00', tone: 'morning', needed: { Bar: 0, Service: 1, Kitchen: 1 } },
  { id: 't2', name: tr('seed.shift.day'), start: '10:00', end: '18:00', tone: 'day', needed: { Bar: 1, Service: 1, Kitchen: 1 } },
  {
    id: 't3',
    name: tr('seed.shift.evening'),
    start: '16:00',
    end: '23:00',
    tone: 'evening',
    needed: { Bar: 1, Service: 2, Kitchen: 2 },
    perDay: { Bar: [1, 1, 1, 1, 2, 2, 1], Service: [2, 2, 2, 2, 3, 3, 2], Kitchen: [2, 2, 2, 2, 2, 3, 2] },
  },
  { id: 't4', name: tr('seed.shift.night'), start: '22:00', end: '02:00', tone: 'night', needed: { Bar: 1, Service: 0, Kitchen: 1 } },
]

/** Demo data, written in the language active when it is created. */
export function createSeed(): State {
  phone = 100
  const today = todayKey()
  const P = {
    headBartender: tr('seed.pos.headBartender'),
    bartender: tr('seed.pos.bartender'),
    barback: tr('seed.pos.barback'),
    floorLead: tr('seed.pos.floorLead'),
    server: tr('seed.pos.server'),
    host: tr('seed.pos.host'),
    runner: tr('seed.pos.runner'),
    sousChef: tr('seed.pos.sousChef'),
    lineCook: tr('seed.pos.lineCook'),
    prepCook: tr('seed.pos.prepCook'),
    pastryChef: tr('seed.pos.pastryChef'),
    porter: tr('seed.pos.porter'),
    headChef: tr('seed.pos.headChef'),
  }
  const employees: Employee[] = [
    emp('e1', 'b1', 'Marco Bellini', 'Bar', P.headBartender, 40, [0], 'Evenings'),
    emp('e2', 'b1', 'Aisha Khan', 'Bar', P.bartender, 32, [2], 'Nights'),
    emp('e3', 'b1', 'Tom Lindqvist', 'Bar', P.barback, 24, [5, 6]),
    emp('e4', 'b1', 'Zoe Achterberg', 'Bar', P.bartender, 30, [1]),
    emp('e5', 'b1', 'Sofia Alvarez', 'Service', P.floorLead, 40, [6], 'Evenings'),
    emp('e6', 'b1', 'Jonah Weiss', 'Service', P.server, 32, [3]),
    emp('e7', 'b1', 'Lina Haddad', 'Service', P.server, 30, [], 'Days'),
    emp('e8', 'b1', 'Kwame Mensah', 'Service', P.server, 36, [0, 1]),
    emp('e9', 'b1', 'Mei Tanaka', 'Service', P.host, 24, [4], 'Mornings'),
    emp('e10', 'b1', 'Rafael Costa', 'Service', P.runner, 20, [], 'Flexible', 'invited'),
    emp('e11', 'b1', 'Elena Rostova', 'Kitchen', P.sousChef, 45, [0], 'Days'),
    emp('e12', 'b1', 'Dario Fontana', 'Kitchen', P.lineCook, 40, [2]),
    emp('e13', 'b1', 'Hana Kim', 'Kitchen', P.lineCook, 38, [6], 'Evenings'),
    emp('e14', 'b1', 'Samuel Osei', 'Kitchen', P.prepCook, 32, [], 'Mornings'),
    emp('e15', 'b1', 'Nora Byrne', 'Kitchen', P.pastryChef, 30, [5, 6], 'Mornings'),
    emp('e16', 'b1', 'Ibrahim Farah', 'Kitchen', P.porter, 28, [3], 'Nights'),
    emp('e17', 'b1', 'Oskar Nilsen', 'Kitchen', P.lineCook, 36, [4]),
    emp('e40', 'b1', 'Lukas Weber', 'Bar', P.bartender, 32, [3], 'Evenings'),
    emp('e41', 'b1', 'Ana Petrović', 'Service', P.server, 30, [0], 'Evenings'),
    emp('e42', 'b1', 'Jonas Richter', 'Service', P.runner, 28, [2]),
    emp('e43', 'b1', 'Mira Schulz', 'Kitchen', P.lineCook, 36, [1], 'Evenings'),
    emp('e20', 'b2', 'Chloe Dubois', 'Bar', P.bartender, 38, [1]),
    emp('e21', 'b2', 'Mateo Silva', 'Bar', P.bartender, 30, [3]),
    emp('e22', 'b2', 'Leo Kowalski', 'Service', P.floorLead, 40, [0]),
    emp('e23', 'b2', 'Amara Nwosu', 'Service', P.server, 32, [2]),
    emp('e24', 'b2', 'Yusuf Demir', 'Service', P.server, 30, [5]),
    emp('e25', 'b2', 'Julian Reyes', 'Kitchen', P.headChef, 45, [0]),
    emp('e26', 'b2', 'Sora Nakamura', 'Kitchen', P.lineCook, 38, [6]),
    emp('e27', 'b2', 'Ana Ruiz', 'Kitchen', P.prepCook, 32, [3]),
    emp('e28', 'b2', 'Felix Braun', 'Kitchen', P.porter, 28, [1]),
  ]

  const s: State = {
    version: 7,
    session: { userId: null, branchId: null },
    branches: [
      { id: 'b1', name: 'Harbor House', address: 'Große Elbstraße 14, 22767 Hamburg', city: 'Hamburg', opens: '07:00', closes: '01:00' },
      { id: 'b2', name: 'Garden Room', address: 'Gärtnerplatz 3, 80469 München', city: 'Munich', opens: '08:00', closes: '23:30' },
      { id: 'b3', name: 'Northside', address: `Kastanienallee 88, 10435 Berlin — ${tr('seed.openingSoon')}`, city: 'Berlin', opens: '10:00', closes: '23:00' },
    ],
    managers: [
      { id: 'm1', name: 'Priya Raman', email: 'priya@harborhouse.co', role: 'manager', branchIds: ['b1', 'b2'] },
      { id: 'm2', name: 'Grace Liu', email: 'grace@gardenroom.co', role: 'manager', branchIds: ['b2'] },
      { id: 'm3', name: 'Daniel Okafor', email: 'daniel@harborhouse.co', role: 'super', branchIds: ['b1', 'b2', 'b3'] },
    ],
    employees,
    templates: templates(),
    assignments: [],
    leaves: [
      { id: 'l1', employeeId: 'e7', from: addDays(today, 3), to: addDays(today, 6), kind: 'Vacation', note: tr('seed.leaveNote.wedding'), status: 'pending', requestedAt: daysAgoIso(0, 2) },
      { id: 'l2', employeeId: 'e12', from: addDays(today, 9), to: addDays(today, 9), kind: 'Personal', note: tr('seed.leaveNote.moving'), status: 'pending', requestedAt: daysAgoIso(1, 3) },
      { id: 'l3', employeeId: 'e23', from: addDays(today, 5), to: addDays(today, 7), kind: 'Vacation', note: '', status: 'pending', requestedAt: daysAgoIso(0, 6) },
      { id: 'l4', employeeId: 'e15', from: addDays(today, 14), to: addDays(today, 18), kind: 'Vacation', note: tr('seed.leaveNote.spring'), status: 'approved', requestedAt: daysAgoIso(30) },
      { id: 'l5', employeeId: 'e2', from: addDays(today, -8), to: addDays(today, -7), kind: 'Personal', note: tr('seed.leaveNote.weekend'), status: 'declined', requestedAt: daysAgoIso(21) },
    ],
    history: [],
    notices: [
      { id: 'n1', at: daysAgoIso(0, 2), kind: 'leaveRequested', params: { name: 'Lina Haddad', branch: 'Harbor House', kind: 'Vacation', from: addDays(today, 3), to: addDays(today, 6) }, read: false, href: '/leave' },
      { id: 'n2', at: daysAgoIso(0, 6), kind: 'leaveRequested', params: { name: 'Amara Nwosu', branch: 'Garden Room', kind: 'Vacation', from: addDays(today, 5), to: addDays(today, 7) }, read: false, href: '/leave' },
      { id: 'n3', at: daysAgoIso(1), kind: 'inviteNotAccepted', params: { name: 'Rafael Costa' }, read: false, href: '/team/e10' },
      { id: 'n4', at: daysAgoIso(2), kind: 'availabilityUpdated', params: { name: 'Hana Kim', weekday: 6 }, read: true, href: '/availability' },
      { id: 'n5', at: daysAgoIso(5), kind: 'published', params: { changes: 142, people: 16 }, read: true, href: '/history' },
    ],
    perms: { createEmployees: true, editShifts: true, publish: true, approveLeave: true, manageBranches: false },
    pendingApproval: {},
    dayNotes: {
      [`b1|${addDays(startOfWeek(today), 4)}`]: tr('seed.note.party'),
      [`b1|${addDays(startOfWeek(today), 6)}`]: tr('seed.note.terrace'),
    },
    lastPublish: null,
  }

  const r = rng(7)
  const thisWeek = startOfWeek(today)
  let n = 0
  for (const branchId of ['b1', 'b2']) {
    for (const offset of [-14, -7, 0]) {
      for (const date of weekDays(addDays(thisWeek, offset))) {
        for (const t of s.templates) {
          for (const dept of DEPTS) {
            const pool = employees.filter((e) => e.branchId === branchId && e.dept === dept && e.status === 'active').sort(() => r() - 0.5)
            let need = needFor(t, dept, date)
            if (need > 0 && r() < (date >= today ? 0.3 : 0.07)) need--
            for (const e of pool) {
              if (need <= 0) break
              const req = { branchId, employeeId: e.id, date, templateId: t.id, dept }
              if (checkAssignment(s, req).length) continue
              s.assignments.push({ id: `a${n++}`, ...req, state: 'published' })
              need--
            }
          }
        }
      }
    }
  }

  // A couple of unpublished edits so the review flow has something in it.
  const target = addDays(today, 1)
  const out = s.assignments.find((a) => a.branchId === 'b1' && a.date === target && a.templateId === 't3' && a.dept === 'Service')
  if (out) {
    out.state = 'removed'
    const cand = employees.find(
      (e) => e.branchId === 'b1' && e.dept === 'Service' && e.id !== out.employeeId && e.status === 'active' &&
        !checkAssignment(s, { ...out, employeeId: e.id, ignoreId: undefined }).length,
    )
    if (cand) s.assignments.push({ ...out, id: `a${n++}`, employeeId: cand.id, state: 'added' } satisfies Assignment)
  }

  const shifts = s.templates
  const range = (t: ShiftTemplate) => `${t.name} ${t.start}–${t.end}`
  s.history = [
    { id: 'h1', branchId: 'b1', at: daysAgoIso(5, 4), by: 'Priya Raman', action: 'published', subject: '', count: 142, people: 16 },
    { id: 'h2', branchId: 'b1', at: daysAgoIso(5, 5), by: 'Priya Raman', action: 'moved', subject: 'Jonah Weiss', from: range(shifts[1]), to: range(shifts[2]) },
    { id: 'h3', branchId: 'b1', at: daysAgoIso(3), by: 'Priya Raman', action: 'employeeAdded', subject: 'Rafael Costa', to: `${tr('dept.Service')} · ${P.runner} · ${tr('history.detail.inviteSent')}` },
    { id: 'h4', branchId: 'b1', at: daysAgoIso(12), by: 'Daniel Okafor', action: 'shiftEdited', subject: shifts[2].name, from: '16:00–22:30', to: '16:00–23:00' },
    { id: 'h5', branchId: 'b1', at: daysAgoIso(20), by: 'Priya Raman', action: 'leaveDeclined', subject: 'Aisha Khan', to: `${tr('leaveKind.Personal')} · ${tr('common.days', { count: 2 })}` },
    { id: 'h6', branchId: 'b2', at: daysAgoIso(4), by: 'Grace Liu', action: 'published', subject: '', count: 96, people: 9 },
  ]
  return s
}
