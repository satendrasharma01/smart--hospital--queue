import { useEffect, useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import api from "../../services/api";

function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/departments/admin");
      setDepartments(response.data.departments || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault();
    try {
      await api.post("/departments", { name, description });
      setName("");
      setDescription("");
      setMessage("Department created.");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create department.");
    }
  };

  const update = async (department, changes) => {
    try {
      await api.patch(`/departments/${department._id}`, changes);
      setMessage("Department updated.");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update department.");
    }
  };

  const remove = async (department) => {
    if (!window.confirm("Delete this department only if it is not referenced by doctors?")) return;
    try {
      await api.delete(`/departments/${department._id}`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Referenced departments should be deactivated.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <Building2 className="text-slate-700" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
            <p className="text-sm text-slate-500">Deactivate referenced departments instead of deleting them.</p>
          </div>
        </div>
        {(error || message) && <p className={`mt-4 text-sm ${error ? "text-red-600" : "text-emerald-600"}`}>{error || message}</p>}
        <form onSubmit={create} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_2fr_auto]">
          <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Department name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"><Plus size={16} />Add</button>
        </form>
        <section className="mt-6 space-y-3">
          {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading departments...</div> : departments.length === 0 ? <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">No departments found.</div> : departments.map((department) => (
            <article key={department._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
              <div><h2 className="font-medium text-slate-900">{department.name}</h2><p className="text-sm text-slate-500">{department.description || "No description"}</p></div>
              <div className="flex gap-2">
                <button onClick={() => update(department, { isActive: !department.isActive })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">{department.isActive ? "Deactivate" : "Activate"}</button>
                <button onClick={() => remove(department)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700"><Trash2 size={14} />Delete</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default AdminDepartments;
