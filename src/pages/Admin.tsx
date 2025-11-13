import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { WarehouseManager } from "@/components/admin/WarehouseManager";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut } from "lucide-react";

type AppRole = "admin" | "employee" | "observer";

export const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch user roles
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) throw error;

      const userRolesList = roles?.map(r => r.role as AppRole) || [];
      setUserRoles(userRolesList);

      if (userRolesList.length === 0) {
        toast({
          title: "Доступ запрещен",
          description: "У вас нет прав для доступа к панели администратора",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        navigate("/auth");
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isAdmin = userRoles.includes("admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Панель администратора</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </div>
      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="warehouse">Складской учет</TabsTrigger>
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="services">Услуги</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Пользователи</TabsTrigger>}
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <OrdersManager />
        </TabsContent>
        <TabsContent value="warehouse">
          <WarehouseManager />
        </TabsContent>
        <TabsContent value="products">
          <ProductsManager />
        </TabsContent>
        <TabsContent value="services">
          <ServicesManager />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users">
            <UsersManager />
          </TabsContent>
        )}
        <TabsContent value="settings">
          <SettingsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;