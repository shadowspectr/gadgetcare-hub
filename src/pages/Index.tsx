
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Contact } from "@/components/Contact";
import { Toaster } from "@/components/ui/toaster";

const Index = () => {
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-screen">
      <header>
        <Navbar />
      </header>
      <article>
        <Hero />
        <Services />
        <Contact />
      </article>
      <footer className="bg-gray-50 py-8 text-center text-sm text-gray-600">
        <div className="container mx-auto px-4">
          <p>© {currentYear} Доктор Гаджет. Все права защищены.</p>
          <p className="mt-2">
            <a href="/sitemap.xml" className="text-primary hover:underline">Карта сайта</a>
          </p>
        </div>
      </footer>
      
      {/* Микроразметка Schema.org для Google */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Доктор Гаджет",
          "description": "Сервисный центр по ремонту смартфонов, планшетов и ноутбуков в Донецке",
          "address": [
            {
              "@type": "PostalAddress",
              "streetAddress": "ул. Октября 16А",
              "addressLocality": "Донецк",
              "postalCode": "",
              "addressCountry": "RU"
            },
            {
              "@type": "PostalAddress",
              "streetAddress": "ул. Полоцкая 17 (Майский рынок)",
              "addressLocality": "Донецк",
              "postalCode": "",
              "addressCountry": "RU"
            },
            {
              "@type": "PostalAddress",
              "streetAddress": "ул. Горького 150",
              "addressLocality": "Донецк",
              "postalCode": "",
              "addressCountry": "RU"
            }
          ],
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "48.0020302",
            "longitude": "37.8037703"
          },
          "openingHours": "Mo-Su 09:00-17:00",
          "telephone": "+7 (949) 504-22-26",
          "email": "info@doctor-gadget.ru",
          "url": "https://doctor-gadget.ru",
          "image": "/og-image.png",
          "priceRange": "₽₽",
          "serviceArea": {
            "@type": "GeoCircle",
            "geoMidpoint": {
              "@type": "GeoCoordinates",
              "latitude": "48.0020302",
              "longitude": "37.8037703"
            },
            "geoRadius": "15000"
          }
        })}
      </script>
      
      <Toaster />
    </main>
  );
};

export { Index };
export default Index;
