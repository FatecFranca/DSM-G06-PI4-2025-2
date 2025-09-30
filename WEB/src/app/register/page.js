"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// import Header from "@/components/Header/Header";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    UsuarioNome: "",
    UsuarioEmail: "",
    UsuarioSenha: "",
    UsuarioPeso: "",
    UsuarioAltura: "",
    UsuarioDtNascimento: "",
    UsuarioSexo: "Prefiro não dizer",
  });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:3000/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Erro ao registrar");
        return;
      }
      // redirect to backpack management
      router.push("/backpack");
    } catch (e) {
      setError("Erro de conexão");
    }
  };

  return (
    <main className="bg-[#ADEBB3] min-h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl p-8 bg-[#F2F2F2] rounded-2xl text-black">
        <h1 className="text-3xl text-center text-pink-500">Seja bem-vindo!</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            name="UsuarioNome"
            placeholder="Qual seu nome?"
            className="p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 "
            value={form.UsuarioNome}
            onChange={handleChange}
          />
          <input
            name="UsuarioEmail"
            placeholder="Qual seu melhor e-mail?"
            type="email"
            className="p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 "
            value={form.UsuarioEmail}
            onChange={handleChange}
          />
          <input
            name="UsuarioSenha"
            placeholder="Crie uma senha forte!"
            type="password"
            className="p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 "
            value={form.UsuarioSenha}
            onChange={handleChange}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="UsuarioPeso"
              placeholder="Qual seu peso?"
              type="number"
              step="0.01"
              className="p-3 rounded-3xl bg-green-100  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 "
              value={form.UsuarioPeso}
              onChange={handleChange}
            />
            <input
              name="UsuarioAltura"
              placeholder="Qual sua altura?"
              type="number"
              step="0.01"
              className="p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 "
              value={form.UsuarioAltura}
              onChange={handleChange}
            />
          </div>
          <input
            name="UsuarioDtNascimento"
            type="date"
            className="p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 "
            value={form.UsuarioDtNascimento}
            onChange={handleChange}
          />
          {/* <select name="UsuarioSexo" value={form.UsuarioSexo} onChange={handleChange} className="p-3 rounded-3xl bg-green-100">
            <option>Masculino</option>
            <option>Feminino</option>
            <option>Prefiro não dizer</option>
            </select> */}

          <select
            name="UsuarioSexo"
            value={form.UsuarioSexo}
            onChange={handleChange}
            placeholder="Selecione o sexo"
            className="w-full p-3 rounded-3xl bg-green-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
          >
            {/* <option value="">Selecione o sexo</option> */}
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Prefiro não dizer">Prefiro não dizer</option>
          </select>

          {error && <p className="text-red-600">{error}</p>}

          <button className="bg-lime-400 hover:bg-lime-500 transition duration-500 p-3 rounded-3xl text-lg">
            Confirmar
          </button>
        </form>
        <nav className="flex items-center justify-center">
          <ul>
            <li>
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <button className="block text-black px-4 py-2 rounded-lg border-2 border-green-100  transition-all duration-300 ease-in-out  text-sm md:text-base cursor-pointer">
                  Já tem conta? Fazer login.
                </button>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
