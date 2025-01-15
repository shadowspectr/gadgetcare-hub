import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { SettingsManager } from "@/components/admin/SettingsManager";

export const Admin = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Панель администратора</h1>
      <Tabs defaultValue="services" className="w-full">
        <TabsList>
          <TabsTrigger value="services">Услуги</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <ServicesManager />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};