"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// import Header from "@/components/Header/Header";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ UsuarioEmail: "", UsuarioSenha: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:3000/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Erro ao logar");
        return;
      }
      router.push("/backpack");
    } catch (e) {
      setError("Erro de conexão");
    }
  };

  return (
    <main className="bg-[#ADEBB3] min-h-screen flex items-center justify-center">
      <div className="text-black w-full max-w-2xl p-8 bg-white rounded-2xl">
        <h1 className="text-3xl text-center text-pink-500">Olá novamente!</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            name="UsuarioEmail"
            placeholder="Qual seu melhor e-mail?"
            type="email"
            className="p-3 rounded-3xl bg-green-100"
            value={form.UsuarioEmail}
            onChange={handleChange}
          />
          <input
            name="UsuarioSenha"
            placeholder="Crie uma senha forte!"
            type="password"
            className="p-3 rounded-3xl bg-green-100"
            value={form.UsuarioSenha}
            onChange={handleChange}
          />
          {error && <p className="text-red-600">{error}</p>}
          <button className="bg-lime-400 hover:bg-lime-500 transition duration-500 p-3 rounded-3xl text-lg">
            Confirmar
          </button>
        </form>
        <nav className="flex items-center justify-center">
          <ul>
            <li>
              <Link href="/register" onClick={() => setIsOpen(false)}>
                <button className="block text-black px-4 py-2 text-sm md:text-base cursor-pointer">
                  Não tem conta? Criar conta.
                </button>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
