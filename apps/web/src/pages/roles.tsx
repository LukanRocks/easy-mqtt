import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@easy-mqtt/dynsec";
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
import { queryKeys, rolesQuery } from "@/lib/queries";

function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: { rolename: "", textname: "", textdescription: "" },
    onSubmit: async ({ value }) => {
      try {
        await api.roles.create({
          rolename: value.rolename,
          textname: value.textname || undefined,
          textdescription: value.textdescription || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.roles });
        toast.success(`Role “${value.rolename}” created`);
        form.reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to create role");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> New role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>Roles hold the ACLs that grant or deny topic access.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="rolename">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="r-name">Role name</Label>
                <Input
                  id="r-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}
          </form.Field>
          <form.Field name="textname">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="r-textname">Display name</Label>
                <Input
                  id="r-textname"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="textdescription">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="r-desc">Description</Label>
                <Input
                  id="r-desc"
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
                  {isSubmitting ? "Creating…" : "Create role"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RolesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(rolesQuery);

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "rolename",
      header: "Name",
      cell: ({ row }) => (
        <Link
          to="/roles/$rolename"
          params={{ rolename: row.original.rolename }}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.rolename}
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
      id: "acls",
      header: "ACLs",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{row.original.acls?.length ?? 0}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" title="Delete">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
            title={`Delete role “${row.original.rolename}”?`}
            confirmLabel="Delete"
            onConfirm={async () => {
              try {
                await api.roles.remove(row.original.rolename);
                queryClient.invalidateQueries({ queryKey: queryKeys.roles });
                toast.success("Role deleted");
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
        title="Roles"
        description="ACL bundles assigned to clients and groups."
        actions={<CreateRoleDialog />}
      />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        filterPlaceholder="Filter roles…"
        onRowClick={(role) =>
          navigate({ to: "/roles/$rolename", params: { rolename: role.rolename } })
        }
        emptyState={<span className="text-sm text-muted-foreground">No roles yet.</span>}
      />
    </>
  );
}
