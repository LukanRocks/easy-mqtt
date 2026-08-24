import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShieldCheck, UserCog, Users, UsersRound } from "lucide-react";
import { DEFAULT_ACL_TYPES } from "@easy-mqtt/dynsec";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { clientsQuery, defaultAclQuery, groupsQuery, rolesQuery } from "@/lib/queries";

const ACL_LABELS: Record<string, string> = {
  publishClientSend: "Publish (send)",
  publishClientReceive: "Publish (receive)",
  subscribe: "Subscribe",
  unsubscribe: "Unsubscribe",
};

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
  to,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: typeof Users;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-12" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums">{value ?? 0}</p>
            )}
          </div>
          <div className="rounded-lg bg-muted p-3 text-muted-foreground">
            <Icon className="size-5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardPage() {
  const clients = useQuery(clientsQuery);
  const groups = useQuery(groupsQuery);
  const roles = useQuery(rolesQuery);
  const defaultAcl = useQuery(defaultAclQuery);

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your dynamic security configuration." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Clients"
          value={clients.data?.total}
          loading={clients.isLoading}
          icon={Users}
          to="/clients"
        />
        <StatCard
          label="Groups"
          value={groups.data?.total}
          loading={groups.isLoading}
          icon={UsersRound}
          to="/groups"
        />
        <StatCard
          label="Roles"
          value={roles.data?.total}
          loading={roles.isLoading}
          icon={ShieldCheck}
          to="/roles"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default ACL access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {defaultAcl.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            DEFAULT_ACL_TYPES.map((type) => {
              const acl = defaultAcl.data?.find((a) => a.acltype === type);
              const allow = acl?.allow ?? false;
              return (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{ACL_LABELS[type] ?? type}</span>
                  <Badge variant={allow ? "success" : "muted"}>{allow ? "Allow" : "Deny"}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/clients">
              <UserCog className="size-4" /> Manage clients
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/groups">
              <Plus className="size-4" /> New group
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/roles">
              <Plus className="size-4" /> New role
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
