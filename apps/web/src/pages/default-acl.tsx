import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_ACL_TYPES, type Acl } from '@easy-mqtt/dynsec'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/page-header'
import { api, ApiError } from '@/lib/api'
import { defaultAclQuery, queryKeys } from '@/lib/queries'

const DESCRIPTIONS: Record<(typeof DEFAULT_ACL_TYPES)[number], string> = {
  publishClientSend: 'Publish from a client to the broker.',
  publishClientReceive: 'Deliver a published message to a client.',
  subscribe: 'Subscribe to a topic filter.',
  unsubscribe: 'Unsubscribe from a topic filter.',
}

type Draft = Record<(typeof DEFAULT_ACL_TYPES)[number], boolean>

function toDraft(acls: Acl[]): Draft {
  return Object.fromEntries(DEFAULT_ACL_TYPES.map((acltype) => [acltype, acls.find((a) => a.acltype === acltype)?.allow ?? false])) as Draft
}

export function DefaultAclPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery(defaultAclQuery)
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    if (data && draft === null) setDraft(toDraft(data))
  }, [data, draft])

  const dirty = draft !== null && data !== undefined && DEFAULT_ACL_TYPES.some((t) => draft[t] !== (data.find((a) => a.acltype === t)?.allow ?? false))

  const save = useMutation({
    mutationFn: () =>
      api.defaultAcl.set(
        DEFAULT_ACL_TYPES.map((acltype) => ({
          acltype,
          topic: '',
          priority: -1,
          allow: draft![acltype],
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.defaultAcl })
      toast.success('Default ACLs saved')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Save failed'),
  })

  return (
    <>
      <PageHeader title='Default ACLs' description='Fallback access for clients with no matching role ACL.' />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Fallback rules</CardTitle>
          <CardDescription>
            These apply only when no role ACL matches the client&apos;s action. Changes affect every client that relies on the fallback, so reconnect clients after saving.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {isLoading ? (
            <Skeleton className='h-64 w-full' />
          ) : isError ? (
            <p className='text-sm text-destructive'>{error instanceof Error ? error.message : 'Failed to load default ACLs'}</p>
          ) : !draft ? (
            <Skeleton className='h-64 w-full' />
          ) : (
            <>
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className='text-right'>Effect</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEFAULT_ACL_TYPES.map((t) => (
                      <TableRow key={t}>
                        <TableCell className='font-mono text-xs'>{t}</TableCell>
                        <TableCell className='text-muted-foreground'>{DESCRIPTIONS[t]}</TableCell>
                        <TableCell>
                          <div className='flex items-center justify-end gap-3'>
                            <span className='text-sm text-muted-foreground'>{draft[t] ? 'Allow' : 'Deny'}</span>
                            <Switch checked={draft[t]} onCheckedChange={(v) => setDraft({ ...draft, [t]: v })} aria-label={`Allow ${t}`} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className='flex items-center justify-end gap-2'>
                <Button
                  variant='ghost'
                  disabled={!dirty || save.isPending}
                  onClick={() => {
                    if (data) setDraft(toDraft(data))
                  }}
                >
                  <RotateCcw className='size-4' /> Reset
                </Button>
                <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
                  <Save className='size-4' /> {save.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
