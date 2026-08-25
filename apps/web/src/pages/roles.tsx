import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@easy-mqtt/dynsec'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CreateRoleDialog } from '@/components/create-role-dialog'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { api, ApiError } from '@/lib/api'
import { queryKeys, rolesQuery } from '@/lib/queries'

function RoleRowActions({ role }: { role: Role }) {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className='flex justify-end' onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' title='Actions'>
            <MoreHorizontal className='size-4' />
            <span className='sr-only'>Open actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onSelect={(e) => {
              e.preventDefault()
              setMenuOpen(false)
              setConfirmOpen(true)
            }}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete role “${role.rolename}”?`}
        confirmLabel='Delete'
        onConfirm={async () => {
          try {
            await api.roles.remove(role.rolename)
            queryClient.invalidateQueries({ queryKey: queryKeys.roles })
            toast.success('Role deleted')
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Delete failed')
          }
        }}
      />
    </div>
  )
}

export function RolesPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery(rolesQuery)

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'rolename',
      header: 'Name',
      cell: ({ row }) => (
        <Link to='/roles/$rolename' params={{ rolename: row.original.rolename }} className='font-medium hover:underline' onClick={(e) => e.stopPropagation()}>
          {row.original.rolename}
        </Link>
      ),
    },
    {
      accessorKey: 'textdescription',
      header: 'Description',
      cell: ({ row }) => <span className='text-muted-foreground'>{row.original.textdescription || '—'}</span>,
    },
    {
      id: 'acls',
      header: 'ACLs',
      cell: ({ row }) => <span className='text-muted-foreground tabular-nums'>{row.original.acls?.length ?? 0}</span>,
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => <RoleRowActions role={row.original} />,
    },
  ]

  return (
    <>
      <PageHeader title='Roles' description='ACL bundles assigned to clients and groups.' actions={<CreateRoleDialog />} />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        filterPlaceholder='Filter roles…'
        onRowClick={(role) => navigate({ to: '/roles/$rolename', params: { rolename: role.rolename } })}
        emptyState={<span className='text-sm text-muted-foreground'>No roles yet.</span>}
      />
    </>
  )
}
