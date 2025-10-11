import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ServicePriceEditor } from "./ServicePriceEditor";
import { Smartphone, Laptop, Tablet, Battery, Wifi, HardDrive } from "lucide-react";

const iconComponents = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  battery: Battery,
  wifi: Wifi,
  "hard-drive": HardDrive,
};

type Service = {
  id: string;
  title: string;
  description: string;
  icon: string;
  created_at?: string;
};

export const ServicesManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isPriceEditorOpen, setIsPriceEditorOpen] = useState(false);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at");

    if (error) {
      console.error("Error fetching services:", error);
      return;
    }

    setServices(data || []);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setIsEditDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedService) return;

    const formData = new FormData(event.currentTarget);
    const updatedService = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      icon: formData.get("icon") as keyof typeof iconComponents,
    };

    const { error } = await supabase
      .from("services")
      .update(updatedService)
      .eq("id", selectedService.id);

    if (error) {
      console.error("Error updating service:", error);
      return;
    }

    setIsEditDialogOpen(false);
    fetchServices();
  };

  const handlePrices = (service: Service) => {
    setSelectedService(service);
    setIsPriceEditorOpen(true);
  };

  const handleAdd = () => {
    setIsAddDialogOpen(true);
  };

  const handleAddService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const newService = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      icon: formData.get("icon") as keyof typeof iconComponents,
    };

    const { error } = await supabase
      .from("services")
      .insert(newService);

    if (error) {
      console.error("Error adding service:", error);
      return;
    }

    setIsAddDialogOpen(false);
    fetchServices();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleAdd}>
          Добавить услугу
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Иконка</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            const Icon = iconComponents[service.icon as keyof typeof iconComponents] || Smartphone;
            return (
              <TableRow key={service.id}>
                <TableCell>
                  <Icon className="h-6 w-6 text-primary" />
                </TableCell>
                <TableCell className="font-medium">{service.title}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(service)}
                    className="mr-2"
                  >
                    Изменить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrices(service)}
                  >
                    Цены
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать услугу</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Название
              </label>
              <Input
                id="title"
                name="title"
                defaultValue={selectedService?.title}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Описание
              </label>
              <Textarea
                id="description"
                name="description"
                defaultValue={selectedService?.description}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="icon" className="text-sm font-medium">
                Иконка
              </label>
              <select
                id="icon"
                name="icon"
                defaultValue={selectedService?.icon}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                required
              >
                {Object.keys(iconComponents).map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить новую услугу</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="add-title" className="text-sm font-medium">
                Название
              </label>
              <Input
                id="add-title"
                name="title"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="add-description" className="text-sm font-medium">
                Описание
              </label>
              <Textarea
                id="add-description"
                name="description"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="add-icon" className="text-sm font-medium">
                Иконка
              </label>
              <select
                id="add-icon"
                name="icon"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                required
              >
                {Object.keys(iconComponents).map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit">Добавить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedService && (
        <ServicePriceEditor
          isOpen={isPriceEditorOpen}
          onClose={() => setIsPriceEditorOpen(false)}
          serviceId={selectedService.id}
          serviceTitle={selectedService.title}
        />
      )}
    </div>
  );
};