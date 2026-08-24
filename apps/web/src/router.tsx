import { Outlet, createRootRouteWithContext, createRoute, createRouter, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/app-layout'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queries'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { ClientsPage } from '@/pages/clients'
import { ClientDetailPage } from '@/pages/client-detail'
import { GroupsPage } from '@/pages/groups'
import { GroupDetailPage } from '@/pages/group-detail'
import { RolesPage } from '@/pages/roles'
import { RoleDetailPage } from '@/pages/role-detail'
import { AccessPage } from '@/pages/access'

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: () => <Outlet /> })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  beforeLoad: async ({ context }) => {
    try {
      const me = await context.queryClient.fetchQuery({
        queryKey: queryKeys.me,
        queryFn: api.auth.me,
      })
      return { username: me.username }
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: function AuthLayout() {
    const { username } = authRoute.useRouteContext()
    return <AppLayout username={username} />
  },
})

const indexRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/',
  component: DashboardPage,
})

const clientsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/clients',
  component: ClientsPage,
})

const clientDetailRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/clients/$username',
  component: function ClientDetailRoute() {
    const { username } = clientDetailRoute.useParams()
    return <ClientDetailPage username={username} />
  },
})

const groupsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/groups',
  component: GroupsPage,
})

const groupDetailRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/groups/$groupname',
  component: function GroupDetailRoute() {
    const { groupname } = groupDetailRoute.useParams()
    return <GroupDetailPage groupname={groupname} />
  },
})

const rolesRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/roles',
  component: RolesPage,
})

const roleDetailRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/roles/$rolename',
  component: function RoleDetailRoute() {
    const { rolename } = roleDetailRoute.useParams()
    return <RoleDetailPage rolename={rolename} />
  },
})

const accessRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/access',
  component: AccessPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  authRoute.addChildren([indexRoute, clientsRoute, clientDetailRoute, groupsRoute, groupDetailRoute, rolesRoute, roleDetailRoute, accessRoute]),
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
