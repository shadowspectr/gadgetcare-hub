import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }

      const isUserAdmin = session.user.role === 'admin';
      setIsAdmin(isUserAdmin);
      setIsLoading(false);

      if (!isUserAdmin) {
        navigate('/');
      }
    };

    checkAdmin();
  }, [navigate]);

  if (isLoading) {
    return <div className="container mx-auto p-8">Загрузка...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertDescription>
            У вас нет доступа к панели администратора
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Панель администратора</h1>
      <Tabs defaultValue="services" className="w-full">
        <TabsList>
          <TabsTrigger value="services">Услуги</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <ServicesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};