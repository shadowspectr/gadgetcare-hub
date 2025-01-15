import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderStatusDialog = ({ isOpen, onClose }: OrderStatusDialogProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-order-status', {
        body: { orderNumber }
      });

      if (error) throw error;
      setStatus(data.status);
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
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Введите номер заказа"
            />
          </div>
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
            <div className="p-4 bg-green-50 text-green-700 rounded-md">
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