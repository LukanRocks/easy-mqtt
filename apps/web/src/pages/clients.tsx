import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@easy-mqtt/dynsec";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CreateClientDialog } from "@/components/create-client-dialog";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { api, ApiError } from "@/lib/api";
import { clientsQuery, queryKeys } from "@/lib/queries";

function ClientRowActions({ client }: { client: Client }) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.clients });

  const toggle = useMutation({
    mutationFn: () =>
      client.disabled ? api.clients.enable(client.username) : api.clients.disable(client.username),
    onSuccess: () => {
      invalidate();
      toast.success(client.disabled ? "Client enabled" : "Client disabled");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Action failed"),
  });

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
          <DropdownMenuItem onSelect={() => toggle.mutate()}>
            {client.disabled ? <CheckCircle2 /> : <Ban />}
            {client.disabled ? "Enable" : "Disable"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
        title={`Delete client “${client.username}”?`}
        description="This permanently removes the client from the broker."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api.clients.remove(client.username);
            invalidate();
            toast.success("Client deleted");
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Delete failed");
          }
        }}
      />
    </div>
  );
}

export function ClientsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(clientsQuery);

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
      cell: ({ row }) => <ClientRowActions client={row.original} />,
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
