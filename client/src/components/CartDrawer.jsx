import { Link } from "react-router-dom";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, subtotal } = useCart();
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Shopping Bag</h2>
          <button onClick={() => setIsOpen(false)} className="rounded-full p-1.5 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
            <ShoppingBag size={40} className="text-slate-300" />
            <p className="font-medium text-slate-500">Your bag is empty.</p>
            <Link to="/shop" onClick={() => setIsOpen(false)} className="btn-primary mt-2">Browse products</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-3">
                    <img src={item.imageUrl} alt={item.name} className="h-20 w-20 shrink-0 rounded-xl object-cover bg-slate-100" />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-800">{item.name}</p>
                        <button onClick={() => removeItem(item.productId)} className="text-slate-400 hover:text-rose-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-bold text-brand-700">₹{item.price}</p>
                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-display text-lg font-bold text-slate-900">₹{subtotal}</span>
              </div>
              <Link
                to={user ? "/checkout" : "/login?redirect=/checkout"}
                onClick={() => setIsOpen(false)}
                className="btn-primary w-full"
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
