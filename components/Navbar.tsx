"use client";
import Link from "next/link";
import Image from "next/image";
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
    <header className="fixed inset-x-0 top-0 z-50 bg-[#011a42]/95 backdrop-blur-sm border-b border-white/15">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex items-center gap-10 text-sm text-white/80">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-gold transition-colors font-medium tracking-wide">
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

        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="MMT Logo"
            width={80}
            height={32}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
      </nav>

      {open && (
        <div className="md:hidden bg-[#011a42] border-t border-white/15 px-4 pb-4 space-y-3">
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
