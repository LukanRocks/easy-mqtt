import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { api, ApiError } from '@/lib/api'
import { clientsQuery, groupQuery, queryKeys, rolesQuery } from '@/lib/queries'

function fail(e: unknown, fallback: string) {
  toast.error(e instanceof ApiError ? e.message : fallback)
}

export function GroupDetailPage({ groupname }: { groupname: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: group, isLoading, isError } = useQuery(groupQuery(groupname))
  const roles = useQuery(rolesQuery)
  const clients = useQuery(clientsQuery)

  const [textdescription, setTextdescription] = useState('')
  const [roleToAdd, setRoleToAdd] = useState('')
  const [clientToAdd, setClientToAdd] = useState('')

  useEffect(() => {
    if (group) {
      setTextdescription(group.textdescription ?? '')
    }
  }, [group])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.group(groupname) })
    queryClient.invalidateQueries({ queryKey: queryKeys.groups })
  }

  const saveDetails = useMutation({
    mutationFn: () => api.groups.update(groupname, { textdescription }),
    onSuccess: () => {
      refresh()
      toast.success('Details saved')
    },
    onError: (e) => fail(e, 'Save failed'),
  })

  const addRole = useMutation({
    mutationFn: (rolename: string) => api.groups.addRole(groupname, rolename),
    onSuccess: () => {
      setRoleToAdd('')
      refresh()
      toast.success('Role added')
    },
    onError: (e) => fail(e, 'Failed to add role'),
  })

  const removeRole = useMutation({
    mutationFn: (rolename: string) => api.groups.removeRole(groupname, rolename),
    onSuccess: () => {
      refresh()
      toast.success('Role removed')
    },
    onError: (e) => fail(e, 'Failed to remove role'),
  })

  const addClient = useMutation({
    mutationFn: (username: string) => api.groups.addClient(groupname, username),
    onSuccess: () => {
      setClientToAdd('')
      refresh()
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
      toast.success('Member added')
    },
    onError: (e) => fail(e, 'Failed to add member'),
  })

  const removeClient = useMutation({
    mutationFn: (username: string) => api.groups.removeClient(groupname, username),
    onSuccess: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
      toast.success('Member removed')
    },
    onError: (e) => fail(e, 'Failed to remove member'),
  })

  if (isError) {
    return (
      <div className='space-y-4'>
        <Button variant='ghost' onClick={() => navigate({ to: '/groups' })}>
          <ArrowLeft className='size-4' /> Back to groups
        </Button>
        <p className='text-sm text-muted-foreground'>Group “{groupname}” not found.</p>
      </div>
    )
  }

  const assignedRoles = new Set((group?.roles ?? []).map((r) => r.rolename))
  const availableRoles = (roles.data?.items ?? []).filter((r) => !assignedRoles.has(r.rolename))
  const memberSet = new Set((group?.clients ?? []).map((c) => c.username))
  const availableClients = (clients.data?.items ?? []).filter((c) => !memberSet.has(c.username))

  return (
    <>
      <Button variant='ghost' className='w-fit' onClick={() => navigate({ to: '/groups' })}>
        <ArrowLeft className='size-4' /> Back to groups
      </Button>

      <PageHeader
        title={groupname}
        description='Group details, roles, and members.'
        actions={
          <ConfirmDialog
            trigger={
              <Button variant='destructive'>
                <Trash2 className='size-4' /> Delete
              </Button>
            }
            title={`Delete group “${groupname}”?`}
            confirmLabel='Delete'
            onConfirm={async () => {
              try {
                await api.groups.remove(groupname)
                toast.success('Group deleted')
                navigate({ to: '/groups' })
              } catch (e) {
                fail(e, 'Delete failed')
              }
            }}
          />
        }
      />

      {isLoading ? (
        <Skeleton className='h-64 w-full' />
      ) : (
        <div className='grid gap-6 md:grid-cols-2'>
          <Card className='md:col-span-2'>
            <CardHeader>
              <CardTitle className='text-base'>Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='desc'>Description</Label>
                <Input id='desc' value={textdescription} onChange={(e) => setTextdescription(e.target.value)} />
              </div>
              <Button onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending}>
                {saveDetails.isPending ? 'Saving…' : 'Save details'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Roles</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-wrap gap-2'>
                {(group?.roles ?? []).map((r) => (
                  <Badge key={r.rolename} variant='secondary' className='gap-1 pr-1'>
                    {r.rolename}
                    <button type='button' className='rounded-sm p-0.5 hover:bg-background/50' onClick={() => removeRole.mutate(r.rolename)} aria-label={`Remove ${r.rolename}`}>
                      <X className='size-3' />
                    </button>
                  </Badge>
                ))}
                {!group?.roles?.length && <span className='text-sm text-muted-foreground'>No roles.</span>}
              </div>
              <div className='flex items-center gap-2'>
                <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                  <SelectTrigger>
                    <SelectValue placeholder='Add a role…' />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.rolename} value={r.rolename}>
                        {r.rolename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant='outline' disabled={!roleToAdd || addRole.isPending} onClick={() => addRole.mutate(roleToAdd)}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Members</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-wrap gap-2'>
                {(group?.clients ?? []).map((c) => (
                  <Badge key={c.username} variant='outline' className='gap-1 pr-1'>
                    {c.username}
                    <button type='button' className='rounded-sm p-0.5 hover:bg-muted' onClick={() => removeClient.mutate(c.username)} aria-label={`Remove ${c.username}`}>
                      <X className='size-3' />
                    </button>
                  </Badge>
                ))}
                {!group?.clients?.length && <span className='text-sm text-muted-foreground'>No members.</span>}
              </div>
              <div className='flex items-center gap-2'>
                <Select value={clientToAdd} onValueChange={setClientToAdd}>
                  <SelectTrigger>
                    <SelectValue placeholder='Add a member…' />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((c) => (
                      <SelectItem key={c.username} value={c.username}>
                        {c.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant='outline' disabled={!clientToAdd || addClient.isPending} onClick={() => addClient.mutate(clientToAdd)}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
