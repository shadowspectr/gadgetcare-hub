import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ServicePriceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  prices: Array<{
    service: string;
    price: number;
  }>;
}

export const ServicePriceDialog = ({
  isOpen,
  onClose,
  serviceTitle,
  prices,
}: ServicePriceDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{serviceTitle}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Услуга</TableHead>
              <TableHead className="text-right">Цена от, ₽</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.service}</TableCell>
                <TableCell className="text-right">{item.price.toLocaleString('ru-RU')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};