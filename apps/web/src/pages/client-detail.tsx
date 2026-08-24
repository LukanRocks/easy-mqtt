import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { api, ApiError } from "@/lib/api";
import { clientQuery, queryKeys, rolesQuery } from "@/lib/queries";

function fail(e: unknown, fallback: string) {
  toast.error(e instanceof ApiError ? e.message : fallback);
}

export function ClientDetailPage({ username }: { username: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: client, isLoading, isError } = useQuery(clientQuery(username));
  const roles = useQuery(rolesQuery);

  const [textname, setTextname] = useState("");
  const [textdescription, setTextdescription] = useState("");
  const [password, setPassword] = useState("");
  const [roleToAdd, setRoleToAdd] = useState("");

  useEffect(() => {
    if (client) {
      setTextname(client.textname ?? "");
      setTextdescription(client.textdescription ?? "");
    }
  }, [client]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.client(username) });
    queryClient.invalidateQueries({ queryKey: queryKeys.clients });
  };

  const saveDetails = useMutation({
    mutationFn: () => api.clients.update(username, { textname, textdescription }),
    onSuccess: () => {
      refresh();
      toast.success("Details saved");
    },
    onError: (e) => fail(e, "Save failed"),
  });

  const changePassword = useMutation({
    mutationFn: () => api.clients.setPassword(username, password),
    onSuccess: () => {
      setPassword("");
      toast.success("Password updated");
    },
    onError: (e) => fail(e, "Password change failed"),
  });

  const addRole = useMutation({
    mutationFn: (rolename: string) => api.clients.addRole(username, rolename),
    onSuccess: () => {
      setRoleToAdd("");
      refresh();
      toast.success("Role added");
    },
    onError: (e) => fail(e, "Failed to add role"),
  });

  const removeRole = useMutation({
    mutationFn: (rolename: string) => api.clients.removeRole(username, rolename),
    onSuccess: () => {
      refresh();
      toast.success("Role removed");
    },
    onError: (e) => fail(e, "Failed to remove role"),
  });

  const toggle = useMutation({
    mutationFn: () =>
      client?.disabled ? api.clients.enable(username) : api.clients.disable(username),
    onSuccess: () => {
      refresh();
      toast.success(client?.disabled ? "Client enabled" : "Client disabled");
    },
    onError: (e) => fail(e, "Action failed"),
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate({ to: "/clients" })}>
          <ArrowLeft className="size-4" /> Back to clients
        </Button>
        <p className="text-sm text-muted-foreground">Client “{username}” not found.</p>
      </div>
    );
  }

  const assignedRoles = new Set((client?.roles ?? []).map((r) => r.rolename));
  const availableRoles = (roles.data?.items ?? []).filter((r) => !assignedRoles.has(r.rolename));

  return (
    <>
      <Button variant="ghost" className="w-fit" onClick={() => navigate({ to: "/clients" })}>
        <ArrowLeft className="size-4" /> Back to clients
      </Button>

      <PageHeader
        title={username}
        description="Client account details and role assignments."
        actions={
          <div className="flex items-center gap-2">
            {isLoading ? null : client?.disabled ? (
              <Badge variant="destructive">Disabled</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
            <Button variant="outline" onClick={() => toggle.mutate()} disabled={isLoading}>
              {client?.disabled ? (
                <>
                  <CheckCircle2 className="size-4" /> Enable
                </>
              ) : (
                <>
                  <Ban className="size-4" /> Disable
                </>
              )}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="destructive">
                  <Trash2 className="size-4" /> Delete
                </Button>
              }
              title={`Delete client “${username}”?`}
              description="This permanently removes the client from the broker."
              confirmLabel="Delete"
              onConfirm={async () => {
                try {
                  await api.clients.remove(username);
                  toast.success("Client deleted");
                  navigate({ to: "/clients" });
                } catch (e) {
                  fail(e, "Delete failed");
                }
              }}
            />
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="textname">Display name</Label>
                <Input id="textname" value={textname} onChange={(e) => setTextname(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  value={textdescription}
                  onChange={(e) => setTextdescription(e.target.value)}
                />
              </div>
              <Button onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending}>
                {saveDetails.isPending ? "Saving…" : "Save details"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reset password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">New password</Label>
                <Input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a new password"
                />
              </div>
              <Button
                onClick={() => changePassword.mutate()}
                disabled={!password || changePassword.isPending}
              >
                {changePassword.isPending ? "Updating…" : "Update password"}
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(client?.roles ?? []).map((r) => (
                  <Badge key={r.rolename} variant="secondary" className="gap-1 pr-1">
                    {r.rolename}
                    <button
                      type="button"
                      className="rounded-sm p-0.5 hover:bg-background/50"
                      onClick={() => removeRole.mutate(r.rolename)}
                      aria-label={`Remove ${r.rolename}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {!client?.roles?.length && (
                  <span className="text-sm text-muted-foreground">No roles assigned.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Add a role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.rolename} value={r.rolename}>
                        {r.rolename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={!roleToAdd || addRole.isPending}
                  onClick={() => addRole.mutate(roleToAdd)}
                >
                  Add role
                </Button>
              </div>
            </CardContent>
          </Card>

          {!!client?.groups?.length && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Groups</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {client.groups.map((g) => (
                  <Badge key={g.groupname} variant="outline">
                    {g.groupname}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
