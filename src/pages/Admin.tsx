import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Dashboard } from "@/components/admin/Dashboard";
import { OrdersManagerNew } from "@/components/admin/OrdersManagerNew";
import { WarehouseManagerNew } from "@/components/admin/WarehouseManagerNew";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type AppRole = "admin" | "employee" | "observer";

export const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "orders":
        return <OrdersManagerNew />;
      case "warehouse":
        return <WarehouseManagerNew />;
      case "services":
        return <ServicesManager />;
      case "users":
        return isAdmin ? <UsersManager /> : null;
      case "settings":
        return <SettingsManager />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      dashboard: "Дашборд",
      orders: "Заказы",
      warehouse: "Складской учет",
      services: "Услуги",
      users: "Пользователи",
      settings: "Настройки"
    };
    return titles[activeTab] || "Админ-панель";
  };

  return (
    <div className="flex min-h-screen bg-muted/30 w-full">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
            <p className="text-muted-foreground text-sm">
              Доктор Гаджет — Панель управления
            </p>
          </div>
          
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Admin;
