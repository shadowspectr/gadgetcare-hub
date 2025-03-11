
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Contact } from "@/components/Contact";

export const Index = () => {
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
      <footer className="bg-gray-50 py-4 text-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} Доктор Гаджет. Все права защищены.</p>
      </footer>
    </main>
  );
};

export default Index;
