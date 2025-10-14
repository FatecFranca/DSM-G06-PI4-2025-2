// // src/app/profile/page.js
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/app/hooks/useAuth"; // Certifique-se do caminho correto
// import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
// import Header from "@/components/Header/Header"; // Se estiver usando

// export default function ProfilePage() {
//   const router = useRouter();
//   const { authFetch, logout } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [userData, setUserData] = useState(null);

//   useEffect(() => {
//     const fetchUserData = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         // --- CHAMADA PARA A API PARA OBTER OS DADOS ---
//         // Esta é a rota correta conforme sua API: GET /usuarios/id/
//         const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/id/`);

//         if (!res.ok) {
//           const errorData = await res.json();
//           // Se for 401, o authFetch já deve ter chamado logout
//           throw new Error(errorData.error || `Erro ${res.status} ao carregar perfil.`);
//         }

//         const data = await res.json();
//         console.log("Dados do usuário carregados:", data); // Log para debug
//         setUserData(data.usuario); // A API retorna { usuario: {...}, ok: true }

//       } catch (err) {
//         console.error("Erro ao buscar dados do usuário:", err);
//         setError(`Falha ao carregar perfil: ${err.message}`);
//         // O ProtectedRoute e authFetch devem lidar com logout se necessário
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUserData();
//   }, [authFetch]); // authFetch é uma dependência estável

//   if (loading) {
//     return (
//       <ProtectedRoute>
//         <Header />
//         <div className="min-h-screen flex items-center justify-center bg-gray-50">
//           <p>Carregando perfil...</p>
//         </div>
//       </ProtectedRoute>
//     );
//   }

//   if (error) {
//     return (
//       <ProtectedRoute>
//         <Header />
//         <div className="min-h-screen flex items-center justify-center bg-gray-50">
//           <div className="text-red-500 p-4 text-center">
//             <p>{error}</p>
//             <button
//               onClick={() => router.push('/login')}
//               className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//             >
//               Voltar para Login
//             </button>
//           </div>
//         </div>
//       </ProtectedRoute>
//     );
//   }

//   return (
//     <ProtectedRoute>
//       <Header />
//       <main className="min-h-screen p-8 bg-gray-50 text-black">
//         <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
//           <h2 className="text-2xl font-bold mb-6 text-center">Meu Perfil</h2>

//           {userData ? (
//             <div className="space-y-4">
//               <div>
//                 <h3 className="text-lg font-semibold">Informações Pessoais</h3>
//                 <ul className="mt-2 space-y-2">
//                   <li><strong>Nome:</strong> {userData.UsuarioNome}</li>
//                   <li><strong>E-mail:</strong> {userData.UsuarioEmail}</li>
//                   <li><strong>Data de Nascimento:</strong> {userData.UsuarioDtNascimento ? new Date(userData.UsuarioDtNascimento).toLocaleDateString('pt-BR') : '-'}</li>
//                   <li><strong>Sexo:</strong> {userData.UsuarioSexo || '-'}</li>
//                 </ul>
//               </div>

//               <div>
//                 <h3 className="text-lg font-semibold">Dados Físicos</h3>
//                 <ul className="mt-2 space-y-2">
//                   <li><strong>Peso:</strong> {userData.UsuarioPeso ? `${userData.UsuarioPeso} kg` : '-'}</li>
//                   <li><strong>Altura:</strong> {userData.UsuarioAltura ? `${userData.UsuarioAltura} m` : '-'}</li>
//                   <li><strong>Peso Máximo Permitido:</strong> {userData.UsuarioPesoMaximoPorcentagem ? `${userData.UsuarioPesoMaximoPorcentagem}% do seu peso` : '-'}</li>
//                 </ul>
//               </div>

