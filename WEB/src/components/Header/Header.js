"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 left-0 right-0 bg-[#7DFA48] text-white px-6 py-4 shadow-lg z-50 rounded-b-4xl">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <nav
          className={`${
            isOpen
              ? "max-h-60 opacity-100"
              : "max-h-0 opacity-0 md:max-h-none md:opacity-100"
          } md:flex md:items-center md:gap-4 overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <ul className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4 md:mt-0 w-full md:w-auto">
            <li>
              <Link href="/home" onClick={() => setIsOpen(false)}>
                <button className="block text-black px-4 py-2 cursor-pointer text-sm md:text-base">
                  Ínicio
                </button>
              </Link>
            </li>
            {/* <li>
              <Link href="/backpack" onClick={() => setIsOpen(false)}>
                <button className="block text-black px-4 py-2 cursor-pointer text-sm md:text-base">
                  Mochilas
                </button>
              </Link>
            </li> */}
            <li>
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <button className="block text-black px-4 py-2 cursor-pointer text-sm md:text-base">
                  Login
                </button>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Botão hambúrguer (mobile) - agora à esquerda, mas sem afetar o centro */}
        <button
          className="md:hidden text-white focus:outline-none ml-4"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
