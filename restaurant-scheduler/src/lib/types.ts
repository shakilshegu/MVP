export type Dept = 'Bar' | 'Service' | 'Kitchen'
export const DEPTS: Dept[] = ['Bar', 'Service', 'Kitchen']

export type Role = 'manager' | 'super'
export type Tone = 'morning' | 'day' | 'evening' | 'night'
export type Preferred = 'Mornings' | 'Days' | 'Evenings' | 'Nights' | 'Flexible'
export const PREFERRED: Preferred[] = ['Flexible', 'Mornings', 'Days', 'Evenings', 'Nights']

export type Branch = { id: string; name: string; address: string; opens: string; closes: string }

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
}

export type Assignment = {
  id: string
  branchId: string
  employeeId: string
  date: string
  templateId: string
  dept: Dept
  state: 'published' | 'added' | 'removed'
  overridden?: string[]
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
  | 'Assigned'
  | 'Removed'
  | 'Moved'
  | 'Published'
  | 'Shift edited'
  | 'Shift created'
  | 'Employee added'
  | 'Employee edited'
  | 'Availability'
  | 'Leave approved'
  | 'Leave declined'
  | 'Permissions'
  | 'Branch'

export type HistoryEntry = {
  id: string
  branchId: string
  at: string
  by: string
  action: HistoryAction
  subject: string
  from?: string
  to?: string
}

export type Notice = { id: string; at: string; title: string; body: string; read: boolean; href?: string }

export const PERMS = [
  { key: 'createEmployees', label: 'Add and edit employees', hint: 'Invite new staff and change their details' },
  { key: 'editShifts', label: 'Edit shifts and templates', hint: 'Assign people and change shift times' },
  { key: 'publish', label: 'Publish schedules', hint: 'Without this, managers send changes for approval' },
  { key: 'approveLeave', label: 'Approve leave', hint: 'Approve or decline time-off requests' },
  { key: 'manageBranches', label: 'Manage branches', hint: 'Add branches and assign managers' },
] as const
export type Perm = (typeof PERMS)[number]['key']

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
  lastPublish: { branchId: string; at: string; count: number; notified: string[] } | null
}
