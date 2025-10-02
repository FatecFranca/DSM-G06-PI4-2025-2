// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// // import Header from "@/components/Header/Header";

// export default function LoginPage() {
//   const router = useRouter();
//   const [form, setForm] = useState({ UsuarioEmail: "", UsuarioSenha: "" });
//   const [error, setError] = useState("");

//   const handleChange = (e) =>
//     setForm({ ...form, [e.target.name]: e.target.value });

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       const res = await fetch("http://localhost:3000/usuarios/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify(form),
//       });
//       if (!res.ok) {
//         const err = await res.json();
//         setError(err.error || "Erro ao logar");
//         return;
//       }
//       router.push("/backpack");
//     } catch (e) {
//       setError("Erro de conexão");
//     }
//   };

//   return (
//     <main className="bg-[#ADEBB3] min-h-screen flex items-center justify-center">
//       <div className="text-black w-full max-w-2xl p-8 bg-white rounded-2xl">
//         <h1 className="text-3xl text-center text-pink-500">Olá novamente!</h1>
//         <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
//           <input
//             name="UsuarioEmail"
//             placeholder="Qual seu melhor e-mail?"
//             type="email"
//             className="p-3 rounded-3xl bg-green-100"
//             value={form.UsuarioEmail}
//             onChange={handleChange}
//           />
//           <input
//             name="UsuarioSenha"
//             placeholder="Crie uma senha forte!"
//             type="password"
//             className="p-3 rounded-3xl bg-green-100"
//             value={form.UsuarioSenha}
//             onChange={handleChange}
//           />
//           {error && <p className="text-red-600">{error}</p>}
//           <button className="bg-lime-400 hover:bg-lime-500 transition duration-500 p-3 rounded-3xl text-lg">
//             Confirmar
//           </button>
//         </form>
//         <nav className="flex items-center justify-center">
//           <ul>
//             <li>
//               <Link href="/register" onClick={() => setIsOpen(false)}>
//                 <button className="block text-black px-4 py-2 text-sm md:text-base cursor-pointer">
//                   Não tem conta? Criar conta.
//                 </button>
//               </Link>
//             </li>
//           </ul>
//         </nav>
//       </div>
//     </main>
//   );
// }

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    UsuarioEmail: "",
    UsuarioSenha: "",
    TipoLogin: "App", // ou "Web" — sua API exige isso!
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (error) setError(""); // limpa erro ao digitar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validação simples no frontend
    if (!form.UsuarioEmail.trim() || !form.UsuarioSenha.trim()) {
      setError("E-mail e senha são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao fazer login.");
        return;
      }

      if (data.accessToken && data.refreshToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("usuarioEmail", form.UsuarioEmail);
      }

      // Redireciona após login bem-sucedido
      router.push("/backpack");
    } catch (err) {
      setError("Erro de conexão com o servidor.");
      console.error("Erro no login:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#ADEBB3] min-h-screen flex items-center justify-center p-4">
      <div className="text-black w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <h1 className="text-3xl text-center text-pink-500 font-bold">
          Olá novamente!
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Faça login para continuar
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <input
              name="UsuarioEmail"
              placeholder="Seu e-mail"
              type="email"
              className="w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.UsuarioEmail}
              onChange={handleChange}
            />
          </div>
          <div>
            <input
              name="UsuarioSenha"
              placeholder="Sua senha"
              type="password"
              className="w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.UsuarioSenha}
              onChange={handleChange}
            />
          </div>

          {error && <p className="text-red-600 text-center text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`bg-lime-400 hover:bg-lime-500 transition duration-300 p-3 rounded-3xl text-lg font-medium ${
              loading ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <nav className="mt-6 text-center">
          <Link href="/register" className="text-blue-600 hover:underline">
            Não tem conta? Criar conta.
          </Link>
        </nav>
      </div>
    </main>
  );
}
