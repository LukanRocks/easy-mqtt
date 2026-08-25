import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/page-header'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queries'

export function AccessPage() {
  const [input, setInput] = useState('')
  const [topic, setTopic] = useState('')

  const { data, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.access(topic),
    queryFn: () => api.access.check(topic),
    enabled: topic.length > 0,
  })

  return (
    <>
      <PageHeader title='Access' description='Check which roles grant access to a concrete topic (allow rules only).' />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Topic lookup</CardTitle>
          <CardDescription>Enter a concrete topic (no wildcards) to see which role ACLs match it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='flex gap-2'
            onSubmit={(e) => {
              e.preventDefault()
              setTopic(input.trim())
            }}
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder='sensors/livingroom/temperature' className='font-mono' />
            <Button type='submit' disabled={!input.trim()}>
              <Search className='size-4' /> Check
            </Button>
          </form>
        </CardContent>
      </Card>

      {topic && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>
              Roles granting access to <span className='font-mono'>{topic}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <Skeleton className='h-20 w-full' />
            ) : isError ? (
              <p className='text-sm text-destructive'>{error instanceof Error ? error.message : 'Lookup failed'}</p>
            ) : data && data.length > 0 ? (
              <div className='space-y-4'>
                {data.map((role) => (
                  <div key={role.rolename} className='rounded-lg border p-4'>
                    <div className='mb-2 flex items-center gap-2'>
                      <span className='font-medium'>{role.rolename}</span>
                      {role.textname && <span className='text-sm text-muted-foreground'>({role.textname})</span>}
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      {role.access.map((a) => (
                        <Badge key={a} variant='secondary' className='font-mono text-xs'>
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>No role grants access to this topic.</p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
