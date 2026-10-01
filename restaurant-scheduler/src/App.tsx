import { useStore } from './lib/store'
import { useT } from './i18n'
import { useRoute } from './lib/hooks'
import Shell, { NoAccess } from './components/Shell'
import { Toaster } from './components/ui'
import { Login, SelectBranch } from './screens/Access'
import WeeklySchedule from './screens/WeeklySchedule'
import { Published, ReviewPublish } from './screens/Publish'
import { EmployeeProfile, Team } from './screens/Team'
import { Dashboard, MonthlySchedule, ShiftTemplates } from './screens/Planning'
import { Availability, LeaveRequests } from './screens/People'
import { History, Permissions, Settings } from './screens/Admin'
import { Platform } from './screens/Platform'

function Screen() {
  const { s, branch, isOwner, company } = useStore()
  const { t } = useT()
  const { path, parts, query } = useRoute()

  if (!s.session.userId) return <Login />
  if (isOwner && !company) return <Platform />
  if (!branch || path === '/branches') return <SelectBranch />

  const key = branch.id
  let page
  switch (parts[0] ?? 'dashboard') {
    case 'dashboard':
      page = <Dashboard />
      break
    case 'schedule':
      page = <WeeklySchedule key={key} week={query.get('week')} />
      break
    case 'month':
      page = <MonthlySchedule month={query.get('m')} />
      break
    case 'templates':
      page = <ShiftTemplates />
      break
    case 'team':
      page = parts[1] ? <EmployeeProfile id={parts[1]} /> : <Team key={key} openAdd={query.get('add') === '1'} />
      break
    case 'availability':
      page = <Availability />
      break
    case 'leave':
      page = <LeaveRequests />
      break
    case 'review':
      page = <ReviewPublish key={key} />
      break
    case 'published':
      page = <Published />
      break
    case 'history':
      page = <History />
      break
    case 'permissions':
      page = <Permissions />
      break
    case 'settings':
      page = <Settings key={key} tab={query.get('tab')} />
      break
    case 'login':
      page = <Dashboard />
      break
    default:
      page = <NoAccess what={t('shell.thisPage')} />
  }
  return <Shell path={path}>{page}</Shell>
}

export default function App() {
  return (
    <>
      <Screen />
      <Toaster />
    </>
  )
}
