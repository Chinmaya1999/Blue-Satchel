import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

const NotFound = () => (
  <div className="container-app flex flex-col items-center justify-center gap-4 py-28 text-center">
    <Compass size={40} className="text-brand-300" />
    <h1 className="font-display text-3xl font-bold text-slate-900">Page not found</h1>
    <p className="text-slate-500">The page you're looking for doesn't exist.</p>
    <Link to="/" className="btn-primary mt-2">Back home</Link>
  </div>
);

export default NotFound;
