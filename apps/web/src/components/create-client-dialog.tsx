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
 * Create-client modal. Renders its own "New client" trigger by default; pass a
 * `trigger` to drive it from elsewhere (e.g. dashboard quick actions). On
 * success it navigates to the new client's detail page.
 */
export function CreateClientDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: { username: "", password: "", textdescription: "" },
    onSubmit: async ({ value }) => {
      try {
        await api.clients.create({
          username: value.username,
          password: value.password || undefined,
          textdescription: value.textdescription || undefined,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.clients });
        toast.success(`Client “${value.username}” created`);
        form.reset();
        setOpen(false);
        navigate({ to: "/clients/$username", params: { username: value.username } });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to create client");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" /> New client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>Create a dynamic-security client account.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="username">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="c-username">Username</Label>
                <Input
                  id="c-username"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="c-password">Password</Label>
                <Input
                  id="c-password"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Set an initial password"
                />
              </div>
            )}
          </form.Field>
          <form.Field name="textdescription">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="c-desc">Description</Label>
                <Input
                  id="c-desc"
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
                  {isSubmitting ? "Creating…" : "Create client"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
