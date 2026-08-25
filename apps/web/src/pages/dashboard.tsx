import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateClientDialog } from "@/components/create-client-dialog";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { CreateRoleDialog } from "@/components/create-role-dialog";
import { PageHeader } from "@/components/page-header";
import { clientsQuery, groupsQuery, rolesQuery } from "@/lib/queries";

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
          icon={Boxes}
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
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <CreateClientDialog
            trigger={
              <Button variant="outline">
                <Plus className="size-4" /> New client
              </Button>
            }
          />
          <CreateGroupDialog
            trigger={
              <Button variant="outline">
                <Plus className="size-4" /> New group
              </Button>
            }
          />
          <CreateRoleDialog
            trigger={
              <Button variant="outline">
                <Plus className="size-4" /> New role
              </Button>
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
