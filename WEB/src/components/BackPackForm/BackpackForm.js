"use client";
import { useState } from "react";

/*
 Props:
 - onSubmit(form) => called with {MochilaDescricao, MochilaPesoMax, cor, icon}
 - initial (optional)
*/
export default function BackpackForm({ onSubmit, initial }) {
  const [form, setForm] = useState({
    MochilaDescricao: initial?.MochilaDescricao || "",
    MochilaPesoMax: initial?.MochilaPesoMax || "",
    cor: initial?.cor || "#7ee787",
    icon: initial?.icon || "🎒",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="flex flex-col gap-3">
      <input name="MochilaDescricao" value={form.MochilaDescricao} onChange={handleChange}
        placeholder="Descrição" className="p-2 rounded bg-green-100"/>
      <input name="MochilaPesoMax" value={form.MochilaPesoMax} onChange={handleChange}
        placeholder="Peso máximo (kg)" type="number" step="0.01" className="p-2 rounded bg-green-100"/>
      <label className="flex items-center gap-2">
        Cor:
        <input name="cor" value={form.cor} onChange={handleChange} type="color" className="w-12 h-8"/>
      </label>
      <label className="flex flex-col">
        Ícone (emoji ou texto mínimo):
        <input name="icon" value={form.icon} onChange={handleChange} className="p-2 rounded bg-green-100"/>
      </label>
      <button className="bg-lime-400 p-2 rounded">Salvar mochila</button>
    </form>
  );
}