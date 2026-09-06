"use client";

import { useEffect, useState } from "react";
import { Instagram, Facebook, Music, Mail, MapPin } from "lucide-react";

interface SocialSettings {
  instagram: string;
  facebook: string;
  tiktok: string;
  email: string;
}

export default function Footer() {
  const [socials, setSocials] = useState<SocialSettings>({
    instagram: "",
    facebook: "",
    tiktok: "",
    email: "",
  });

  useEffect(() => {
    const fetchSocials = async () => {
      try {
        const res = await fetch("/api/admin/settings/social");
        if (res.ok) {
          const data = await res.json();
          setSocials(data);
        }
      } catch (err) {
        console.error("Failed to load social links:", err);
      }
    };
    fetchSocials();
  }, []);

  return (
    <footer className="bg-brand-blue border-t-2 border-brand-gold/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* About */}
          <div>
            <h2 className="text-xl font-bold text-white">Josh Maggs</h2>
            <p className="mt-3 text-sm text-white/70">
              Sports massage therapy tailored for athletes, active individuals and anyone needing better recovery in Bristol & Bath
            </p>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-gold">Follow</h3>
            <div className="mt-4 flex gap-4">
              {socials.instagram && (
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 hover:text-brand-gold transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {socials.facebook && (
                <a
                  href={socials.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 hover:text-brand-gold transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {socials.tiktok && (
                <a
                  href={socials.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 hover:text-brand-gold transition-colors"
                  aria-label="TikTok"
                >
                  <Music className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-gold">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {socials.email && (
                <li>
                  <a href={`mailto:${socials.email}`} className="flex items-center gap-2 hover:text-brand-gold transition-colors">
                    <Mail className="h-4 w-4" />
                    {socials.email}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Bristol & Bath
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 border-t border-white/10 pt-8 text-center text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} Josh Maggs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
