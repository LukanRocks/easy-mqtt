import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
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
    defaultValues: { groupname: "", textname: "", textdescription: "" },
    onSubmit: async ({ value }) => {
      try {
        await api.groups.create({
          groupname: value.groupname,
          textname: value.textname || undefined,
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
          <form.Field name="textname">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="g-textname">Display name</Label>
                <Input
                  id="g-textname"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
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

export function GroupsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" title="Delete">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
            title={`Delete group “${row.original.groupname}”?`}
            confirmLabel="Delete"
            onConfirm={async () => {
              try {
                await api.groups.remove(row.original.groupname);
                queryClient.invalidateQueries({ queryKey: queryKeys.groups });
                toast.success("Group deleted");
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
