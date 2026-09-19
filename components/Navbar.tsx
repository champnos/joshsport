"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/treatments", label: "Treatments" },
  { href: "/booking", label: "Book Now" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActiveLink = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-brand-blue border-b border-white/10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center rounded-lg bg-white px-2 py-1 shadow-sm">
          <Image
            src="/logo.png"
            alt="MMT Logo"
            width={160}
            height={64}
            className="h-16 w-auto object-contain"
            priority
          />
        </Link>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <div className="hidden md:flex flex-1 justify-center items-center gap-10 text-sm text-white/90">
          {navLinks.map((l) => {
            const active = isActiveLink(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors tracking-wide ${active ? "font-bold text-white" : "font-semibold hover:text-brand-gold"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {open && (
        <div className="md:hidden bg-[#011a42] border-t border-white/15 px-4 pb-4 space-y-3">
          {navLinks.map((l) => {
            const active = isActiveLink(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block py-2 ${active ? "font-bold text-white" : "font-semibold text-white hover:text-brand-gold"}`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
