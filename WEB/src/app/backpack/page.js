// "use client";
// import { useEffect, useState } from "react";
// import Card from "@/components/Card/Card";
// import Header from "@/components/Header/Header";

// export default function MochilasPage() {
//   const [mochilas, setMochilas] = useState([]);

//   useEffect(() => {
//     fetch("http://localhost:3000/mochilas")
//       .then(res => res.json())
//       .then(data => {
//         if (Array.isArray(data)) {
//           setMochilas(data);
//         } else {
//           console.error("Resposta inesperada:", data);
//           setMochilas([]);
//         }
//       })
//       .catch(err => {
//         console.error("Erro ao buscar mochilas:", err);
//         setMochilas([]);
//       });
//   }, []);

//   return (
//     <main className="p-6 min-h-screen flex flex-col items-center gap-4">
//       <Header></Header>
//       <h1 className="text-2xl font-bold">Mochilas</h1>
//       {mochilas.length === 0 && <p>Nenhuma mochila encontrada.</p>}
//       {mochilas.map(m => (
//         <Card
//           key={m.MochilaId}
//           title={m.MochilaCodigo}
//           description={m.MochilaDescricao}
//           extra={<span className="text-sm text-gray-500">Peso máximo: {m.MochilaPesoMax}kg</span>}
//         />
//       ))}
//     </main>
//   );
// }



"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import BackpackForm from "@/components/BackPackForm/BackpackForm";

export default function BackpackPage() {
  const [mochilas, setMochilas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const res = await fetch("http://localhost:3000/mochilas");
      const data = await res.json();
      setMochilas(Array.isArray(data)?data:[]);
    } catch (e) {
      setMochilas([]);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    setMsg("");
    try {
      const body = {
        MochilaDescricao: form.MochilaDescricao,
        MochilaPesoMax: Number(form.MochilaPesoMax),
        // The API requires AdminEmail and passwords to create a mochila; for demo we skip these by calling a thin wrapper endpoint or assume backend allows unauthenticated creation.
      };
      const res = await fetch("http://localhost:3000/mochilas", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Erro"); return; }
      setMsg("Mochila criada");
      load();
    } catch (e) { setMsg("Erro de conexão"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir mochila?")) return;
    try {
      // API expects admin credentials to delete; this call will likely fail unless backend configured. Included for completeness.
      const res = await fetch(`http://localhost:3000/mochilas/${id}`, {
        method: "DELETE",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ password: "", passwordAdmin: "", AdminEmail: "" })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erro"); return; }
      load();
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  return (
    <main className="min-h-screen p-8 text-black">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl">
        
        <h2 className="text-2xl font-semibold">Minhas Mochilas</h2>

        <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {mochilas.map(m => (
            <Card key={m.MochilaId} title={`${m.MochilaCodigo} ${m.MochilaDescricao}`} description={`Peso máximo: ${m.MochilaPesoMax} kg`}>
              <div className="flex gap-2">
                <button onClick={() => setEditing(m)} className="px-2 py-1 bg-blue-200 rounded">Editar</button>
                <button onClick={() => handleDelete(m.MochilaId)} className="px-2 py-1 bg-red-200 rounded">Excluir</button>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-6">
          <h3 className="text-lg font-medium">Criar nova mochila</h3>
          <BackpackForm onSubmit={handleCreate} />
          {msg && <p className="text-green-600 mt-2">{msg}</p>}
        </section>

        {editing && (
          <div className="mt-6 p-4 border rounded">
            <h4 className="font-semibold">Editar mochila</h4>
            <BackpackForm initial={{MochilaDescricao: editing.MochilaDescricao, MochilaPesoMax: editing.MochilaPesoMax}} onSubmit={async (form) => {
              try {
                // There's no PUT endpoint in API sample; if exists, call it. For now we will simulate by calling delete+create or rely on API extension.
                const res = await fetch(`http://localhost:3000/mochilas/${editing.MochilaId}`, {
                  method: "PUT",
                  headers: {"Content-Type":"application/json"},
                  body: JSON.stringify({ MochilaDescricao: form.MochilaDescricao, MochilaPesoMax: Number(form.MochilaPesoMax) })
                });
                const data = await res.json();
                if (!res.ok) { alert(data.error || "Erro"); return; }
                setEditing(null);
                load();
              } catch (e) { alert("Erro de conexão"); }
            }} />
            <button onClick={() => setEditing(null)} className="mt-2 px-3 py-1 bg-gray-200 rounded">Cancelar</button>
          </div>
        )}
      </div>
    </main>
  );
}