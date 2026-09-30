import { addDays, daysAgoIso, fmtShort, startOfWeek, todayKey, weekDays } from './date'
import type { Assignment, Dept, Employee, Preferred, ShiftTemplate, State } from './types'
import { DEPTS } from './types'
import { checkAssignment } from './validation'

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

export const TEMPLATES: ShiftTemplate[] = [
  { id: 't1', name: 'Morning', start: '06:00', end: '14:00', tone: 'morning', needed: { Bar: 0, Service: 1, Kitchen: 1 } },
  { id: 't2', name: 'Day', start: '10:00', end: '18:00', tone: 'day', needed: { Bar: 1, Service: 1, Kitchen: 1 } },
  { id: 't3', name: 'Evening', start: '16:00', end: '23:00', tone: 'evening', needed: { Bar: 1, Service: 2, Kitchen: 2 } },
  { id: 't4', name: 'Night', start: '22:00', end: '02:00', tone: 'night', needed: { Bar: 1, Service: 0, Kitchen: 1 } },
]

export function createSeed(): State {
  phone = 100
  const today = todayKey()
  const employees: Employee[] = [
    emp('e1', 'b1', 'Marco Bellini', 'Bar', 'Head bartender', 40, [0], 'Evenings'),
    emp('e2', 'b1', 'Aisha Khan', 'Bar', 'Bartender', 32, [2], 'Nights'),
    emp('e3', 'b1', 'Tom Lindqvist', 'Bar', 'Barback', 24, [5, 6]),
    emp('e4', 'b1', 'Zoe Achterberg', 'Bar', 'Bartender', 30, [1]),
    emp('e5', 'b1', 'Sofia Alvarez', 'Service', 'Floor lead', 40, [6], 'Evenings'),
    emp('e6', 'b1', 'Jonah Weiss', 'Service', 'Server', 32, [3]),
    emp('e7', 'b1', 'Lina Haddad', 'Service', 'Server', 30, [], 'Days'),
    emp('e8', 'b1', 'Kwame Mensah', 'Service', 'Server', 36, [0, 1]),
    emp('e9', 'b1', 'Mei Tanaka', 'Service', 'Host', 24, [4], 'Mornings'),
    emp('e10', 'b1', 'Rafael Costa', 'Service', 'Runner', 20, [], 'Flexible', 'invited'),
    emp('e11', 'b1', 'Elena Rostova', 'Kitchen', 'Sous chef', 45, [0], 'Days'),
    emp('e12', 'b1', 'Dario Fontana', 'Kitchen', 'Line cook', 40, [2]),
    emp('e13', 'b1', 'Hana Kim', 'Kitchen', 'Line cook', 38, [6], 'Evenings'),
    emp('e14', 'b1', 'Samuel Osei', 'Kitchen', 'Prep cook', 32, [], 'Mornings'),
    emp('e15', 'b1', 'Nora Byrne', 'Kitchen', 'Pastry chef', 30, [5, 6], 'Mornings'),
    emp('e16', 'b1', 'Ibrahim Farah', 'Kitchen', 'Kitchen porter', 28, [3], 'Nights'),
    emp('e17', 'b1', 'Oskar Nilsen', 'Kitchen', 'Line cook', 36, [4]),
    emp('e20', 'b2', 'Chloe Dubois', 'Bar', 'Bartender', 38, [1]),
    emp('e21', 'b2', 'Mateo Silva', 'Bar', 'Bartender', 30, [3]),
    emp('e22', 'b2', 'Leo Kowalski', 'Service', 'Floor lead', 40, [0]),
    emp('e23', 'b2', 'Amara Nwosu', 'Service', 'Server', 32, [2]),
    emp('e24', 'b2', 'Yusuf Demir', 'Service', 'Server', 30, [5]),
    emp('e25', 'b2', 'Julian Reyes', 'Kitchen', 'Head chef', 45, [0]),
    emp('e26', 'b2', 'Sora Nakamura', 'Kitchen', 'Line cook', 38, [6]),
    emp('e27', 'b2', 'Ana Ruiz', 'Kitchen', 'Prep cook', 32, [3]),
    emp('e28', 'b2', 'Felix Braun', 'Kitchen', 'Kitchen porter', 28, [1]),
  ]

  const s: State = {
    version: 4,
    session: { userId: null, branchId: null },
    branches: [
      { id: 'b1', name: 'Harbor House', address: 'Große Elbstraße 14, 22767 Hamburg', city: 'Hamburg', opens: '07:00', closes: '01:00' },
      { id: 'b2', name: 'Garden Room', address: 'Gärtnerplatz 3, 80469 München', city: 'Munich', opens: '08:00', closes: '23:30' },
      { id: 'b3', name: 'Northside', address: 'Kastanienallee 88, 10435 Berlin — opening soon', city: 'Berlin', opens: '10:00', closes: '23:00' },
    ],
    managers: [
      { id: 'm1', name: 'Priya Raman', email: 'priya@harborhouse.co', role: 'manager', branchIds: ['b1', 'b2'] },
      { id: 'm2', name: 'Grace Liu', email: 'grace@gardenroom.co', role: 'manager', branchIds: ['b2'] },
      { id: 'm3', name: 'Daniel Okafor', email: 'daniel@harborhouse.co', role: 'super', branchIds: ['b1', 'b2', 'b3'] },
    ],
    employees,
    templates: TEMPLATES,
    assignments: [],
    leaves: [
      { id: 'l1', employeeId: 'e7', from: addDays(today, 3), to: addDays(today, 6), kind: 'Vacation', note: 'Family wedding in Lyon.', status: 'pending', requestedAt: daysAgoIso(0, 2) },
      { id: 'l2', employeeId: 'e12', from: addDays(today, 9), to: addDays(today, 9), kind: 'Personal', note: 'Moving flat.', status: 'pending', requestedAt: daysAgoIso(1, 3) },
      { id: 'l3', employeeId: 'e23', from: addDays(today, 5), to: addDays(today, 7), kind: 'Vacation', note: '', status: 'pending', requestedAt: daysAgoIso(0, 6) },
      { id: 'l4', employeeId: 'e15', from: addDays(today, 14), to: addDays(today, 18), kind: 'Vacation', note: 'Booked in spring.', status: 'approved', requestedAt: daysAgoIso(30) },
      { id: 'l5', employeeId: 'e2', from: addDays(today, -8), to: addDays(today, -7), kind: 'Personal', note: 'Weekend away.', status: 'declined', requestedAt: daysAgoIso(21) },
    ],
    history: [],
    notices: [
      { id: 'n1', at: daysAgoIso(0, 2), title: 'Lina Haddad requested leave', body: 'Harbor House · 4 days of vacation from ' + fmtShort(addDays(today, 3)), read: false, href: '/leave' },
      { id: 'n2', at: daysAgoIso(0, 6), title: 'Amara Nwosu requested leave', body: 'Garden Room · 3 days of vacation', read: false, href: '/leave' },
      { id: 'n3', at: daysAgoIso(1), title: 'Rafael Costa hasn’t joined yet', body: 'Invite sent 3 days ago. Resend from their profile.', read: false, href: '/team/e10' },
      { id: 'n4', at: daysAgoIso(2), title: 'Hana Kim updated availability', body: 'Now unavailable on Sundays', read: true, href: '/availability' },
      { id: 'n5', at: daysAgoIso(5), title: 'Schedule published', body: 'This week’s schedule went out to 16 people', read: true, href: '/history' },
    ],
    perms: { createEmployees: true, editShifts: true, publish: true, approveLeave: true, manageBranches: false },
    pendingApproval: {},
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
            let need = t.needed[dept]
            if (need > 0 && r() < 0.07) need--
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

  s.history = [
    { id: 'h1', branchId: 'b1', at: daysAgoIso(5, 4), by: 'Priya Raman', action: 'Published', subject: 'Week of ' + fmtShort(thisWeek), to: '142 shifts · 16 people notified' },
    { id: 'h2', branchId: 'b1', at: daysAgoIso(5, 5), by: 'Priya Raman', action: 'Moved', subject: 'Jonah Weiss', from: 'Day 10:00–18:00, Fri', to: 'Evening 16:00–23:00, Fri' },
    { id: 'h3', branchId: 'b1', at: daysAgoIso(3), by: 'Priya Raman', action: 'Employee added', subject: 'Rafael Costa', to: 'Service · Runner · invite sent' },
    { id: 'h4', branchId: 'b1', at: daysAgoIso(12), by: 'Daniel Okafor', action: 'Shift edited', subject: 'Evening', from: '16:00–22:30', to: '16:00–23:00' },
    { id: 'h5', branchId: 'b1', at: daysAgoIso(20), by: 'Priya Raman', action: 'Leave declined', subject: 'Aisha Khan', to: 'Personal · 2 days' },
    { id: 'h6', branchId: 'b2', at: daysAgoIso(4), by: 'Grace Liu', action: 'Published', subject: 'Week of ' + fmtShort(thisWeek), to: '96 shifts · 9 people notified' },
  ]
  return s
}
