import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    defaultValues: { rolename: "", textdescription: "" },
    onSubmit: async ({ value }) => {
      try {
        await api.roles.create({
          rolename: value.rolename,
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

function RoleRowActions({ role }: { role: Role }) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Actions">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setConfirmOpen(true);
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
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api.roles.remove(role.rolename);
            queryClient.invalidateQueries({ queryKey: queryKeys.roles });
            toast.success("Role deleted");
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Delete failed");
          }
        }}
      />
    </div>
  );
}

export function RolesPage() {
  const navigate = useNavigate();
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
      accessorKey: "textdescription",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.textdescription || "—"}</span>
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
      cell: ({ row }) => <RoleRowActions role={row.original} />,
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
