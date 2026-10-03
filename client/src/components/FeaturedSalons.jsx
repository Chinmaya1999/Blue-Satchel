import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "../api/axios.js";
import { SalonCard } from "../pages/Salons.jsx";

// Top-rated partner salons for the home page. Renders nothing until at least one is live.
const FeaturedSalons = () => {
  const [salons, setSalons] = useState([]);
  useEffect(() => {
    api.get("/salons", { params: { limit: 3 } }).then(({ data }) => setSalons(data.salons)).catch(() => {});
  }, []);
  if (!salons.length) return null;

  return (
    <section className="relative border-t border-white/5 py-24">
      <div className="container-app">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fs-eyebrow">Partner salons</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Get scanned at a <span className="fs-gradient-text">salon near you</span></h2>
          </div>
          <Link to="/salons" className="fs-btn-ghost group">View all salons <ArrowRight size={15} className="transition group-hover:translate-x-1" /></Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{salons.map((s) => <SalonCard key={s.id} s={s} />)}</div>
      </div>
    </section>
  );
};

export default FeaturedSalons;
