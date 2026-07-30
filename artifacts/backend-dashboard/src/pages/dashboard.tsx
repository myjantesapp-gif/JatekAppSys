import { useState } from "react";
import { 
  useGetBackendDashboard, 
  useListBackendTodos, 
  useCreateBackendTodo, 
  useToggleBackendTodo, 
  useDeleteBackendTodo,
  useListBackendOrders,
  getListBackendTodosQueryKey,
  useBackendMe,
  GetBackendDashboardRange
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ShoppingCart, 
  XCircle, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Star, 
  DollarSign, 
  Truck, 
  Receipt, 
  Percent,
  Plus,
  Trash2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

function KpiCard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function TodosWidget() {
  const { data: todos, isLoading } = useListBackendTodos();
  const createTodo = useCreateBackendTodo();
  const toggleTodo = useToggleBackendTodo();
  const deleteTodo = useDeleteBackendTodo();
  const queryClient = useQueryClient();
  const [newTodo, setNewTodo] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    createTodo.mutate(
      { data: { text: newTodo } },
      {
        onSuccess: () => {
          setNewTodo("");
          queryClient.invalidateQueries({ queryKey: getListBackendTodosQueryKey() });
        }
      }
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>My Todos</CardTitle>
        <CardDescription>Tasks and reminders</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <form onSubmit={handleAdd} className="flex space-x-2 mb-4">
          <Input 
            placeholder="Add a task..." 
            value={newTodo} 
            onChange={(e) => setNewTodo(e.target.value)}
            disabled={createTodo.isPending}
          />
          <Button type="submit" size="icon" disabled={createTodo.isPending || !newTodo.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
          ) : todos?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">No tasks yet.</div>
          ) : (
            todos?.map((todo) => (
              <div key={todo.id} className="flex items-center justify-between group rounded-md hover:bg-muted/50 p-2 -mx-2 transition-colors">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    checked={todo.done} 
                    onCheckedChange={(checked) => {
                      toggleTodo.mutate(
                        { id: todo.id, data: { done: !!checked } },
                        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBackendTodosQueryKey() }) }
                      );
                    }}
                  />
                  <span className={`text-sm ${todo.done ? 'line-through text-muted-foreground' : ''}`}>
                    {todo.text}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
                  onClick={() => {
                    deleteTodo.mutate(
                      { id: todo.id },
                      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBackendTodosQueryKey() }) }
                    );
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentOrders() {
  const { data: orders, isLoading } = useListBackendOrders({ limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !orders?.length ? (
           <div className="text-center text-muted-foreground text-sm py-4">No recent orders.</div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Order #{order.id}</p>
                  <p className="text-xs text-muted-foreground">{order.restaurantName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{order.total} DH</p>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary uppercase">
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: me } = useBackendMe();
  const [range, setRange] = useState<GetBackendDashboardRange>("week");
  const { data: dashboard, isLoading } = useGetBackendDashboard({ range });

  const isEmployee = me?.user.role === "employee";

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as GetBackendDashboardRange)}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="In Progress Orders" value={dashboard.inProgressOrders} icon={ShoppingCart} />
        <KpiCard title="Delivered Orders" value={dashboard.deliveredOrders} icon={CheckCircle} />
        <KpiCard title="Cancelled Orders" value={dashboard.cancelledOrders} icon={XCircle} />
        <KpiCard title="Out of Stock" value={dashboard.outOfStockProducts} icon={AlertTriangle} />
        
        <KpiCard title="Total Products" value={dashboard.totalProducts} icon={Package} />
        <KpiCard title="Reviews" value={dashboard.orderReviews} icon={Star} />
        
        {!isEmployee && (
          <>
            <KpiCard title="Total Earned" value={`${dashboard.totalEarned} DH`} icon={DollarSign} />
            <KpiCard title="Delivery Earning" value={`${dashboard.deliveryEarning} DH`} icon={Truck} />
            <KpiCard title="Tax" value={`${dashboard.totalOrderTax} DH`} icon={Receipt} />
            <KpiCard title="Commission" value={`${dashboard.totalCommission} DH`} icon={Percent} />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Orders Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.ordersChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="label" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <div className="col-span-3 space-y-4 flex flex-col">
          <div className="flex-1">
            <TodosWidget />
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-1">
        <RecentOrders />
      </div>
    </div>
  );
}
