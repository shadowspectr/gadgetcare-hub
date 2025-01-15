import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServicesManager } from "@/components/admin/ServicesManager";

export const Admin = () => {
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