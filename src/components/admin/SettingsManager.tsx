import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export const SettingsManager = () => {
  const [mapUrl, setMapUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMapUrl();
  }, []);

  const fetchMapUrl = async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "yandex_map_url")
      .single();

    if (error) {
      console.error("Error fetching map URL:", error);
      return;
    }

    if (data?.value) {
      setMapUrl(data.value);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const { error: upsertError } = await supabase
        .from("settings")
        .upsert(
          { 
            key: "yandex_map_url", 
            value: mapUrl,
            updated_at: new Date().toISOString()
          },
          { onConflict: "key" }
        );

      if (upsertError) throw upsertError;

      toast({
        title: "Настройки сохранены",
        description: "URL карты успешно обновлен",
      });

      // Refresh the map URL to ensure it's updated
      await fetchMapUrl();
    } catch (error) {
      console.error("Error updating map URL:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Настройки карты</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="mapUrl" className="text-sm font-medium">
              URL карты Яндекс
            </label>
            <Input
              id="mapUrl"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="Введите URL карты"
            />
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
};