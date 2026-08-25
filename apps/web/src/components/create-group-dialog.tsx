import { type ReactNode, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

/**
 * Create-group modal. Renders its own "New group" trigger by default; pass a
 * `trigger` to drive it from elsewhere. On success it navigates to the new
 * group's detail page.
 */
export function CreateGroupDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: { groupname: "", textdescription: "" },
    onSubmit: async ({ value }) => {
      try {
        await api.groups.create({
          groupname: value.groupname,
          textdescription: value.textdescription || undefined,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.groups });
        toast.success(`Group “${value.groupname}” created`);
        form.reset();
        setOpen(false);
        navigate({ to: "/groups/$groupname", params: { groupname: value.groupname } });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to create group");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" /> New group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>Groups bundle roles and apply them to their members.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="groupname">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="g-name">Group name</Label>
                <Input
                  id="g-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}
          </form.Field>
          <form.Field name="textdescription">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="g-desc">Description</Label>
                <Input
                  id="g-desc"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <DialogFooter>
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create group"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
