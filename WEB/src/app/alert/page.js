"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Header from "@/components/Header/Header";

export default function AlertasPage() {
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/alertas")
      .then(res => res.json())
      .then(data => setAlertas(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <main className="p-6 min-h-screen flex flex-col items-center gap-4">
      <Header></Header>
      <h1 className="text-2xl font-bold">Alertas</h1>
      {alertas.map(a => (
        <Card
          key={a.AlertaId}
          title={a.AlertaTitulo}
          description={a.AlertaDescricao}
          extra={<span className="text-sm text-red-600">Nível: {a.AlertaNivel}</span>}
        />
      ))}
    </main>
  );
}
