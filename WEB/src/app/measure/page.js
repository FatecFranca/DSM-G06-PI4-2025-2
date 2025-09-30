"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Header from "@/components/Header/Header";

export default function MedicoesPage() {
  const [medicoes, setMedicoes] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/medicoes")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMedicoes(data);
        } else {
          console.error("Resposta inesperada:", data);
          setMedicoes([]);
        }
      })
      .catch(err => {
        console.error("Erro ao buscar medições:", err);
        setMedicoes([]);
      });
  }, []);

  return (
    <main className="p-6 min-h-screen flex flex-col items-center gap-4">
      <Header></Header>
      <h1 className="text-2xl font-bold">Medições</h1>
      {medicoes.length === 0 && <p>Nenhuma medição encontrada.</p>}
      {medicoes.map(m => (
        <Card
          key={m.MedicaoId}
          title={`Medição ${m.MedicaoId}`}
          description={`Status: ${m.MedicaoStatus}`}
          extra={<span className="text-sm text-gray-500">Peso: {m.MedicaoPeso}kg</span>}
        />
      ))}
    </main>
  );
}
