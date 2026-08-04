import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Baby,
  Stethoscope,
  Clock,
  MapPin,
  Star,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bike,
  Smartphone,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const Wave = () => (
  <svg
    viewBox="0 0 1440 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute -bottom-px left-0 w-full h-auto"
    preserveAspectRatio="none"
  >
    <path
      d="M0 120L48 108C96 96 192 72 288 66C384 60 480 72 576 78C672 84 768 84 864 78C960 72 1056 60 1152 60C1248 60 1344 72 1392 78L1440 84V0H1392C1344 0 1248 0 1152 0C1056 0 960 0 864 0C768 0 672 0 576 0C480 0 384 0 288 0C192 0 96 0 48 0H0V120Z"
      fill="white"
    />
  </svg>
);

const NAV_LINKS = [
  { href: '#services', label: 'Services', color: 'hover:text-brand-pink' },
  { href: '#tracking', label: 'Suivi Live', color: 'hover:text-brand-teal' },
  { href: '#promos', label: 'Promos', color: 'hover:text-brand-yellow' },
  { href: '#download', label: 'Télécharger', color: 'hover:text-brand-pink' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#EBEBEB]/80">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/jatek-logo.png" alt="Logo Jatek" className="h-8 md:h-9 w-auto object-contain" />
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#6B7280]">
          {NAV_LINKS.slice(0, 3).map(l => (
            <a key={l.href} href={l.href} className={`transition-colors ${l.color}`}>{l.label}</a>
          ))}
        </div>

        {/* Desktop CTA */}
        <a
          href="#download"
          className="hidden md:inline-flex bg-brand-pink text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-brand-pink-deep transition-all duration-300 shadow-soft shrink-0"
        >
          Télécharger l'app
        </a>

        {/* Mobile: hamburger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 rounded-xl text-[#0A1B3D] hover:bg-[#F5F5F5] transition-colors"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden bg-white border-t border-[#EBEBEB]"
          >
            <div className="px-5 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`py-3 px-4 rounded-xl font-semibold text-[#0A1B3D] text-base transition-colors hover:bg-[#FFF0F6] ${l.color}`}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#download"
                onClick={() => setOpen(false)}
                className="mt-2 bg-brand-pink text-white py-3.5 rounded-full font-bold text-base text-center hover:bg-brand-pink-deep transition-all duration-300 shadow-soft"
              >
                Télécharger l'app
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => (
  <section className="relative pt-24 md:pt-28 pb-16 md:pb-24 overflow-hidden bg-brand-pink">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-yellow rounded-full blur-3xl" />
    </div>

    <Wave />

    <div className="max-w-7xl mx-auto px-6 relative z-10 w-full grid lg:grid-cols-2 gap-12 items-center">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="max-w-2xl text-white"
      >
        <motion.div
          variants={fadeIn}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-xs font-bold backdrop-blur-sm mb-6"
        >
          <MapPin className="w-3.5 h-3.5" /> <span>Disponible partout à Oujda</span>
        </motion.div>

        <motion.h1
          variants={fadeIn}
          className="text-4xl md:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight"
        >
          Tout Oujda, <br />
          <span className="text-brand-yellow">livré chez vous.</span>
        </motion.h1>

        <motion.p
          variants={fadeIn}
          className="text-lg md:text-xl text-white/90 mb-10 max-w-lg leading-relaxed"
        >
          Restaurants, épiceries, beauté, bébé et pharmacie. Ce dont vous avez besoin,
          quand vous en avez besoin, livré en un clin d'œil par nos super-drivers.
        </motion.p>

        <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="bg-white p-4 rounded-3xl shadow-elevated flex items-center gap-5">
            <QRCodeSVG
              value="https://ma.jatek.app/mobile/"
              size={88}
              level="H"
              fgColor="#0A1B3D"
              bgColor="#ffffff"
            />
            <div>
              <p className="font-bold text-[#0A1B3D] text-lg mb-1">Scanner pour télécharger</p>
              <p className="text-xs text-[#6B7280]">iOS & Android</p>
            </div>
          </div>
          <a
            href="#download"
            className="group flex items-center gap-3 bg-brand-yellow text-[#0A1B3D] px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-brand-pink transition-all duration-300 shadow-elevated"
          >
            Commander <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="hidden lg:flex justify-center relative"
      >
        <div className="relative w-[320px] h-[640px] bg-white border-[8px] border-[#0A1B3D] rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-6 bg-[#0A1B3D] rounded-b-3xl w-32 mx-auto z-50" />

          <div className="absolute inset-0 bg-white">
            <div className="p-5 pt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-[#6B7280]">Livrer à</p>
                  <p className="font-bold text-sm flex items-center gap-1 text-[#0A1B3D]">
                    <MapPin className="w-3 h-3 text-brand-pink" /> Hay El Qods, Oujda
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#F5F5F5]" />
              </div>

              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Que cherchez-vous ?"
                  className="w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-full py-3 px-4 text-sm text-[#0A1B3D] outline-none"
                  disabled
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: UtensilsCrossed, color: 'text-[#B85C00]', bg: 'bg-[#FFF6CC]', label: 'Repas' },
                  { icon: ShoppingBag, color: 'text-[#2E7D32]', bg: 'bg-[#E8F5E9]', label: 'Épicerie' },
                  { icon: Sparkles, color: 'text-[#C2185B]', bg: 'bg-[#FFF0F8]', label: 'Beauté' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <span className="text-[10px] font-semibold text-[#6B7280]">{item.label}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-bold text-sm mb-4 text-[#0A1B3D]">Recommandé pour vous</h3>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-[#F5F5F5] rounded-2xl border border-[#EBEBEB] animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="absolute top-36 -left-8 bg-white border border-[#EBEBEB] p-4 rounded-2xl flex items-center gap-3 z-30 shadow-soft"
        >
          <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center">
            <Star className="w-5 h-5 text-[#0A1B3D] fill-[#0A1B3D]" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280]">Tacos de Lyon</p>
            <p className="font-bold text-sm text-[#0A1B3D]">En route !</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

const CategoryCard = ({ title, icon: Icon, color, bg, textColor, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay }}
    className="group bg-white border border-[#EBEBEB] rounded-3xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300 cursor-pointer"
  >
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:-translate-y-1"
      style={{ backgroundColor: bg }}
    >
      <Icon className="w-7 h-7" style={{ color }} />
    </div>
    <h3 className="font-bold text-xl text-[#0A1B3D] mb-2">{title}</h3>
    <p className="text-sm text-[#6B7280] leading-relaxed">
      Commandez en ligne et recevez rapidement chez vous.
    </p>
  </motion.div>
);

const Verticals = () => (
  <section id="services" className="py-20 md:py-28 px-6 bg-white">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-[#0A1B3D]">
          La ville entière dans votre poche.
        </h2>
        <p className="text-[#6B7280] text-lg max-w-xl mx-auto">
          Vos envies n'attendent pas. Jatek non plus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CategoryCard
          title="Restaurants"
          icon={UtensilsCrossed}
          color="#B85C00"
          bg="#FFF6CC"
          delay={0.1}
        />
        <CategoryCard
          title="Épicerie"
          icon={ShoppingBag}
          color="#2E7D32"
          bg="#E8F5E9"
          delay={0.2}
        />
        <CategoryCard
          title="Beauté & Soins"
          icon={Sparkles}
          color="#C2185B"
          bg="#FFF0F8"
          delay={0.3}
        />
        <CategoryCard
          title="Bébé"
          icon={Baby}
          color="#E65100"
          bg="#FFF3E0"
          delay={0.4}
        />
        <CategoryCard
          title="Pharmacie"
          icon={Stethoscope}
          color="#C62828"
          bg="#FFEBEE"
          delay={0.5}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-brand-pink rounded-3xl p-8 flex flex-col justify-center items-center text-center text-white shadow-soft hover:shadow-elevated transition-all"
        >
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-bold text-2xl mb-2">Livraison Flash</h3>
          <p className="text-white/90 text-sm">
            Des coursiers dédiés pour une rapidité fulgurante à travers Oujda.
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

const PromoBanner = () => (
  <section id="promos" className="py-16 px-6 bg-[#F5F5F5]">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-white border border-[#EBEBEB] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-soft"
      >
        <div className="flex-1">
          <span className="inline-block px-3 py-1 rounded-md bg-brand-pink-soft text-brand-pink text-xs font-bold tracking-wider mb-4">
            CODE PROMO
          </span>
          <h3 className="text-4xl md:text-5xl font-black text-[#0A1B3D] mb-2">-10%</h3>
          <p className="text-[#6B7280] font-medium mb-6">avec le code <span className="text-brand-pink font-bold">WELCOME10</span></p>
          <p className="text-sm text-[#6B7280]">
            Profitez de réductions exclusives et cumulez des points de fidélité à chaque commande.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black italic text-brand-pink">Jatek</span>
          <div className="w-10 h-10 rounded-full bg-brand-pink flex items-center justify-center">
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

const TrackingInfo = () => (
  <section id="tracking" className="py-20 md:py-28 px-6 bg-white relative overflow-hidden">
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-teal-soft rounded-full blur-[120px] opacity-50 pointer-events-none" />

    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
      <div className="order-2 lg:order-1 relative rounded-[2.5rem] overflow-hidden aspect-[4/5] md:aspect-square lg:aspect-[4/5] bg-[#F5F5F5]">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-teal-soft to-brand-pink-soft flex items-center justify-center">
          <Bike className="w-32 h-32 text-brand-teal opacity-40" />
        </div>

        <div className="absolute bottom-6 left-6 right-6 glass-card p-5 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-brand-teal rounded-full flex items-center justify-center border-2 border-white">
              <span className="font-bold text-white">A</span>
            </div>
            <div>
              <p className="font-bold text-[#0A1B3D]">Amine est en route</p>
              <p className="text-sm text-brand-teal font-semibold">Arrive dans 8 min</p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[#EBEBEB] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-teal"
              initial={{ width: '30%' }}
              animate={{ width: '70%' }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-[#0A1B3D]">
          Ne perdez plus jamais le nord.
        </h2>
        <p className="text-lg text-[#6B7280] mb-10 leading-relaxed">
          Suivez votre commande en temps réel depuis la cuisine du restaurant jusqu'à votre porte. Nos chauffeurs sont équipés d'un GPS ultra-précis pour que vous sachiez exactement quand dresser la table.
        </p>

        <ul className="space-y-6">
          {[
            { icon: Clock, title: 'Estimations fiables', desc: 'Temps de préparation et de trajet calculés par notre algorithme.', color: 'bg-brand-yellow-soft text-[#B85C00]' },
            { icon: MapPin, title: 'Position GPS en direct', desc: "Regardez votre livreur slalomer (prudemment) dans les rues d'Oujda.", color: 'bg-brand-pink-soft text-brand-pink' },
            { icon: ShieldCheck, title: 'Contact direct', desc: 'Appelez ou envoyez un message à votre livreur en un clic.', color: 'bg-brand-teal-soft text-brand-teal' },
          ].map((feature, i) => (
            <li key={i} className="flex gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-[#0A1B3D]">{feature.title}</h4>
                <p className="text-sm text-[#6B7280] mt-1">{feature.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

const ProTier = () => (
  <section id="pro" className="py-20 md:py-28 px-6 bg-[#FFF6CC]">
    <div className="max-w-5xl mx-auto bg-white border border-[#EBEBEB] rounded-[3rem] p-10 md:p-16 relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center gap-12 shadow-soft">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-yellow rounded-full blur-[80px] opacity-30" />

      <div className="flex-1 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-yellow-soft text-[#B85C00] text-xs font-bold uppercase tracking-wider mb-6">
          <Star className="w-4 h-4 fill-[#B85C00]" /> Nouveau
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-[#0A1B3D]">
          Jatek <span className="text-brand-pink">Pro</span>
        </h2>
        <p className="text-[#6B7280] text-lg mb-8 max-w-md mx-auto md:mx-0">
          Rejoignez le club. Livraison gratuite illimitée, offres exclusives chez nos partenaires, et service client prioritaire.
        </p>
        <a href="#download" className="inline-block bg-brand-pink text-white px-8 py-4 rounded-full font-bold hover:bg-brand-pink-deep transition-colors duration-300 shadow-soft">
          Découvrir l'abonnement
        </a>
      </div>

      <div className="relative z-10 w-56 h-56 flex-shrink-0">
        <div className="absolute inset-0 bg-brand-pink rounded-full blur-[40px] opacity-20" />
        <div className="relative w-full h-full bg-brand-pink-soft rounded-full border-2 border-brand-pink/20 flex items-center justify-center shadow-elevated">
          <img src="/jatek-logo.png" alt="Jatek" className="w-28" />
        </div>
      </div>
    </div>
  </section>
);

const Download = () => (
  <section id="download" className="py-20 md:py-28 px-6 bg-white text-center">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-[#0A1B3D]">
        Téléchargez Jatek dès maintenant
      </h2>
      <p className="text-lg text-[#6B7280] mb-10">
        Disponible sur iOS et Android. Commandez en quelques secondes et suivez votre livreur en temps réel.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="bg-white border border-[#EBEBEB] p-5 rounded-3xl shadow-soft">
          <QRCodeSVG value="https://ma.jatek.app/mobile/" size={120} level="H" fgColor="#0A1B3D" bgColor="#ffffff" />
        </div>
        <div className="text-left">
          <p className="font-bold text-[#0A1B3D] text-lg mb-1">Scannez le QR code</p>
          <p className="text-sm text-[#6B7280] mb-4">ou téléchargez directement sur votre appareil.</p>
          <div className="flex flex-col gap-3">
            <a
              href="https://ma.jatek.app/mobile/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0A1B3D] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#1a2d5a] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              Installer sur Android
            </a>
            {import.meta.env.VITE_TESTFLIGHT_URL && (
              <a
                href={import.meta.env.VITE_TESTFLIGHT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[#0A1B3D] text-[#0A1B3D] px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#0A1B3D] hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                TestFlight (iOS)
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-[#F5F5F5] pt-16 pb-8 px-6 border-t border-[#EBEBEB]">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-2">
          <img src="/jatek-logo.png" alt="Jatek" className="h-8 mb-5" />
          <p className="text-[#6B7280] text-sm max-w-sm mb-5">
            La première super-app de livraison pensée, créée et déployée à Oujda, pour les Oujdis.
          </p>
          <div className="flex gap-3">
            {['IG', 'FB', 'TW'].map((label) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center text-xs font-bold text-[#6B7280] hover:bg-brand-pink hover:text-white hover:border-brand-pink transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-[#0A1B3D] mb-4">L'entreprise</h4>
          <ul className="space-y-3 text-sm text-[#6B7280]">
            <li><a href="#download" className="hover:text-brand-pink transition-colors">À propos</a></li>
            <li><a href="mailto:jobs@jatek.ma" className="hover:text-brand-pink transition-colors">Carrières</a></li>
            <li><a href="#download" className="hover:text-brand-pink transition-colors">Blog</a></li>
            <li><a href="mailto:contact@jatek.ma" className="hover:text-brand-pink transition-colors">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-[#0A1B3D] mb-4">Partenaires</h4>
          <ul className="space-y-3 text-sm text-[#6B7280]">
            <li><a href="mailto:partner@jatek.ma" className="hover:text-brand-pink transition-colors">Devenir Partenaire</a></li>
            <li><a href="mailto:drivers@jatek.ma" className="hover:text-brand-pink transition-colors">Devenir Livreur</a></li>
            <li><a href="#download" className="hover:text-brand-pink transition-colors">Solutions Pro</a></li>
          </ul>
        </div>
      </div>

      <div className="pt-6 border-t border-[#EBEBEB] flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-[#9CA3AF]">
          &copy; {new Date().getFullYear()} Jatek App. Fièrement créé à Oujda, Maroc.
        </p>
        <div className="flex items-center gap-4 text-[10px] text-[#9CA3AF]">
          <a href="/admin/" className="hover:text-brand-pink transition-colors">Admin</a>
          <span className="text-[#D1D5DB]">|</span>
          <a href="/mobile/" className="hover:text-brand-pink transition-colors">App mobile</a>
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  return (
    <div className="min-h-screen bg-white text-[#0A1B3D] selection:bg-brand-pink selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Verticals />
        <PromoBanner />
        <TrackingInfo />
        <ProTier />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
