import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Group } from "@easy-mqtt/dynsec";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { api, ApiError } from "@/lib/api";
import { groupsQuery, queryKeys } from "@/lib/queries";

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
