import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Showcase } from "@/components/marketing/Showcase";
import { CTA } from "@/components/marketing/CTA";
import { Footer } from "@/components/marketing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
