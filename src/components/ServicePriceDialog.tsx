
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] animate-fade-in bg-white/95 backdrop-blur-sm border border-gray-100 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-800 mb-4">
            {serviceTitle}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(80vh-120px)]">
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-gray-700 font-medium">Услуга</TableHead>
                  <TableHead className="text-right text-gray-700 font-medium whitespace-nowrap">Цена от, ₽</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((item, index) => (
                  <TableRow 
                    key={index}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <TableCell className="text-gray-700">{item.service}</TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      {item.price.toLocaleString('ru-RU')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
