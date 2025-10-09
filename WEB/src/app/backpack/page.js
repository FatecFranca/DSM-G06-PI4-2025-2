"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import BackpackForm from "@/components/BackPackForm/BackpackForm";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes";

export default function BackpackPage() {
  const [mochilas, setMochilas] = useState([]);
  const [msg, setMsg] = useState("");
  const { authFetch } = useAuth();

  const load = async () => {
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/usuario`
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // console.error("Resposta não é JSON. Status:", res.status);
        setMochilas([]);
        return;
      }

      const data = await res.json();
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

    const codigo = form.MochilaCodigo?.trim();
    const apelido = form.MochilaDescricao?.trim() || "Minha Mochila";

    if (!codigo) {
      setMsg("O código da mochila é obrigatório.");
      return;
    }

    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/vincular`,
        {
          method: "POST",
          body: JSON.stringify({
            MochilaCodigo: codigo,
            MochilaNome: apelido,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Erro ao vincular mochila.");
        return;
      }

      setMsg("Mochila vinculada com sucesso!");
      load(); // Atualiza a lista
    } catch (e) {
      console.error("Erro de conexão:", e);
      setMsg("Erro de conexão com o servidor.");
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen p-8 text-black text-center">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold ">Minhas Mochilas</h2>

          <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {mochilas.length > 0 ? (
              mochilas.map((m) => (
                <Card
                  key={m.MochilaCodigo}
                  title={`${m.MochilaCodigo} - ${
                    m.MochilaNome || m.MochilaDescricao
                  }`}
                  description={`Peso máximo: ${m.MochilaPesoMax} kg | Status: ${m.UsoStatus}`}
                >
                  <div className="flex gap-2 mt-2">
                    <span className="text-sm text-gray-600">
                      {m.UsoStatus === "Usando"
                        ? "✅ Em uso"
                        : "⏸️ Não está em uso"}
                    </span>
                  </div>
                </Card>
              ))
            ) : (
              <p className="col-span-2 text-center text-gray-500">
                Nenhuma mochila vinculada ainda.
              </p>
            )}
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-medium">
              Vincular uma mochila existente
            </h3>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              Informe o <strong>código da mochila</strong> fornecido pelo
              administrador.
            </p>
            <BackpackForm
              onSubmit={handleCreate}
              placeholderCodigo="Ex: nopao4Fbm1DW"
              placeholderDescricao="Apelido (opcional)"
            />
            {msg && (
              <p
                className={`mt-2 text-sm ${
                  msg.includes("sucesso") ? "text-green-600" : "text-red-600"
                }`}
              >
                {msg}
              </p>
            )}
          </section>

          <section className="mt-8 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            <strong>💡 Dica:</strong> O código da mochila é gerado pelo
            administrador ao cadastrar a mochila. Ele é composto por 12
            caracteres alfanuméricos (ex: <code>nopao4Fbm1DW</code>).
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
