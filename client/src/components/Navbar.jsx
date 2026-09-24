import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, User, Menu, X, ScanFace, LayoutGrid, LogOut, Bell, History, Home, Shield, ArrowRight } from "lucide-react";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { count, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const unreadCount = user?.notifications?.filter((n) => !n.read).length || 0;

  const links = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/shop", label: "Shop", icon: LayoutGrid },
    ...(user ? [{ to: "/scan", label: "Skin Scan", icon: ScanFace, end: true }] : []),
    ...(user ? [{ to: "/scan/history", label: "Scan History", icon: History }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Console", icon: Shield }] : []),
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header
      className={`fs-nav sticky top-0 z-40 transition-colors duration-500 ${
        scrolled || menuOpen ? "bg-[#050814]/95 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.9)]" : "bg-[#050814]/90"
      }`}
    >
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Blue Satchel home"><Logo light /></Link>

        <nav className="hidden items-center rounded-full bg-white/[0.03] p-1 ring-1 ring-white/10 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="relative rounded-full px-4 py-1.5 text-sm font-medium">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 ring-1 ring-cyan-300/30"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className={`relative transition ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`}>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {user && (
            <Link to="/profile" className="fs-nav-icon relative hidden sm:flex" aria-label="Notifications">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#050814]" />}
            </Link>
          )}

          <button onClick={() => setIsOpen(true)} className="fs-nav-icon relative" aria-label="Open shopping bag">
            <ShoppingBag size={18} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-bold text-slate-950">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link to="/profile" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ring-1 ring-white/10 transition hover:bg-white/5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-500 text-xs font-bold text-slate-950">
                  {user.name?.[0]?.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-slate-200">{user.name?.split(" ")[0]}</span>
              </Link>
              <button onClick={handleLogout} className="fs-nav-icon" aria-label="Log out">
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
                Sign in
              </Link>
              <Link to="/register" className="fs-nav-cta group">
                <ScanFace size={15} /> Free scan
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}

          <button className="fs-nav-icon md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/10 md:hidden"
          >
            <div className="container-app flex flex-col gap-1 py-4">
              {links.map((l, i) => (
                <motion.div key={l.to} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <NavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        isActive ? "bg-cyan-400/10 text-white ring-1 ring-cyan-300/25" : "text-slate-300 hover:bg-white/5"
                      }`
                    }
                  >
                    <l.icon size={17} className="text-cyan-300" /> {l.label}
                  </NavLink>
                </motion.div>
              ))}
              <div className="my-2 h-px bg-white/10" />
              {user ? (
                <>
                  <Link to="/profile" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/5">
                    <User size={17} className="text-cyan-300" /> {user.name}
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-rose-300 hover:bg-rose-500/10">
                    <LogOut size={17} /> Log out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" className="flex items-center justify-center rounded-xl px-3 py-3 text-sm font-semibold text-white ring-1 ring-white/15">
                    Sign in
                  </Link>
                  <Link to="/register" className="fs-nav-cta justify-center py-3">
                    <ScanFace size={15} /> Free scan
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
