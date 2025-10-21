import { AuthProvider } from "./hooks/useAuth";
import "./globals.css";

export const metadata = {
  title: "Smart Backpack",
  description: "Smart BackPack",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className={`antialiased`}>

        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
