import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface OrderStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shop {
  id: string;
  name: string;
}

export const OrderStatusDialog = ({ isOpen, onClose }: OrderStatusDialogProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusColor, setStatusColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  const handleCheck = async () => {
    setIsLoading(true);
    setError(null);
    setStatus(null);
    setStatusColor(null);
    setShops([]);

    try {
      const { data, error } = await supabase.functions.invoke('check-order-status', {
        body: { 
          orderNumber,
          shopId: selectedShop
        }
      });

      if (error) throw error;

      if (data.shops) {
        setShops(data.shops);
        if (data.shops.length > 0 && !selectedShop) {
          setStatus("Выберите сервисный центр, где был оставлен заказ");
        } else {
          setStatus(data.status);
          setStatusColor(data.statusColor);
        }
      } else {
        setStatus(data.status);
        setStatusColor(data.statusColor);
      }
    } catch (err) {
      setError('Не удалось получить статус заказа. Пожалуйста, попробуйте позже.');
      console.error('Error checking order status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Проверка статуса заказа</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="orderNumber" className="text-sm font-medium">
              Номер заказа
            </label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value);
                setSelectedShop(null);
                setShops([]);
                setStatus(null);
                setStatusColor(null);
              }}
              placeholder="Введите номер заказа"
            />
          </div>

          {shops.length > 0 && (
            <div className="space-y-2">
              <Label>Выберите сервисный центр</Label>
              <RadioGroup
                value={selectedShop || ""}
                onValueChange={(value) => setSelectedShop(value)}
                className="space-y-2"
              >
                {shops.map((shop) => (
                  <div key={shop.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={shop.id} id={shop.id} />
                    <Label htmlFor={shop.id}>{shop.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <Button
            onClick={handleCheck}
            disabled={!orderNumber || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Проверка...
              </>
            ) : (
              "Проверить статус"
            )}
          </Button>

          {status && (
            <div 
              className="p-4 rounded-md"
              style={{
                backgroundColor: statusColor ? `${statusColor}15` : '#f0fdf4',
                color: statusColor || '#15803d'
              }}
            >
              <p className="font-medium">Статус заказа:</p>
              <p>{status}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};