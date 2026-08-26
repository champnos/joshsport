"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/treatments", label: "Treatments" },
  { href: "/booking", label: "Book Now" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-brand-blue border-b border-white/10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-gold transition-colors font-medium">
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

        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg bg-white px-3 py-1">
            <span className="text-brand-blue font-bold text-xl tracking-tight">MMT</span>
          </div>
        </Link>
      </nav>

      {open && (
        <div className="md:hidden bg-brand-blue border-t border-white/10 px-4 pb-4 space-y-3">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-white hover:text-brand-gold py-2 font-medium"
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
