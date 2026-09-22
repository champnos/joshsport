"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/treatments", label: "Treatments" },
  { href: "/booking", label: "Book Now" },
  { href: "/account", label: "Account" },
  { href: "/terms", label: "T's & C's" },
  { href: "/contact", label: "Contact" },
];

interface AuthSessionResponse {
  customer: {
    is_admin?: boolean;
  } | null;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [showAdminLink, setShowAdminLink] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setShowAdminLink(false);
          return;
        }

        const payload = (await response.json()) as AuthSessionResponse;
        if (!cancelled) {
          setShowAdminLink(Boolean(payload.customer?.is_admin));
        }
      } catch {
        if (!cancelled) setShowAdminLink(false);
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const links = useMemo(
    () => (showAdminLink ? [...navLinks, { href: "/admin", label: "Admin" }] : navLinks),
    [showAdminLink],
  );

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-slate-900 border-b-2 border-brand-gold">
      <nav className="flex items-center justify-between px-6 lg:px-12 py-2">
        <Link href="/" className="flex items-center flex-shrink-0">
          <div className="drop-shadow-2xl" style={{
            filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))"
          }}>
            <Image
              src="/logo.png"
              alt="MMT Logo"
              width={280}
              height={112}
              className="h-28 w-auto object-contain"
              priority
            />
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-12">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "text-brand-gold border-b-2 border-brand-gold pb-1"
                  : "text-white/70 hover:text-white"
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
        <div className="md:hidden bg-slate-800 border-t border-brand-gold px-6 pb-4 space-y-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block text-sm py-2 transition-colors ${
                isActive(l.href)
                  ? "font-bold text-brand-gold"
                  : "text-white/70 hover:text-white"
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
