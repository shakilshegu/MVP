/** A department id. Departments are per company and can be added, renamed and recoloured. */
export type Dept = string

export type Department = { id: string; companyId: string; name: string; color: string; needsLeader: boolean }

export type ChecklistItem = { id: string; title: string; detail: string }
/** Duties and responsibilities assigned to an employee; ticked off on every shift. */
export type ChecklistTemplate = { id: string; companyId: string; name: string; items: ChecklistItem[] }

export type Currency = 'EUR' | 'INR'

/** owner = runs the platform; super = a company's admin; manager = runs assigned branches. */
export type Role = 'manager' | 'super' | 'owner'
export type Tone = 'morning' | 'day' | 'evening' | 'night'
export type Preferred = 'Mornings' | 'Days' | 'Evenings' | 'Nights' | 'Flexible'
export const PREFERRED: Preferred[] = ['Flexible', 'Mornings', 'Days', 'Evenings', 'Nights']

/** A restaurant business (tenant). Everything else belongs to exactly one company. */
/** Company-wide rules for the Employee App. */
export type CompanySettings = {
  /** Staff submit next week's availability by this weekday (0 = Mon) and time of the week before (CR-07). */
  availabilityDay: number
  availabilityTime: string
  /** Shift leaders may see the daily report for the shifts they lead (CR-04). */
  leadersSeeReport: boolean
}
export const DEFAULT_COMPANY_SETTINGS: CompanySettings = { availabilityDay: 3, availabilityTime: '18:00', leadersSeeReport: true }

export type Company = { id: string; name: string; createdAt: string; currency: Currency; settings?: CompanySettings }

export type Branch = { id: string; companyId: string; name: string; address: string; city: string; opens: string; closes: string }

/** `companyId` is null only for the platform owner. */
export type Manager = { id: string; companyId: string | null; name: string; email: string; role: Role; branchIds: string[] }

export type Employee = {
  id: string
  branchId: string
  name: string
  /** Main department, used for grouping. Always included in `skills`. */
  dept: Dept
  /** Departments this person can work in. */
  skills: Dept[]
  position: string
  email: string
  phone: string
  maxHours: number
  /** Monday first */
  availability: boolean[]
  preferred: Preferred
  status: 'active' | 'invited'
  photo?: string
  /** Gross hourly pay in the company's currency. Visible to admins and the employee only. */
  hourlyRate: number
  /** Colour used for this person on the schedule. */
  color: string
  checklistId: string | null
}

export type ShiftTemplate = {
  id: string
  companyId: string
  name: string
  start: string
  end: string
  tone: Tone
  needed: Record<Dept, number>
  /** Optional per-weekday staffing (Monday first); overrides `needed`. */
  perDay?: Record<Dept, number[]>
}

export type ConflictKind = 'unavailable' | 'overlap' | 'maxHours' | 'elsewhere' | 'rest' | 'dayMax'

export type Task = { id: string; text: string; done: boolean }

/** A ticked checklist item or task on one shift (CR-03/CR-04). `byManager` when ticked on someone's behalf. */
export type Tick = { at: string; by: string; byManager?: boolean }

export type Assignment = {
  id: string
  branchId: string
  employeeId: string
  date: string
  templateId: string
  dept: Dept
  state: 'published' | 'added' | 'removed'
  overridden?: ConflictKind[]
  /** This person leads the shift for their department (CR-01). */
  isLeader?: boolean
  /** The leader flag as last published; only set while a published shift's leader change awaits publishing. */
  publishedLeader?: boolean
  tasks?: Task[]
  /** Tasks as the team last saw them; differences are unpublished changes. */
  publishedTasks?: Task[]
  movedFrom?: string
  movedTo?: string
}

export type Leave = {
  id: string
  employeeId: string
  from: string
  to: string
  kind: 'Vacation' | 'Sick' | 'Personal'
  note: string
  status: 'pending' | 'approved' | 'declined'
  requestedAt: string
}

export type HistoryAction =
  | 'assigned'
  | 'removed'
  | 'tasksUpdated'
  | 'moved'
  | 'published'
  | 'shiftEdited'
  | 'shiftCreated'
  | 'employeeAdded'
  | 'employeeEdited'
  | 'availability'
  | 'leaveApproved'
  | 'leaveDeclined'
  | 'permissions'
  | 'branch'
  | 'announcement'
  | 'leader'

export type HistoryEntry = {
  id: string
  branchId: string
  at: string
  by: string
  action: HistoryAction
  /** Names and details are recorded in the language used when the change was made, like any audit log. */
  subject: string
  from?: string
  to?: string
  /** For 'published': counts rendered in the viewer's language. */
  count?: number
  people?: number
}

/** A special occasion staff should know about, e.g. a private party (CR-05). */
export type Announcement = {
  id: string
  branchId: string
  date: string
  /** Optional time window, 'HH:MM'. */
  start?: string
  end?: string
  title: string
  body: string
  /** Extra people needed on top of the usual staffing, optionally for one department. */
  extraStaff?: number
  dept?: Dept
  /** The shift the extra people are needed on. */
  templateId?: string
  by: string
  at: string
  /** How many people were told when it was last sent. */
  sentTo: number
}

export type NoticeKind = 'leaveRequested' | 'inviteNotAccepted' | 'availabilityUpdated' | 'published' | 'approvalRequested'
/** Stored as a kind plus raw values so it renders in whichever language is active. */
export type Notice = { id: string; companyId: string; at: string; kind: NoticeKind; params: Record<string, string | number>; read: boolean; href?: string }

export const PERMS = ['createEmployees', 'editShifts', 'publish', 'approveLeave', 'manageBranches'] as const
export type Perm = (typeof PERMS)[number]

/** Everything persisted, across all companies. Only the store touches this directly. */
export type Data = {
  version: number
  /** `companyId` is the company being viewed; for the platform owner it is chosen, for everyone else it is theirs. */
  session: { userId: string | null; companyId: string | null; branchId: string | null }
  companies: Company[]
  branches: Branch[]
  managers: Manager[]
  employees: Employee[]
  templates: ShiftTemplate[]
  departments: Department[]
  checklists: ChecklistTemplate[]
  assignments: Assignment[]
  leaves: Leave[]
  history: HistoryEntry[]
  notices: Notice[]
  /** What managers may do, per company. Super admins can always do everything. */
  companyPerms: Record<string, Record<Perm, boolean>>
  pendingApproval: Record<string, boolean>
  /** Keyed by `${branchId}|${date}` */
  dayNotes: Record<string, string>
  announcements: Announcement[]
  /** Ticks per shift: assignmentId → checklist item or task id → who ticked it and when. */
  ticks: Record<string, Record<string, Tick>>
  /** Availability for one specific week, overriding the usual pattern: employeeId → weekStart → Mon..Sun. */
  weekAvailability: Record<string, Record<string, boolean[]>>
  lastPublish: { branchId: string; at: string; count: number; notified: string[] } | null
}

/** One company's slice of the data — the only shape screens ever receive. */
export type State = Data & { perms: Record<Perm, boolean> }
