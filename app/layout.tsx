import type{Metadata}from"next";import"./globals.css";import WebMcpRegistry from"./webmcp-registry";
export const metadata:Metadata={title:"agent-assistant | Control for agents that take action",description:"Non-custodial commerce infrastructure for AI agents."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><WebMcpRegistry/>{children}</body></html>}
