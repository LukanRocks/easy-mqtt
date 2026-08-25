import { type ReactNode, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/queries'

/**
 * Create-role modal. Renders its own "New role" trigger by default; pass a
 * `trigger` to drive it from elsewhere. On success it navigates to the new
 * role's detail page.
 */
export function CreateRoleDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: { rolename: '', textdescription: '' },
    onSubmit: async ({ value }) => {
      try {
        await api.roles.create({
          rolename: value.rolename,
          textdescription: value.textdescription || undefined,
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.roles })
        toast.success(`Role “${value.rolename}” created`)
        form.reset()
        setOpen(false)
        navigate({ to: '/roles/$rolename', params: { rolename: value.rolename } })
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to create role')
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className='size-4' /> New role
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>Roles hold the ACLs that grant or deny topic access.</DialogDescription>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.Field name='rolename'>
            {(field) => (
              <div className='space-y-2'>
                <Label htmlFor='r-name'>Role name</Label>
                <Input id='r-name' value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required autoFocus />
              </div>
            )}
          </form.Field>
          <form.Field name='textdescription'>
            {(field) => (
              <div className='space-y-2'>
                <Label htmlFor='r-desc'>Description</Label>
                <Input id='r-desc' value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
              </div>
            )}
          </form.Field>
          <DialogFooter>
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type='submit' disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create role'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
