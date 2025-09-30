"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Header from "@/components/Header/Header";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/usuarios")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsuarios(data);
        } else {
          console.error("Resposta inesperada:", data);
          setUsuarios([]);
        }
      })
      .catch(err => {
        console.error("Erro ao buscar usuários:", err);
        setUsuarios([]);
      });
  }, []);

  return (
    <main className="p-6 min-h-screen flex flex-col items-center gap-4">
      <Header></Header>
      <h1 className="text-2xl font-bold"> Usuários</h1>
      {usuarios.length === 0 && <p>Nenhum usuário encontrado.</p>}
      {usuarios.map(user => (
        <Card
          key={user.UsuarioId}
          title={user.UsuarioNome}
          description={user.UsuarioEmail}
          extra={<span className="text-sm text-gray-500">Peso: {user.UsuarioPeso}kg</span>}
        />
      ))}
    </main>
  );
}
