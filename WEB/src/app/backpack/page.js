// "use client";
// import { useEffect, useState } from "react";
// import Card from "@/components/Card/Card";
// import BackpackForm from "@/components/BackPackForm/BackpackForm";

// export default function BackpackPage() {
//   const [mochilas, setMochilas] = useState([]);
//   const [editing, setEditing] = useState(null);
//   const [msg, setMsg] = useState("");

//   const load = async () => {
//     try {
//       const res = await fetch("http://localhost:3000/mochilas");
//       const data = await res.json();
//       setMochilas(Array.isArray(data)?data:[]);
//     } catch (e) {
//       setMochilas([]);
//     }
//   };

//   useEffect(() => { load(); }, []);

//   const handleCreate = async (form) => {
//     setMsg("");
//     try {
//       const body = {
//         MochilaDescricao: form.MochilaDescricao,
//         MochilaPesoMax: Number(form.MochilaPesoMax),
//         // The API requires AdminEmail and passwords to create a mochila; for demo we skip these by calling a thin wrapper endpoint or assume backend allows unauthenticated creation.
//       };
//       const res = await fetch("http://localhost:3000/mochilas", {
//         method: "POST",
//         headers: {"Content-Type":"application/json"},
//         body: JSON.stringify(body)
//       });
//       const data = await res.json();
//       if (!res.ok) { setMsg(data.error || "Erro"); return; }
//       setMsg("Mochila criada");
//       load();
//     } catch (e) { setMsg("Erro de conexão"); }
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Excluir mochila?")) return;
//     try {
//       // API expects admin credentials to delete; this call will likely fail unless backend configured. Included for completeness.
//       const res = await fetch(`http://localhost:3000/mochilas/${id}`, {
//         method: "DELETE",
//         headers: {"Content-Type":"application/json"},
//         body: JSON.stringify({ password: "", passwordAdmin: "", AdminEmail: "" })
//       });
//       const data = await res.json();
//       if (!res.ok) { alert(data.error || "Erro"); return; }
//       load();
//     } catch (e) {
//       alert("Erro de conexão");
//     }
//   };

//   return (
//     <main className="min-h-screen p-8 text-black">
//       <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl">
        
//         <h2 className="text-2xl font-semibold">Minhas Mochilas</h2>

//         <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//           {mochilas.map(m => (
//             <Card key={m.MochilaId} title={`${m.MochilaCodigo} ${m.MochilaDescricao}`} description={`Peso máximo: ${m.MochilaPesoMax} kg`}>
//               <div className="flex gap-2">
//                 <button onClick={() => setEditing(m)} className="px-2 py-1 bg-blue-200 rounded">Editar</button>
//                 <button onClick={() => handleDelete(m.MochilaId)} className="px-2 py-1 bg-red-200 rounded">Excluir</button>
//               </div>
//             </Card>
//           ))}
//         </section>

//         <section className="mt-6">
//           <h3 className="text-lg font-medium">Criar nova mochila</h3>
//           <BackpackForm onSubmit={handleCreate} />
//           {msg && <p className="text-green-600 mt-2">{msg}</p>}
//         </section>

//         {editing && (
//           <div className="mt-6 p-4 border rounded">
//             <h4 className="font-semibold">Editar mochila</h4>
//             <BackpackForm initial={{MochilaDescricao: editing.MochilaDescricao, MochilaPesoMax: editing.MochilaPesoMax}} onSubmit={async (form) => {
//               try {
//                 // There's no PUT endpoint in API sample; if exists, call it. For now we will simulate by calling delete+create or rely on API extension.
//                 const res = await fetch(`http://localhost:3000/mochilas/${editing.MochilaId}`, {
//                   method: "PUT",
//                   headers: {"Content-Type":"application/json"},
//                   body: JSON.stringify({ MochilaDescricao: form.MochilaDescricao, MochilaPesoMax: Number(form.MochilaPesoMax) })
//                 });
//                 const data = await res.json();
//                 if (!res.ok) { alert(data.error || "Erro"); return; }
//                 setEditing(null);
//                 load();
//               } catch (e) { alert("Erro de conexão"); }
//             }} />
//             <button onClick={() => setEditing(null)} className="mt-2 px-3 py-1 bg-gray-200 rounded">Cancelar</button>
//           </div>
//         )}
//       </div>
//     </main>
//   );
// }



