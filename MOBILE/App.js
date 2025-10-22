import React from "react";
import Routes from "./src/routes";
import { useEffect } from "react";
import { Appearance } from "react-native";

export default function App() {

  useEffect(() => {
    // Força o modo claro
    Appearance.setColorScheme('light');
  }, []);

  return (
      <Routes />
);
}