import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Group } from "@easy-mqtt/dynsec";
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
import { groupsQuery, queryKeys } from "@/lib/queries";

function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: { groupname: "", textdescription: "" },
    onSubmit: async ({ value }) => {
      try {
        await api.groups.create({
          groupname: value.groupname,
          textdescription: value.textdescription || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
        toast.success(`Group “${value.groupname}” created`);
        form.reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to create group");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> New group
        </Button>
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

function GroupRowActions({ group }: { group: Group }) {
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
        title={`Delete group “${group.groupname}”?`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api.groups.remove(group.groupname);
            queryClient.invalidateQueries({ queryKey: queryKeys.groups });
            toast.success("Group deleted");
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Delete failed");
          }
        }}
      />
    </div>
  );
}

export function GroupsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(groupsQuery);

  const columns: ColumnDef<Group>[] = [
    {
      accessorKey: "groupname",
      header: "Name",
      cell: ({ row }) => (
        <Link
          to="/groups/$groupname"
          params={{ groupname: row.original.groupname }}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.groupname}
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
      id: "clients",
      header: "Members",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.clients?.length ?? 0}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <GroupRowActions group={row.original} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Groups"
        description="Group role assignments applied to member clients."
        actions={<CreateGroupDialog />}
      />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        filterPlaceholder="Filter groups…"
        onRowClick={(group) =>
          navigate({ to: "/groups/$groupname", params: { groupname: group.groupname } })
        }
        emptyState={<span className="text-sm text-muted-foreground">No groups yet.</span>}
      />
    </>
  );
}
