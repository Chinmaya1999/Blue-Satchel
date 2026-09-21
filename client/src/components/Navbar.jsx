import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ShoppingBag, User, Menu, X, ScanFace, LayoutGrid, LogOut, Bell } from "lucide-react";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition hover:text-brand-600 ${isActive ? "text-brand-700" : "text-slate-600"}`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const { count, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCount = user?.notifications?.filter((n) => !n.read).length || 0;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between">
        <Link to="/"><Logo /></Link>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/" end className={navLinkClass}>Home</NavLink>
          <NavLink to="/shop" className={navLinkClass}>Shop</NavLink>
          {user && <NavLink to="/scan" className={navLinkClass}>Skin Scan</NavLink>}
          {user && <NavLink to="/scan/history" className={navLinkClass}>Scan History</NavLink>}
          {user?.role === "admin" && <NavLink to="/admin" className={navLinkClass}>Console</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <Link to="/profile" className="relative hidden rounded-full p-2 text-slate-500 hover:bg-slate-100 sm:flex">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </Link>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open shopping bag"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/profile" className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 hover:bg-slate-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {user.name?.[0]?.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-slate-700">{user.name?.split(" ")[0]}</span>
              </Link>
              <button onClick={() => { logout(); navigate("/"); }} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Log out">
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary hidden sm:inline-flex">
              <User size={16} /> Sign in
            </Link>
          )}

          <button className="rounded-full p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-100 bg-white md:hidden">
          <div className="container-app flex flex-col gap-1 py-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><LayoutGrid size={16} /> Home</Link>
            <Link to="/shop" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><ShoppingBag size={16} /> Shop</Link>
            {user && <Link to="/scan" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><ScanFace size={16} /> Skin Scan</Link>}
            {user?.role === "admin" && <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Console</Link>}
            {user ? (
              <button onClick={() => { logout(); setMenuOpen(false); navigate("/"); }} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Log out</button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white"><User size={16} /> Sign in</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
