import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Josh Maggs | Sports Massage Therapy",
  description: "Sports massage therapy in Bath & Bristol for recovery, performance and injury prevention.",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/treatments", label: "Treatments" },
  { href: "/booking", label: "Book Now" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gray-950 font-sans text-gray-100 antialiased`}>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.18),_transparent_35%),linear-gradient(to_bottom,_#0b0f0d,_#030712)]">
          <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-gray-950/85 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-white sm:text-base">
                Josh Maggs <span className="text-green-500">|</span> Sports Massage
              </Link>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="transition hover:text-white">
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </header>
          <main className="pt-20">{children}</main>
          <footer className="border-t border-white/10 bg-gray-950/90">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Josh Maggs</h2>
                <p className="mt-3 max-w-md text-sm text-gray-400">
                  Sports massage therapy tailored for athletes, active professionals and anyone needing better recovery in Bath & Bristol.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-200">Instagram</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-400">
                  <li><a className="hover:text-white" href="https://instagram.com/maggsymt" target="_blank" rel="noreferrer">@maggsymt</a></li>
                  <li><a className="hover:text-white" href="https://instagram.com/asprinterblog" target="_blank" rel="noreferrer">@asprinterblog</a></li>
                  <li><a className="hover:text-white" href="https://instagram.com/joshmags_" target="_blank" rel="noreferrer">@joshmags_</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-200">Contact</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-400">
                  <li><a className="hover:text-white" href="mailto:hello@joshmaggsmassage.com">hello@joshmaggsmassage.com</a></li>
                  <li>Bath & Bristol</li>
                </ul>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
