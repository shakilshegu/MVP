import { addDays, dayLong, fromKey, pad, toMin, weekdayIndex } from './date'
import { intlLocale, tr } from '../i18n/core'
import { isActive, leaveOn } from './validation'
import type { Branch, Dept, Manager, State } from './types'
import { DEPTS } from './types'

const ddmm = (k: string) => `${k.slice(8, 10)}.${k.slice(5, 7)}`
const ddmmyyyy = (k: string) => `${ddmm(k)}.${k.slice(0, 4)}`

export function isoWeek(k: string) {
  const d = fromKey(k)
  d.setDate(d.getDate() + 3 - weekdayIndex(k))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

/** "15" for 15:00, "15:30" otherwise — the way the paper rota writes start times. */
const startLabel = (t: string) => (toMin(t) % 60 === 0 ? pad(Math.floor(toMin(t) / 60)) : t)

type Cell = { text: string; kind: 'shift' | 'off' | 'leave' | 'empty'; draft: boolean }

export function buildRota(s: State, branchId: string, weekStart: string, depts: Dept[]) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const team = s.employees
    .filter((e) => e.branchId === branchId && depts.includes(e.dept))
    .sort((a, b) => DEPTS.indexOf(a.dept) - DEPTS.indexOf(b.dept) || a.name.localeCompare(b.name))

  let hasDraft = false
  const rows = team.map((e) => {
    const cells: Cell[] = days.map((d) => {
      if (leaveOn(s, e.id, d)) return { text: tr('pdf.leave'), kind: 'leave', draft: false }
      const shifts = s.assignments
        .filter((a) => a.employeeId === e.id && a.date === d && isActive(a))
        .map((a) => ({ a, t: s.templates.find((t) => t.id === a.templateId)! }))
        .filter((x) => x.t)
        .sort((x, y) => toMin(x.t.start) - toMin(y.t.start))
      if (shifts.length) {
        const draft = shifts.some((x) => x.a.state === 'added')
        hasDraft ||= draft
        const text = shifts
          .map((x) => startLabel(x.t.start) + (x.a.dept !== e.dept ? ` ${tr(`dept.${x.a.dept}`)}` : ''))
          .join(' / ')
        return { text: draft ? text + '*' : text, kind: 'shift', draft }
      }
      if (!e.availability[weekdayIndex(d)]) return { text: tr('pdf.off'), kind: 'off', draft: false }
      return { text: '', kind: 'empty', draft: false }
    })
    return { e, cells }
  })
  const notes = days.map((d) => s.dayNotes[`${branchId}|${d}`] ?? '')
  return { days, rows, hasDraft, notes }
}

