import type { Metadata } from "next";
import "@fontsource/inter";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Josh Maggs | MMT – Mobile Sports Massage Therapy",
  description: "Professional mobile sports massage therapy in Bristol & Bath. Book online today.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-blue font-sans text-white antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
