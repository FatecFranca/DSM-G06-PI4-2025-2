"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header/Header";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // fetch current session user id from a simple endpoint or try /usuarios/id/:id -- here we'll attempt a helper endpoint
    // To keep compatibility with your API, try to fetch /usuarios to see if admin, otherwise skip. For production you'd have a /me endpoint.
    fetch("http://localhost:3000/usuarios")
      .then(r => r.json())
      .then(data => {
        // if API returned array, we can't identify current user here without a /me endpoint.
        // We'll attempt to load first user as demo; in real app use a /me endpoint or session endpoint.
        if (Array.isArray(data)) {
          setUser(data[0] || null);
          setForm(data[0] || {});
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

  const handleSave = async () => {
    setMsg("");
    try {
      // your API expects PUT /usuarios/:id with session auth. We'll optimistically call it.
      const res = await fetch(`http://localhost:3000/usuarios/${user?.UsuarioId || ""}`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Erro"); return; }
      setUser(data);
      setEditing(false);
      setMsg("Perfil atualizado");
    } catch (e) {
      setMsg("Erro de conexão");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir sua conta?")) return;
    try {
      const res = await fetch("http://localhost:3000/usuarios", {
        method: "DELETE",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({ UsuarioSenha: prompt("Digite sua senha para confirmar") })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erro"); return; }
      alert("Conta excluída");
      window.location.href = "/";
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  if (!user) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl">
        <Header />
        <p>Nenhum usuário carregado. Para um funcionamento correto, adicione um endpoint /me que retorne o usuário logado.</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen flex items-start justify-center p-8">
      <div className="w-full max-w-2xl bg-white p-6 rounded-2xl">
        <Header />
        <h2 className="text-2xl font-semibold">Meu Perfil</h2>
        {!editing ? (
          <div className="mt-4 space-y-2">
            <p><strong>Nome:</strong> {user.UsuarioNome}</p>
            <p><strong>E-mail:</strong> {user.UsuarioEmail}</p>
            <p><strong>Peso:</strong> {user.UsuarioPeso} kg</p>
            <p><strong>Altura:</strong> {user.UsuarioAltura} m</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setEditing(true); setForm(user); }} className="px-3 py-1 bg-blue-200 rounded">Editar</button>
              <button onClick={handleDelete} className="px-3 py-1 bg-red-200 rounded">Excluir conta</button>
            </div>
            {msg && <p className="text-green-600">{msg}</p>}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <input name="UsuarioNome" value={form.UsuarioNome} onChange={handleChange} className="p-2 rounded bg-green-100" />
            <input name="UsuarioEmail" value={form.UsuarioEmail} onChange={handleChange} className="p-2 rounded bg-green-100" />
            <input name="UsuarioPeso" value={form.UsuarioPeso} onChange={handleChange} className="p-2 rounded bg-green-100" />
            <input name="UsuarioAltura" value={form.UsuarioAltura} onChange={handleChange} className="p-2 rounded bg-green-100" />
            <input name="UsuarioSenha" placeholder="Redefinir senha (deixe em branco para manter)" onChange={handleChange} className="p-2 rounded bg-green-100" />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-3 py-1 bg-lime-300 rounded">Salvar</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 rounded">Cancelar</button>
            </div>
            {msg && <p className="text-green-600">{msg}</p>}
          </div>
        )}
      </div>
    </main>
  );
}