export async function downloadRotaPdf(opts: { s: State; branch: Branch; me: Manager | null; weekStart: string; depts: Dept[] }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const { s, branch, me, weekStart, depts } = opts
  const { days, rows, hasDraft, notes } = buildRota(s, branch.id, weekStart, depts)
  const week = isoWeek(weekStart)
  const end = days[6]

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 12
  const ink: [number, number, number] = [23, 34, 29]
  const forest: [number, number, number] = [30, 64, 52]
  const muted: [number, number, number] = [110, 118, 113]

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...forest)
  doc.text(branch.name, M, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...ink)
  const scope = depts.length === DEPTS.length ? tr('pdf.allDepts') : depts.map((d) => tr(`dept.${d}`)).join(', ')
  doc.text([tr('pdf.title'), tr('pdf.week', { n: week }), `${ddmm(weekStart)}.–${ddmmyyyy(end)}`, scope].join(' · '), M, 22.5)
  doc.setFontSize(8.5)
  doc.setTextColor(...muted)
  doc.text(branch.address, M, 27)
  if (hasDraft) {
    doc.setTextColor(140, 83, 0)
    doc.text(tr('pdf.draft'), W - M, 16, { align: 'right' })
  }

  const DEPT_ROW = '__dept__'
  const body: string[][] = []
  const deptRows = new Set<number>()
  const kinds = new Map<number, Cell['kind'][]>()
  const NOTE_ROW = notes.some(Boolean) ? 0 : -1
  if (NOTE_ROW === 0) body.push([tr('pdf.notes'), ...notes])
  let lastDept: Dept | null = null
  const first = (n: string) => n.split(' ')[0]
  const label = (n: string) => (rows.filter((x) => first(x.e.name) === first(n)).length > 1 ? `${first(n)} ${n.split(' ')[1]?.[0] ?? ''}.` : first(n))
  for (const r of rows) {
    if (depts.length > 1 && r.e.dept !== lastDept) {
      deptRows.add(body.length)
      body.push([DEPT_ROW + tr(`dept.${r.e.dept}`), '', '', '', '', '', '', ''])
      lastDept = r.e.dept
    }
    kinds.set(body.length, r.cells.map((c) => c.kind))
    body.push([label(r.e.name), ...r.cells.map((c) => c.text)])
  }
  // Spare rows for handwritten additions, only while the table still fits one page.
  const spare = Math.max(0, Math.min(3, 25 - body.length))
  for (let i = 0; i < spare; i++) body.push(['', '', '', '', '', '', '', ''])

  autoTable(doc, {
    startY: 31,
    margin: { left: M, right: M, bottom: 13 },
    theme: 'grid',
    head: [[`${tr('pdf.date')}\n${ddmm(weekStart)}–${ddmm(end)}`, ...days.map((d, i) => `${ddmm(d)}\n${dayLong(i)}`)]],
    body,
    styles: { font: 'helvetica', fontSize: 9, textColor: ink, lineColor: [60, 60, 60], lineWidth: 0.25, cellPadding: { top: 1.1, bottom: 1.1, left: 2.5, right: 2.5 }, halign: 'center', valign: 'middle', minCellHeight: 6.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: ink, fontStyle: 'bold', fontSize: 10, lineWidth: 0.35 },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
      ...Object.fromEntries(days.map((_, i) => [i + 1, { cellWidth: (W - 2 * M - 42) / 7 }])),
    },
    didParseCell: (h) => {
      if (h.section !== 'body') return
      const raw = String(h.cell.raw ?? '')
      if (h.row.index === NOTE_ROW) {
        h.cell.styles.fillColor = [251, 244, 222]
        h.cell.styles.textColor = [101, 74, 8]
        h.cell.styles.fontSize = 7.5
        h.cell.styles.fontStyle = h.column.index === 0 ? 'bold' : 'italic'
        return
      }
      if (deptRows.has(h.row.index)) {
        h.cell.styles.fillColor = [238, 243, 239]
        h.cell.styles.textColor = forest
        h.cell.styles.fontSize = 8
        h.cell.styles.minCellHeight = 5.5
        if (h.column.index === 0) {
          h.cell.text = [raw.replace(DEPT_ROW, '')]
          h.cell.colSpan = 8
          h.cell.styles.halign = 'left'
        }
        return
      }
      const kind = h.column.index > 0 ? kinds.get(h.row.index)?.[h.column.index - 1] : undefined
      if (kind === 'off') h.cell.styles.textColor = muted
      if (kind === 'leave') {
        h.cell.styles.fillColor = [246, 238, 236]
        h.cell.styles.textColor = [84, 48, 44]
      }
      if (raw.endsWith('*')) h.cell.styles.textColor = [140, 83, 0]
    },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight()
      doc.setFontSize(7.5)
      doc.setTextColor(...muted)
      const stamp = new Date().toLocaleString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      doc.text(tr('pdf.legend'), M, H - 8)
      doc.text(tr('pdf.created', { stamp, name: me?.name ?? '—', page: doc.getNumberOfPages() }), W - M, H - 8, { align: 'right' })
    },
  })

  const slug = branch.name.replace(/[^\p{L}\p{N}]+/gu, '-')
  doc.save(`${tr('pdf.file', { branch: slug, n: week, date: weekStart })}.pdf`)
}
