import { useListBackendRoles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Check, Minus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL_PERMISSIONS = [
  { key: "manage_system", label: "Manage System Settings" },
  { key: "manage_staff", label: "Manage Staff" },
  { key: "view_finance", label: "View Financial Reports" },
  { key: "manage_shops", label: "Manage Shops" },
  { key: "manage_products", label: "Manage Menu/Products" },
  { key: "process_orders", label: "Process Orders" },
  { key: "view_orders", label: "View Orders" },
];

export default function Roles() {
  const { data: roles, isLoading } = useListBackendRoles();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Access Matrix</span>
          </CardTitle>
          <CardDescription>System capabilities by role.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Capability</TableHead>
                  {roles?.map(role => (
                    <TableHead key={role.key} className="text-center">
                      <div className="font-bold capitalize text-primary">{role.label}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_PERMISSIONS.map(perm => (
                  <TableRow key={perm.key}>
                    <TableCell className="font-medium text-muted-foreground">{perm.label}</TableCell>
                    {roles?.map(role => {
                      const hasPerm = role.permissions.includes(perm.key) || role.permissions.includes("*");
                      return (
                        <TableCell key={`${role.key}-${perm.key}`} className="text-center">
                          {hasPerm ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted/30 mx-auto" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
