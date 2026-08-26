export default function Footer() {
  return (
    <footer className="bg-brand-blue border-t border-white/20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-white">Josh Maggs</h2>
          <p className="mt-3 text-sm text-white/70">
            Sports massage therapy tailored for athletes, active individuals and anyone needing better recovery in Bristol & Bath
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-gold">Instagram</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><a href="https://instagram.com/maggsymt" target="_blank" rel="noreferrer" className="hover:text-brand-gold transition-colors">@maggsymt</a></li>
            <li><a href="https://instagram.com/asprintersblog" target="_blank" rel="noreferrer" className="hover:text-brand-gold transition-colors">@asprintersblog</a></li>
            <li><a href="https://instagram.com/joshmaggs._" target="_blank" rel="noreferrer" className="hover:text-brand-gold transition-colors">@joshmaggs._</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-gold">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><a href="mailto:hello@maggsymassagetherapy.com" className="hover:text-brand-gold transition-colors">hello@maggsymassagetherapy.com</a></li>
            <li>Bristol & Bath</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
