import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Acl, AclType } from '@easy-mqtt/dynsec'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { api, ApiError } from '@/lib/api'
import { queryKeys, roleQuery } from '@/lib/queries'

const ACL_TYPES: { value: AclType; label: string }[] = [
  { value: 'publishClientSend', label: 'publishClientSend' },
  { value: 'publishClientReceive', label: 'publishClientReceive' },
  { value: 'subscribeLiteral', label: 'subscribeLiteral' },
  { value: 'subscribePattern', label: 'subscribePattern' },
  { value: 'unsubscribeLiteral', label: 'unsubscribeLiteral' },
  { value: 'unsubscribePattern', label: 'unsubscribePattern' },
  { value: 'subscribe', label: 'subscribe' },
  { value: 'unsubscribe', label: 'unsubscribe' },
]

function fail(e: unknown, fallback: string) {
  toast.error(e instanceof ApiError ? e.message : fallback)
}

export function RoleDetailPage({ rolename }: { rolename: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: role, isLoading, isError } = useQuery(roleQuery(rolename))

  const [textdescription, setTextdescription] = useState('')

  const [acltype, setAcltype] = useState<AclType>('subscribePattern')
  const [topic, setTopic] = useState('')
  const [priority, setPriority] = useState('-1')
  const [allow, setAllow] = useState(true)

  useEffect(() => {
    if (role) {
      setTextdescription(role.textdescription ?? '')
    }
  }, [role])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.role(rolename) })
    queryClient.invalidateQueries({ queryKey: queryKeys.roles })
  }

  const saveDetails = useMutation({
    mutationFn: () => api.roles.update(rolename, { textdescription }),
    onSuccess: () => {
      refresh()
      toast.success('Details saved')
    },
    onError: (e) => fail(e, 'Save failed'),
  })

  const addAcl = useMutation({
    mutationFn: (acl: Acl) => api.roles.addAcl(rolename, acl),
    onSuccess: () => {
      setTopic('')
      setPriority('-1')
      refresh()
      toast.success('ACL added')
    },
    onError: (e) => fail(e, 'Failed to add ACL'),
  })

  const removeAcl = useMutation({
    mutationFn: (acl: { acltype: AclType; topic: string }) => api.roles.removeAcl(rolename, acl.acltype, acl.topic),
    onSuccess: () => {
      refresh()
      toast.success('ACL removed')
    },
    onError: (e) => fail(e, 'Failed to remove ACL'),
  })

  if (isError) {
    return (
      <div className='space-y-4'>
        <Button variant='ghost' onClick={() => navigate({ to: '/roles' })}>
          <ArrowLeft className='size-4' /> Back to roles
        </Button>
        <p className='text-sm text-muted-foreground'>Role “{rolename}” not found.</p>
      </div>
    )
  }

  const acls = [...(role?.acls ?? [])].sort((a, b) => (a.priority ?? -1) - (b.priority ?? -1))

  return (
    <>
      <Button variant='ghost' className='w-fit' onClick={() => navigate({ to: '/roles' })}>
        <ArrowLeft className='size-4' /> Back to roles
      </Button>

      <PageHeader
        title={rolename}
        description='Role details and access-control list.'
        actions={
          <ConfirmDialog
            trigger={
              <Button variant='destructive'>
                <Trash2 className='size-4' /> Delete
              </Button>
            }
            title={`Delete role “${rolename}”?`}
            confirmLabel='Delete'
            onConfirm={async () => {
              try {
                await api.roles.remove(rolename)
                toast.success('Role deleted')
                navigate({ to: '/roles' })
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
        <div className='space-y-6'>
          <Card>
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
              <CardTitle className='text-base'>Access-control list</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Topic filter</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Effect</TableHead>
                      <TableHead className='text-right'>
                        <span className='sr-only'>Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acls.length ? (
                      acls.map((acl) => (
                        <TableRow key={`${acl.acltype}:${acl.topic}`}>
                          <TableCell className='font-mono text-xs'>{acl.acltype}</TableCell>
                          <TableCell className='font-mono text-xs'>{acl.topic}</TableCell>
                          <TableCell className='tabular-nums'>{acl.priority}</TableCell>
                          <TableCell>
                            <Badge variant={acl.allow ? 'success' : 'destructive'}>{acl.allow ? 'Allow' : 'Deny'}</Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button variant='ghost' size='icon' title='Remove ACL' onClick={() => removeAcl.mutate({ acltype: acl.acltype, topic: acl.topic })}>
                              <Trash2 className='size-4 text-destructive' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className='h-20 text-center text-sm text-muted-foreground'>
                          No ACLs — this role grants no access.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className='grid items-end gap-3 sm:grid-cols-[1fr_1.5fr_auto_auto_auto]'>
                <div className='space-y-2'>
                  <Label>Type</Label>
                  <Select value={acltype} onValueChange={(v) => setAcltype(v as AclType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className='font-mono text-xs'>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='acl-topic'>Topic filter</Label>
                  <Input id='acl-topic' value={topic} onChange={(e) => setTopic(e.target.value)} placeholder='sensors/#' className='font-mono' />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='acl-prio'>Priority</Label>
                  <Input id='acl-prio' type='number' value={priority} onChange={(e) => setPriority(e.target.value)} className='w-24' />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='acl-allow'>Allow</Label>
                  <div className='flex h-9 items-center'>
                    <Switch id='acl-allow' checked={allow} onCheckedChange={setAllow} />
                  </div>
                </div>
                <Button
                  disabled={!topic || addAcl.isPending}
                  onClick={() =>
                    addAcl.mutate({
                      acltype,
                      topic,
                      priority: Number.parseInt(priority, 10) || -1,
                      allow,
                    })
                  }
                >
                  <Plus className='size-4' /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
