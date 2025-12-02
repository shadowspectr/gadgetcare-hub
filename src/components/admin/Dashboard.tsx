import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  recentOrders: any[];
  topProducts: any[];
  ordersByStatus: any[];
  salesByDay: any[];
}

const STATUS_COLORS = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  ready: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#ef4444"
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Принят",
  ready: "Готов",
  completed: "Выдан",
  cancelled: "Отменен"
};

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalInventoryValue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
    topProducts: [],
    ordersByStatus: [],
    salesByDay: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const { data: products } = await supabase
        .from("products")
        .select("*");

      // Fetch orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (products && orders) {
        // Calculate product stats
        const totalProducts = products.length;
        const lowStockProducts = products.filter(
          p => p.quantity > 0 && p.quantity <= (p.min_quantity || 5)
        ).length;
        const outOfStockProducts = products.filter(p => p.quantity === 0).length;
        const totalInventoryValue = products.reduce(
          (sum, p) => sum + (p.quantity || 0) * (p.retail_price || 0), 
          0
        );

        // Calculate order stats
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === "pending").length;
        const completedOrders = orders.filter(o => o.status === "completed").length;
        const totalRevenue = orders
          .filter(o => o.status === "completed")
          .reduce((sum, o) => sum + Number(o.total_amount), 0);

        // Orders by status for pie chart
        const statusCounts: Record<string, number> = {};
        orders.forEach(order => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
          name: STATUS_LABELS[status] || status,
          value: count,
          color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#888"
        }));

        // Sales by day (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const salesByDay = last7Days.map(day => {
          const dayOrders = orders.filter(o => {
            const orderDate = new Date(o.created_at).toISOString().split('T')[0];
            return orderDate === day && o.status === "completed";
          });
          const revenue = dayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
          return {
            date: new Date(day).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }),
            revenue,
            orders: dayOrders.length
          };
        });

        // Top products (from completed orders)
        const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
        orders
          .filter(o => o.status === "completed")
          .forEach(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            items.forEach((item: any) => {
              if (productSales[item.name]) {
                productSales[item.name].sales += item.quantity || 1;
                productSales[item.name].revenue += (item.price || 0) * (item.quantity || 1);
              } else {
                productSales[item.name] = {
                  name: item.name,
                  sales: item.quantity || 1,
                  revenue: (item.price || 0) * (item.quantity || 1)
                };
              }
            });
          });

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

        setStats({
          totalProducts,
          lowStockProducts,
          outOfStockProducts,
          totalInventoryValue,
          totalOrders,
          pendingOrders,
          completedOrders,
          totalRevenue,
          recentOrders: orders.slice(0, 5),
          topProducts,
          ordersByStatus,
          salesByDay
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Товаров на складе</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalProducts}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Стоимость склада</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats.totalInventoryValue.toLocaleString()}₽
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего заказов</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalOrders}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Общая выручка</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats.totalRevenue.toLocaleString()}₽
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats.lowStockProducts > 0 || stats.outOfStockProducts > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.lowStockProducts > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Заканчиваются товары</p>
                  <p className="text-sm text-yellow-700">{stats.lowStockProducts} товаров с низким остатком</p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.outOfStockProducts > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Нет в наличии</p>
                  <p className="text-sm text-red-700">{stats.outOfStockProducts} товаров закончились</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Продажи за неделю</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()}₽`, "Выручка"]}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#ea384c" 
                    strokeWidth={2}
                    dot={{ fill: "#ea384c" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Статусы заказов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {stats.ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.ordersByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {stats.ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">Нет данных о заказах</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Топ товаров</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, "Продано"]}
                      contentStyle={{ borderRadius: 8 }}
                    />
                    <Bar dataKey="sales" fill="#ea384c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Нет данных о продажах</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Последние заказы</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {order.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                      {order.status === "accepted" && <Clock className="h-4 w-4 text-blue-500" />}
                      {order.status === "ready" && <Package className="h-4 w-4 text-purple-500" />}
                      {order.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {order.status === "cancelled" && <XCircle className="h-4 w-4 text-red-500" />}
                      <div>
                        <p className="text-sm font-medium">
                          #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{Number(order.total_amount).toLocaleString()}₽</p>
                      <Badge 
                        variant="secondary"
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]}20`,
                          color: STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                        }}
                      >
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Нет заказов</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
