-- Enable realtime for orders table to sync status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;