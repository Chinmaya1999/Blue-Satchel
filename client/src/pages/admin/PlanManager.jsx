import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, RotateCcw, Loader2 } from "lucide-react";
import api from "../../api/axios.js";
import { usePricing } from "../../context/PricingContext.jsx";

// Admin: create, edit (name / price / credits / badge), delete and restore
// credit plans, with each plan's sales. Purchases keep a snapshot of the plan
// they bought, so edits never change past transactions.

const EMPTY = { name: "", priceUsd: "", credits: "", badge: "" };

const toForm = (p) => ({
  name: p.name,
  priceUsd: String(p.priceUsd),
  credits: String(p.credits),
  badge: p.popular ? "popular" : p.bestValue ? "bestValue" : "",
});

const toPayload = (f) => ({
  name: f.name.trim(),
  priceUsd: Number(f.priceUsd),
  credits: Number(f.credits),
  popular: f.badge === "popular",
  bestValue: f.badge === "bestValue",
});

const PlanForm = ({ form, setForm, onSubmit, onCancel, saving, submitLabel }) => (
  <form onSubmit={onSubmit} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
    <input required maxLength={40} placeholder="Plan name" className="input py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
    <label className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
      <input required type="number" min="0.04" max="10000" step="0.01" placeholder="Price" className="input py-2 pl-6 text-sm" value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} />
    </label>
    <input required type="number" min="1" max="1000000" step="1" placeholder="Credits" className="input py-2 text-sm" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
    <select className="input py-2 text-sm" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}>
      <option value="">No badge</option>
      <option value="popular">“Popular”</option>
      <option value="bestValue">“Best value”</option>
    </select>
    <div className="flex gap-2">
      <button type="submit" disabled={saving} className="btn-primary py-2 text-sm disabled:opacity-60">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary py-2 text-sm" aria-label="Cancel">
        <X size={14} />
      </button>
    </div>
  </form>
);

const PlanManager = () => {
  const { refreshPricing } = usePricing();
  const [plans, setPlans] = useState(null);
  const [editingId, setEditingId] = useState(null); // plan _id, or "new"
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", error: false });

  const load = () =>
    api
      .get("/admin/plans")
      .then(({ data }) => setPlans(data.plans))
      .catch(() => setMessage({ text: "Couldn't load plans.", error: true }));

  useEffect(() => {
    load();
  }, []);

  // Reload the list and the storefront's cached plans after any change.
  const afterChange = (text) => {
    setMessage({ text, error: false });
    setEditingId(null);
    setForm(EMPTY);
    load();
    refreshPricing();
  };

  const run = async (fn) => {
    setSaving(true);
    setMessage({ text: "", error: false });
    try {
      await fn();
    } catch (err) {
      setMessage({ text: err.response?.data?.message || "That didn't work. Please try again.", error: true });
    } finally {
      setSaving(false);
    }
  };

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post("/admin/plans", toPayload(form));
      afterChange(`Plan “${form.name.trim()}” added.`);
    });
  };

  const update = (e, plan) => {
    e.preventDefault();
    run(async () => {
      await api.patch(`/admin/plans/${plan._id}`, toPayload(form));
      afterChange(`Plan “${form.name.trim()}” updated.`);
    });
  };

  const remove = (plan) => {
    const note = plan.purchases
      ? `It has ${plan.purchases} sale(s), so it will be archived (hidden from customers) and kept in your reports.`
      : "It has no sales, so it will be removed completely.";
    if (!window.confirm(`Delete the “${plan.name}” plan? ${note}`)) return;
    run(async () => {
      const { data } = await api.delete(`/admin/plans/${plan._id}`);
      afterChange(data.archived ? `“${plan.name}” archived.` : `“${plan.name}” deleted.`);
    });
  };

  const restore = (plan) =>
    run(async () => {
      await api.patch(`/admin/plans/${plan._id}`, { archived: false });
      afterChange(`“${plan.name}” is available again.`);
    });

  const startEdit = (plan) => {
    setEditingId(plan._id);
    setForm(toForm(plan));
    setMessage({ text: "", error: false });
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-slate-900">Credit plans & sales</h2>
          <p className="text-xs text-slate-400">Changes apply to new purchases straight away. Past purchases keep what they paid.</p>
        </div>
        {editingId !== "new" && (
          <button
            onClick={() => {
              setEditingId("new");
              setForm(EMPTY);
              setMessage({ text: "", error: false });
            }}
            className="btn-primary py-2 text-sm"
          >
            <Plus size={14} /> Add plan
          </button>
        )}
      </div>

      {message.text && (
        <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${message.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message.text}
        </p>
      )}

      {editingId === "new" && (
        <div className="mb-3">
          <PlanForm form={form} setForm={setForm} onSubmit={create} onCancel={() => setEditingId(null)} saving={saving} submitLabel="Add" />
        </div>
      )}

      {!plans ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading plans…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Credits</th>
                <th className="py-2 pr-4 text-right">Sold</th>
                <th className="py-2 pr-4 text-right">Revenue</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plans.map((p) =>
                editingId === p._id ? (
                  <tr key={p._id}>
                    <td colSpan={6} className="py-2">
                      <PlanForm form={form} setForm={setForm} onSubmit={(e) => update(e, p)} onCancel={() => setEditingId(null)} saving={saving} submitLabel="Save" />
                    </td>
                  </tr>
                ) : (
                  <tr key={p._id} className={p.archived ? "opacity-50" : ""}>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">
                      {p.name}
                      {p.popular && <span className="badge ml-2 bg-cyan-50 text-cyan-700">Popular</span>}
                      {p.bestValue && <span className="badge ml-2 bg-cyan-50 text-cyan-700">Best value</span>}
                      {p.archived && <span className="badge ml-2 bg-slate-100 text-slate-500">Archived</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">${p.priceUsd}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{p.credits.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-700">{p.purchases}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-slate-900">${p.revenueUsd.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        {p.archived ? (
                          <button onClick={() => restore(p)} disabled={saving} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Restore">
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => startEdit(p)} disabled={saving} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => remove(p)} disabled={saving} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
              {plans.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">No plans yet — add one so customers can buy credits.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlanManager;
