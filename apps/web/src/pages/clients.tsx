import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@easy-mqtt/dynsec";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { api, ApiError } from "@/lib/api";
import { clientsQuery, queryKeys } from "@/lib/queries";

function CreateClientDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: { username: "", password: "", textname: "", textdescription: "" },
    onSubmit: async ({ value }) => {
      try {
        await api.clients.create({
          username: value.username,
          password: value.password || undefined,
          textname: value.textname || undefined,
          textdescription: value.textdescription || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.clients });
        toast.success(`Client “${value.username}” created`);
        form.reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to create client");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> New client
        </Button>
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
          <form.Field name="textname">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="c-textname">Display name</Label>
                <Input
                  id="c-textname"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
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

export function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(clientsQuery);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.clients });

  const toggle = useMutation({
    mutationFn: ({ username, disabled }: { username: string; disabled: boolean }) =>
      disabled ? api.clients.enable(username) : api.clients.disable(username),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.disabled ? "Client enabled" : "Client disabled");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Action failed"),
  });

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => (
        <Link
          to="/clients/$username"
          params={{ username: row.original.username }}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.username}
        </Link>
      ),
    },
    {
      accessorKey: "textname",
      header: "Display name",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.textname || "—"}</span>
      ),
    },
    {
      id: "roles",
      header: "Roles",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.roles ?? []).map((r) => (
            <Badge key={r.rolename} variant="secondary">
              {r.rolename}
            </Badge>
          ))}
          {!row.original.roles?.length && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.disabled ? (
          <Badge variant="destructive">Disabled</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            title={row.original.disabled ? "Enable" : "Disable"}
            onClick={() =>
              toggle.mutate({
                username: row.original.username,
                disabled: !!row.original.disabled,
              })
            }
          >
            {row.original.disabled ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Ban className="size-4" />
            )}
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" title="Delete">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
            title={`Delete client “${row.original.username}”?`}
            description="This permanently removes the client from the broker."
            confirmLabel="Delete"
            onConfirm={async () => {
              try {
                await api.clients.remove(row.original.username);
                invalidate();
                toast.success("Client deleted");
              } catch (e) {
                toast.error(e instanceof ApiError ? e.message : "Delete failed");
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Clients"
        description="MQTT client accounts managed by dynamic security."
        actions={<CreateClientDialog />}
      />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        filterPlaceholder="Filter clients…"
        onRowClick={(client) =>
          navigate({ to: "/clients/$username", params: { username: client.username } })
        }
        emptyState={<span className="text-sm text-muted-foreground">No clients yet.</span>}
      />
    </>
  );
}