"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import BackpackForm from "@/components/BackPackForm/BackpackForm";
import { useAuth } from '@/app/hooks/useAuth'; 
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes"; 

export default function BackpackPage() {
  const [mochilas, setMochilas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const { authFetch, logout } = useAuth(); // Use o hook

  const load = async () => {
    try {
      // Usa authFetch (inclui token automaticamente)
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/usuario`);
      const data = await res.json();
      
      // Sua API retorna { mochilas: [...] }
      setMochilas(Array.isArray(data.mochilas) ? data.mochilas : []);
    } catch (e) {
      console.error("Erro ao carregar mochilas:", e);
      setMochilas([]);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleCreate = async (form) => {
    setMsg("");
    try {
      // ❗ Sua API não permite usuários criarem mochilas diretamente!
      // Isso é feito por administradores. Vamos vincular uma mochila existente.
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/vincular`, {
        method: "POST",
        body: JSON.stringify({
          MochilaCodigo: form.MochilaCodigo, // Código da mochila existente
          MochilaNome: form.MochilaDescricao // Apelido
        })
      });
      
      const data = await res.json();
      if (!res.ok) { 
        setMsg(data.error || "Erro ao vincular mochila"); 
        return; 
      }
      
      setMsg("Mochila vinculada com sucesso!");
      load();
    } catch (e) { 
      setMsg("Erro de conexão"); 
    }
  };

  const handleDelete = async (mochilaId) => {
    if (!confirm("Desvincular mochila?")) return;
    try {
      // Desvincular mochila (não excluir fisicamente)
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/${mochilaId}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      if (!res.ok) { 
        alert(data.error || "Erro ao desvincular"); 
        return; 
      }
      
      load();
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  return (
    <ProtectedRoute> {/* ✅ Protege a rota */}
      <main className="min-h-screen p-8 text-black">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold">Minhas Mochilas</h2>

          <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {mochilas.map(m => (
              <Card 
                key={m.MochilaCodigo} 
                title={`${m.MochilaCodigo} - ${m.MochilaNome || m.MochilaDescricao}`} 
                description={`Peso máximo: ${m.MochilaPesoMax} kg | Status: ${m.UsoStatus}`}
              >
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditing(m)} 
                    className="px-2 py-1 bg-blue-200 rounded text-sm"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(m.MochilaCodigo)} 
                    className="px-2 py-1 bg-red-200 rounded text-sm"
                  >
                    Desvincular
                  </button>
                </div>
              </Card>
            ))}
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-medium">Vincular nova mochila</h3>
            <BackpackForm 
              onSubmit={handleCreate} 
              isVincular={true} // Para ajustar o formulário
            />
            {msg && <p className="text-green-600 mt-2">{msg}</p>}
          </section>

          {editing && (
            <div className="mt-6 p-4 border rounded">
              <h4 className="font-semibold">Editar apelido da mochila</h4>
              <BackpackForm 
                initial={{ MochilaDescricao: editing.MochilaNome || editing.MochilaDescricao }} 
                onSubmit={async (form) => {
                  try {
                    const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/alterar`, {
                      method: "PUT",
                      body: JSON.stringify({
                        MochilaCodigo: editing.MochilaCodigo,
                        MochilaNome: form.MochilaDescricao
                      })
                    });
                    const data = await res.json();
                    if (!res.ok) { 
                      alert(data.error || "Erro"); 
                      return; 
                    }
                    setEditing(null);
                    load();
                  } catch (e) { 
                    alert("Erro de conexão"); 
                  }
                }} 
              />
              <button 
                onClick={() => setEditing(null)} 
                className="mt-2 px-3 py-1 bg-gray-200 rounded"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}