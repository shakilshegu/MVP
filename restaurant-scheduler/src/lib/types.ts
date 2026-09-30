export type Dept = 'Bar' | 'Service' | 'Kitchen'
export const DEPTS: Dept[] = ['Bar', 'Service', 'Kitchen']

export type Role = 'manager' | 'super'
export type Tone = 'morning' | 'day' | 'evening' | 'night'
export type Preferred = 'Mornings' | 'Days' | 'Evenings' | 'Nights' | 'Flexible'
export const PREFERRED: Preferred[] = ['Flexible', 'Mornings', 'Days', 'Evenings', 'Nights']

export type Branch = { id: string; name: string; address: string; city: string; opens: string; closes: string }

export type Manager = { id: string; name: string; email: string; role: Role; branchIds: string[] }

export type Employee = {
  id: string
  branchId: string
  name: string
  dept: Dept
  position: string
  email: string
  phone: string
  maxHours: number
  /** Monday first */
  availability: boolean[]
  preferred: Preferred
  status: 'active' | 'invited'
  photo?: string
}

export type ShiftTemplate = {
  id: string
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

export type Assignment = {
  id: string
  branchId: string
  employeeId: string
  date: string
  templateId: string
  dept: Dept
  state: 'published' | 'added' | 'removed'
  overridden?: ConflictKind[]
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

export type NoticeKind = 'leaveRequested' | 'inviteNotAccepted' | 'availabilityUpdated' | 'published' | 'approvalRequested'
/** Stored as a kind plus raw values so it renders in whichever language is active. */
export type Notice = { id: string; at: string; kind: NoticeKind; params: Record<string, string | number>; read: boolean; href?: string }

export const PERMS = ['createEmployees', 'editShifts', 'publish', 'approveLeave', 'manageBranches'] as const
export type Perm = (typeof PERMS)[number]

export type State = {
  version: number
  session: { userId: string | null; branchId: string | null }
  branches: Branch[]
  managers: Manager[]
  employees: Employee[]
  templates: ShiftTemplate[]
  assignments: Assignment[]
  leaves: Leave[]
  history: HistoryEntry[]
  notices: Notice[]
  /** What managers may do. Super admins can always do everything. */
  perms: Record<Perm, boolean>
  pendingApproval: Record<string, boolean>
  /** Keyed by `${branchId}|${date}` */
  dayNotes: Record<string, string>
  lastPublish: { branchId: string; at: string; count: number; notified: string[] } | null
}
