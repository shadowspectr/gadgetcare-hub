import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

type ServicePrice = {
  id: string;
  name: string;
  price: number;
};

interface ServicePriceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceTitle: string;
}

export const ServicePriceEditor = ({
  isOpen,
  onClose,
  serviceId,
  serviceTitle,
}: ServicePriceEditorProps) => {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [newPrice, setNewPrice] = useState({ name: "", price: "" });

  const fetchPrices = async () => {
    const { data, error } = await supabase
      .from("service_prices")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at");

    if (error) {
      console.error("Error fetching prices:", error);
      return;
    }

    setPrices(data);
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrices();
    }
  }, [isOpen, serviceId]);

  const handleAddPrice = async () => {
    if (!newPrice.name || !newPrice.price) return;

    const { error } = await supabase.from("service_prices").insert({
      service_id: serviceId,
      name: newPrice.name,
      price: parseInt(newPrice.price),
    });

    if (error) {
      console.error("Error adding price:", error);
      return;
    }

    setNewPrice({ name: "", price: "" });
    fetchPrices();
  };

  const handleDeletePrice = async (priceId: string) => {
    const { error } = await supabase
      .from("service_prices")
      .delete()
      .eq("id", priceId);

    if (error) {
      console.error("Error deleting price:", error);
      return;
    }

    fetchPrices();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Цены на услугу: {serviceTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex gap-4">
            <Input
              placeholder="Название услуги"
              value={newPrice.name}
              onChange={(e) =>
                setNewPrice({ ...newPrice, name: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Цена"
              value={newPrice.price}
              onChange={(e) =>
                setNewPrice({ ...newPrice, price: e.target.value })
              }
            />
            <Button onClick={handleAddPrice}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Услуга</TableHead>
                <TableHead className="text-right">Цена от, ₽</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{price.name}</TableCell>
                  <TableCell className="text-right">
                    {price.price.toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePrice(price.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};