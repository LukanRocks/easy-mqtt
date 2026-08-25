import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Activity, Boxes, LayoutDashboard, LogOut, Radio, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/clients', label: 'Clients', icon: Users, exact: false },
  { to: '/groups', label: 'Groups', icon: Boxes, exact: false },
  { to: '/roles', label: 'Roles', icon: ShieldCheck, exact: false },
  { to: '/access', label: 'Access', icon: Activity, exact: false },
] as const

export function AppLayout({ username }: { username: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  async function handleLogout() {
    try {
      await api.auth.logout()
    } catch {
      /* ignore — clear client state regardless */
    }
    queryClient.clear()
    navigate({ to: '/login' })
    toast.success('Signed out')
  }

  return (
    <div className='flex min-h-screen bg-background'>
      <aside className='hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex'>
        <div className='flex h-14 items-center gap-2 border-b px-5 font-semibold'>
          <Radio className='size-5 text-primary' />
          <span>easy-mqtt</span>
        </div>
        <nav className='flex-1 space-y-1 p-3'>
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className='size-4' />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className='border-t p-3 text-xs text-muted-foreground'>Mosquitto Dynamic Security</div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-14 items-center justify-between border-b px-4 md:px-6'>
          <nav className='flex items-center gap-1 md:hidden'>
            {NAV.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} aria-label={label}>
                <Button variant='ghost' size='icon'>
                  <Icon className='size-4' />
                </Button>
              </Link>
            ))}
          </nav>
          <div className='ml-auto flex items-center gap-2'>
            <span className='hidden text-sm text-muted-foreground sm:inline'>
              Signed in as <span className='font-medium text-foreground'>{username}</span>
            </span>
            <ThemeToggle />
            <Button variant='ghost' size='icon' onClick={handleLogout} aria-label='Sign out'>
              <LogOut className='size-4' />
            </Button>
          </div>
        </header>
        <main className='flex-1 overflow-y-auto p-4 md:p-8'>
          <div className='mx-auto max-w-6xl space-y-6'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
