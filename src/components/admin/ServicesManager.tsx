import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Smartphone, Laptop, Tablet, Battery, Wifi, HardDrive, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const iconComponents = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  battery: Battery,
  wifi: Wifi,
  "hard-drive": HardDrive,
};

type ServiceCategory = {
  id: string;
  name: string;
  icon: string | null;
  created_at?: string;
};

type Service = {
  id: string;
  category_id: string;
  name: string;
  price: string;
  created_at?: string;
};

export const ServicesManager = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [isEditServiceDialogOpen, setIsEditServiceDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("created_at");

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    setCategories(data || []);
  };

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
    fetchCategories();
    fetchServices();
  }, []);

  const handleAddCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const { error } = await supabase
      .from("service_categories")
      .insert({
        name: formData.get("name") as string,
        icon: formData.get("icon") as string,
      });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось добавить категорию", variant: "destructive" });
      return;
    }

    toast({ title: "Успешно", description: "Категория добавлена" });
    setIsAddCategoryDialogOpen(false);
    fetchCategories();
  };

  const handleEditCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCategory) return;

    const formData = new FormData(event.currentTarget);
    
    const { error } = await supabase
      .from("service_categories")
      .update({
        name: formData.get("name") as string,
        icon: formData.get("icon") as string,
      })
      .eq("id", selectedCategory.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить категорию", variant: "destructive" });
      return;
    }

    toast({ title: "Успешно", description: "Категория обновлена" });
    setIsEditCategoryDialogOpen(false);
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("service_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить категорию", variant: "destructive" });
      return;
    }

    toast({ title: "Успешно", description: "Категория удалена" });
    fetchCategories();
  };

  const handleAddService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const { error } = await supabase
      .from("services")
      .insert({
        category_id: formData.get("category_id") as string,
        name: formData.get("name") as string,
        price: formData.get("price") as string,
      });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось добавить услугу", variant: "destructive" });
      return;
    }

    toast({ title: "Успешно", description: "Услуга добавлена" });
    setIsAddServiceDialogOpen(false);
    fetchServices();
  };

  const handleEditService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedService) return;

    const formData = new FormData(event.currentTarget);
    
    const { error } = await supabase
      .from("services")
      .update({
        category_id: formData.get("category_id") as string,
        name: formData.get("name") as string,
        price: formData.get("price") as string,
      })
      .eq("id", selectedService.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить услугу", variant: "destructive" });
      return;
    }

    toast({ title: "Успешно", description: "Услуга обновлена" });
    setIsEditServiceDialogOpen(false);
    fetchServices();
  };

  const handleDeleteService = async (id: string) => {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить услугу", variant: "destructive" });
      return;
    }

    toast({ title: "Успешно", description: "Услуга удалена" });
    fetchServices();
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        for (const row of jsonData) {
          const categoryName = row['Категория'] || row['Category'];
          const serviceName = row['Услуга'] || row['Service'];
          const price = row['Цена'] || row['Price'];

          if (!categoryName || !serviceName || !price) continue;

          let categoryId: string;
          const { data: existingCategory } = await supabase
            .from("service_categories")
            .select("id")
            .eq("name", categoryName)
            .single();

          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            const { data: newCategory, error } = await supabase
              .from("service_categories")
              .insert({ name: categoryName })
              .select("id")
              .single();

            if (error || !newCategory) continue;
            categoryId = newCategory.id;
          }

          await supabase
            .from("services")
            .insert({
              category_id: categoryId,
              name: serviceName,
              price: price.toString(),
            });
        }

        toast({ title: "Успешно", description: "Услуги импортированы из Excel" });
        fetchCategories();
        fetchServices();
      } catch (error) {
        toast({ title: "Ошибка", description: "Не удалось импортировать Excel файл", variant: "destructive" });
      }
    };

    reader.readAsBinaryString(file);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Неизвестная категория";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Управление услугами</h2>
        <div className="flex gap-2">
          <label htmlFor="excel-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Импорт из Excel
              </span>
            </Button>
          </label>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelImport}
          />
          <Button onClick={() => setIsAddCategoryDialogOpen(true)} variant="outline">
            Добавить категорию
          </Button>
          <Button onClick={() => setIsAddServiceDialogOpen(true)}>
            Добавить услугу
          </Button>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg border">
        <p className="text-sm text-muted-foreground">
          <strong>Формат Excel файла:</strong> 3 колонки с заголовками "Категория", "Услуга", "Цена". 
          <a 
            href="/excel-template-example.md" 
            target="_blank" 
            className="text-primary hover:underline ml-1"
          >
            Подробная инструкция
          </a>
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Категории</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Иконка</TableHead>
              <TableHead>Название</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const Icon = category.icon && category.icon in iconComponents 
                ? iconComponents[category.icon as keyof typeof iconComponents]
                : null;
              
              return (
                <TableRow key={category.id}>
                  <TableCell>
                    {Icon ? <Icon className="h-5 w-5 text-primary" /> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsEditCategoryDialogOpen(true);
                      }}
                      className="mr-2"
                    >
                      Изменить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Удалить
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Услуги</h3>
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Категория</TableHead>
            <TableHead>Услуга</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{getCategoryName(service.category_id)}</TableCell>
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.price} ₽</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedService(service);
                    setIsEditServiceDialogOpen(true);
                  }}
                  className="mr-2"
                >
                  Изменить
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteService(service.id)}
                >
                  Удалить
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>

      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить категорию</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="category-name" className="text-sm font-medium">Название</label>
              <Input id="category-name" name="name" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="category-icon" className="text-sm font-medium">Иконка (необязательно)</label>
              <select
                id="category-icon"
                name="icon"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Без иконки</option>
                {Object.keys(iconComponents).map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit">Добавить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать категорию</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-category-name" className="text-sm font-medium">Название</label>
              <Input 
                id="edit-category-name" 
                name="name" 
                defaultValue={selectedCategory?.name}
                required 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-category-icon" className="text-sm font-medium">Иконка</label>
              <select
                id="edit-category-icon"
                name="icon"
                defaultValue={selectedCategory?.icon || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Без иконки</option>
                {Object.keys(iconComponents).map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddServiceDialogOpen} onOpenChange={setIsAddServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить услугу</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="service-category" className="text-sm font-medium">Категория</label>
              <Select name="category_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="service-name" className="text-sm font-medium">Название услуги</label>
              <Input id="service-name" name="name" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="service-price" className="text-sm font-medium">Цена (₽)</label>
              <Input id="service-price" name="price" required />
            </div>
            <DialogFooter>
              <Button type="submit">Добавить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditServiceDialogOpen} onOpenChange={setIsEditServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать услугу</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditService} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-category" className="text-sm font-medium">Категория</label>
              <Select name="category_id" defaultValue={selectedService?.category_id} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">Название услуги</label>
              <Input id="edit-name" name="name" defaultValue={selectedService?.name} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-price" className="text-sm font-medium">Цена (₽)</label>
              <Input id="edit-price" name="price" defaultValue={selectedService?.price} required />
            </div>
            <DialogFooter>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
