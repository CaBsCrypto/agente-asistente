import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "agente-asistente · Control para agentes que actúan", description: "Infraestructura no custodial para acciones reales realizadas por agentes." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }