"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/treatments", label: "Treatments" },
  { href: "/booking", label: "Book Now" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-slate-800 border-b-4 border-brand-gold shadow-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="MMT Logo"
            width={200}
            height={80}
            className="h-20 w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-12 text-sm">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition-colors ${
                isActive(l.href)
                  ? "font-bold text-brand-gold border-b-2 border-brand-gold pb-1"
                  : "font-medium text-white/80 hover:text-brand-gold"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-slate-700 border-t border-brand-gold/20 px-4 pb-4 space-y-3">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block text-white hover:text-brand-gold py-2 ${
                isActive(l.href) ? "font-bold text-brand-gold" : "font-medium"
              }`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