//               {/* Se quiser mostrar a foto */}
//               {/* {userData.UsuarioFoto && (
//                 <div>
//                   <h3 className="text-lg font-semibold">Foto de Perfil</h3>
//                   <img src={userData.UsuarioFoto} alt="Foto de Perfil" className="mt-2 w-24 h-24 object-cover rounded-full" />
//                 </div>
//               )} */}

//               <div className="pt-4 mt-6 border-t border-gray-200">
//                 <button
//                   onClick={logout}
//                   className="w-full py-2 px-4 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
//                 >
//                   Sair da Conta
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <p className="text-gray-500 text-center">Nenhum dado de usuário disponível.</p>
//           )}
//         </div>
//       </main>
//     </ProtectedRoute>
//   );
// }








// src/app/profile/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";

export default function ProfilePage() {
  const router = useRouter();
  const { authFetch, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false); // Estado para controle de edição
  const [form, setForm] = useState({
    UsuarioNome: "",
    UsuarioEmail: "",
    UsuarioPeso: "",
    UsuarioAltura: "",
    UsuarioDtNascimento: "",
    UsuarioSexo: "",
    UsuarioPesoMaximoPorcentagem: "",
  });

  // --- 1. CARREGAR DADOS DO USUÁRIO AO MONTAR ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/id/`);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Erro ${res.status} ao carregar perfil.`);
        }

        const data = await res.json();
        console.log("Dados do usuário carregados:", data);
        setUserData(data.usuario);

        // Inicializa o estado do formulário com os dados do usuário
        setForm({
          UsuarioNome: data.usuario.UsuarioNome || "",
          UsuarioEmail: data.usuario.UsuarioEmail || "",
          UsuarioPeso: data.usuario.UsuarioPeso !== undefined ? data.usuario.UsuarioPeso : "",
          UsuarioAltura: data.usuario.UsuarioAltura !== undefined ? data.usuario.UsuarioAltura : "",
          UsuarioDtNascimento: data.usuario.UsuarioDtNascimento ? new Date(data.usuario.UsuarioDtNascimento).toISOString().split('T')[0] : "",
          UsuarioSexo: data.usuario.UsuarioSexo || "",
          UsuarioPesoMaximoPorcentagem: data.usuario.UsuarioPesoMaximoPorcentagem !== undefined ? data.usuario.UsuarioPesoMaximoPorcentagem : "",
        });

      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        setError(`Falha ao carregar perfil: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authFetch]);

  // --- 2. FUNÇÃO PARA ATIVAR O MODO DE EDIÇÃO ---
  const handleEditClick = () => {
    setEditMode(true);
    setError("");
    setSuccess("");
  };

  // --- 3. FUNÇÃO PARA SALVAR AS ALTERAÇÕES ---
  const handleSaveClick = async () => {
    setSuccess("");
    setError("");
    try {
      // Validações simples no frontend (opcional, a API também valida)
      if (!form.UsuarioNome.trim()) {
        throw new Error("Nome é obrigatório.");
      }
      if (!form.UsuarioEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.UsuarioEmail)) {
        throw new Error("E-mail inválido.");
      }
      // Validações de peso, altura, etc., podem ser adicionadas aqui

      const payload = {
        ...form,
        // Converter campos numéricos se necessário
        UsuarioPeso: parseFloat(form.UsuarioPeso),
        UsuarioAltura: parseFloat(form.UsuarioAltura),
        UsuarioPesoMaximoPorcentagem: parseFloat(form.UsuarioPesoMaximoPorcentagem),
      };

      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao atualizar perfil.");
      }

      const data = await res.json();
      setSuccess("Perfil atualizado com sucesso!");
      // Atualiza o estado local com os dados salvos (opcional, pode ser feito apenas no carregamento inicial)
      setUserData(prev => ({ ...prev, ...payload }));
      // Sai do modo de edição
      setEditMode(false);

    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setError(err.message);
    }
  };

  // --- 4. MANIPULADORES DE INPUT ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando perfil...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
          <div className="text-red-500 p-4 text-center">
            <p>{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Voltar para Login
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-8 bg-gray-50 text-black text-center">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Meu Perfil</h2>

          {error && <p className="text-red-500 mb-4">{error}</p>}
          {success && <p className="text-green-500 mb-4">{success}</p>}

          {/* Exibição dos dados ou formulário de edição */}
          {!editMode ? (
            // Modo de visualização
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                <ul className="mt-2 space-y-2">
                  <li><strong>Nome:</strong> {userData?.UsuarioNome}</li>
                  <li><strong>E-mail:</strong> {userData?.UsuarioEmail}</li>
                  <li><strong>Data de Nascimento:</strong> {userData?.UsuarioDtNascimento ? new Date(userData.UsuarioDtNascimento).toLocaleDateString('pt-BR') : '-'}</li>
                  <li><strong>Sexo:</strong> {userData?.UsuarioSexo || '-'}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Dados Físicos</h3>
                <ul className="mt-2 space-y-2">
                  <li><strong>Peso:</strong> {userData?.UsuarioPeso ? `${userData.UsuarioPeso} kg` : '-'}</li>
                  <li><strong>Altura:</strong> {userData?.UsuarioAltura ? `${userData.UsuarioAltura} m` : '-'}</li>
                  <li><strong>Peso Máximo Permitido:</strong> {userData?.UsuarioPesoMaximoPorcentagem ? `${userData.UsuarioPesoMaximoPorcentagem}% do seu peso` : '-'}</li>
                </ul>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={handleEditClick}
                  className="px-6 py-2 bg-green-400 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Editar Perfil
                </button>
              </div>
            </div>
          ) : (
            // Modo de edição
            <form onSubmit={(e) => { e.preventDefault(); handleSaveClick(); }} className="space-y-4">
              <div>
                <label htmlFor="UsuarioNome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  id="UsuarioNome"
                  name="UsuarioNome"
                  type="text"
                  value={form.UsuarioNome}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="UsuarioEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  id="UsuarioEmail"
                  name="UsuarioEmail"
                  type="email"
                  value={form.UsuarioEmail}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="UsuarioPeso" className="block text-sm font-medium text-gray-700 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    id="UsuarioPeso"
                    name="UsuarioPeso"
                    type="number"
                    step="0.01"
                    value={form.UsuarioPeso}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="UsuarioAltura" className="block text-sm font-medium text-gray-700 mb-1">
                    Altura (m)
                  </label>
                  <input
                    id="UsuarioAltura"
                    name="UsuarioAltura"
                    type="number"
                    step="0.01"
                    value={form.UsuarioAltura}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="UsuarioDtNascimento" className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  id="UsuarioDtNascimento"
                  name="UsuarioDtNascimento"
                  type="date"
                  value={form.UsuarioDtNascimento}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="UsuarioSexo" className="block text-sm font-medium text-gray-700 mb-1">
                  Sexo
                </label>
                <select
                  id="UsuarioSexo"
                  name="UsuarioSexo"
                  value={form.UsuarioSexo}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                  <option value="Prefiro não dizer">Prefiro não dizer</option>
                </select>
              </div>

              <div>
                <label htmlFor="UsuarioPesoMaximoPorcentagem" className="block text-sm font-medium text-gray-700 mb-1">
                  Peso Máximo Permitido (% do seu peso)
                </label>
                <input
                  id="UsuarioPesoMaximoPorcentagem"
                  name="UsuarioPesoMaximoPorcentagem"
                  type="number"
                  step="0.01"
                  min="1"
                  max="100"
                  value={form.UsuarioPesoMaximoPorcentagem}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 10 (significa 10% do seu peso)"
                />
              </div>

              <div className="flex justify-center mt-6 space-x-4">
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-md text-white font-medium ${
                    success ? "bg-green-500" : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Seção de Logout */}
          <div className="mt-12 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-center">Sair da Conta</h3>
            <div className="flex justify-center">
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}