"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/app/hooks/useAuth"; 
import { UserIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth(); // Verifica se o usuário está logado

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Rotas públicas (quando não logado)
  const publicRoutes = [
    { href: "/home", label: "Ínicio" },
    { href: "/login", label: "Login" },
  ];

  // Rotas privadas (quando logado)
  const privateRoutes = [
    { href: "/backpack", label: "Mochilas" },
    { href: "/alerts", label: "Alertas" },
    { href: "/reports", label: "Relatórios" },
    { href: "/profile", label: "Perfil" },
  ];

  const routes = user ? privateRoutes : publicRoutes;

  return (
    <header className="sticky top-0 left-0 right-0 bg-[#7DFA48] text-white px-6 py-4 shadow-lg z-50 rounded-b-4xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Menu para desktop */}
        <nav className="hidden md:flex flex-1 justify-center">
          <ul className="flex justify-center gap-8"> {/* Distribuição equidistante */}
            {routes.map((route) => (
              <li key={route.href}>
                <Link href={route.href}>
                  <span className="block text-black px-4 py-2 cursor-pointer text-sm md:text-base hover:underline">
                    {route.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Botão do menu hambúrguer para mobile */}
        <button
          onClick={toggleMenu}
          className="md:hidden text-black text-2xl focus:outline-none"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Menu mobile */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav>
          <ul className="flex flex-col items-center gap-2 py-4">
            {routes.map((route) => (
              <li key={route.href} className="w-full">
                <Link href={route.href} onClick={closeMenu}>
                  <span className="block text-black px-4 py-3 cursor-pointer text-center hover:bg-green-200 rounded-lg">
                    {route.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}