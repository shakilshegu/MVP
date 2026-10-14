import { intlLocale, tr } from '../i18n/core'
import { deptName } from '../i18n/format'
import type { Branch, Data, Manager } from './types'
import type { ReportRow } from '../screens/DailyReport'

/** The daily report as an A4 table: one row per person and shift, open tasks spelled out (CR-04). */
export async function downloadReportPdf(opts: { s: Data; branch: Branch; me: Manager | null; date: string; rows: ReportRow[] }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const { s, branch, me, date, rows } = opts
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const M = 12
  const W = doc.internal.pageSize.getWidth()
  const day = new Date(`${date}T12:00:00`).toLocaleDateString(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 64, 52)
  doc.text(`${tr('report.title')} · ${branch.name}`, M, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(23, 34, 29)
  const total = rows.reduce((n, r) => n + r.items.length, 0)
  const done = rows.reduce((n, r) => n + r.done, 0)
  doc.text(`${day} · ${tr('report.tasksDone')}: ${done}/${total}`, M, 22)

  autoTable(doc, {
    startY: 28,
    margin: { left: M, right: M, bottom: 14 },
    theme: 'grid',
    head: [[tr('report.pdfShift'), tr('report.employee'), tr('common.department'), tr('report.pdfDoneCol'), tr('report.pdfOpen')]],
    body: rows.map((r) => [
      `${r.tpl.name}\n${r.tpl.start}–${r.tpl.end}`,
      r.e.name + (r.a.isLeader ? ` (${tr('schedule.leader')})` : ''),
      deptName(s, r.a.dept),
      `${r.done}/${r.items.length}`,
      r.items.filter((i) => !i.tick).map((i) => `• ${i.title}`).join('\n') || (r.items.length ? tr('report.complete') : '–'),
    ]),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2, valign: 'top' },
    headStyles: { fillColor: [30, 64, 52], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 40 }, 2: { cellWidth: 26 }, 3: { cellWidth: 16, halign: 'center' } },
    didParseCell: (h) => {
      if (h.section === 'body' && h.column.index === 4 && String(h.cell.raw).startsWith('•')) h.cell.styles.textColor = [140, 60, 50]
    },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight()
      doc.setFontSize(7.5)
      doc.setTextColor(110, 118, 113)
      const stamp = new Date().toLocaleString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      doc.text(tr('pdf.created', { stamp, name: me?.name ?? '—', page: doc.getNumberOfPages() }), W - M, H - 8, { align: 'right' })
    },
  })
  doc.save(`${tr('report.file', { branch: branch.name.replace(/[^\p{L}\p{N}]+/gu, '-'), date })}.pdf`)
}
