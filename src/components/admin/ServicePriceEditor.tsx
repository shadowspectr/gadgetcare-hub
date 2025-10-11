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
  service_id: string;
  device_type: string;
  repair_type: string;
  price: string;
  duration: string | null;
  created_at?: string;
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
  const [newPrice, setNewPrice] = useState({ 
    device_type: "", 
    repair_type: "", 
    price: "",
    duration: "" 
  });

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

    setPrices(data || []);
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrices();
    }
  }, [isOpen, serviceId]);

  const handleAddPrice = async () => {
    if (!newPrice.device_type || !newPrice.repair_type || !newPrice.price) return;

    const { error } = await supabase.from("service_prices").insert({
      service_id: serviceId,
      device_type: newPrice.device_type,
      repair_type: newPrice.repair_type,
      price: newPrice.price,
      duration: newPrice.duration || null,
    });

    if (error) {
      console.error("Error adding price:", error);
      return;
    }

    setNewPrice({ device_type: "", repair_type: "", price: "", duration: "" });
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Цены на услугу: {serviceTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-2">
            <Input
              placeholder="Устройство"
              value={newPrice.device_type}
              onChange={(e) =>
                setNewPrice({ ...newPrice, device_type: e.target.value })
              }
            />
            <Input
              placeholder="Тип ремонта"
              value={newPrice.repair_type}
              onChange={(e) =>
                setNewPrice({ ...newPrice, repair_type: e.target.value })
              }
            />
            <Input
              placeholder="Цена"
              value={newPrice.price}
              onChange={(e) =>
                setNewPrice({ ...newPrice, price: e.target.value })
              }
            />
            <Input
              placeholder="Срок"
              value={newPrice.duration}
              onChange={(e) =>
                setNewPrice({ ...newPrice, duration: e.target.value })
              }
            />
            <Button onClick={handleAddPrice}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Устройство</TableHead>
                <TableHead>Тип ремонта</TableHead>
                <TableHead>Цена от, ₽</TableHead>
                <TableHead>Срок</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{price.device_type}</TableCell>
                  <TableCell>{price.repair_type}</TableCell>
                  <TableCell>{price.price}</TableCell>
                  <TableCell>{price.duration || '—'}</TableCell>
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
