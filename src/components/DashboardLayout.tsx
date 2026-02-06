"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Header from "./Header";

export type LayoutMode = "sidebar" | "topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("sidebar");

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleLayoutMode = () => {
    setLayoutMode((prev) => (prev === "sidebar" ? "topbar" : "sidebar"));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {layoutMode === "sidebar" && (
        <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      )}
      
      <div
        className={`flex flex-1 flex-col transition-all duration-300 overflow-hidden min-w-0 ${
          layoutMode === "sidebar"
            ? isSidebarOpen
              ? "lg:ml-64"
              : "lg:ml-20"
            : ""
        }`}
      >
        <Header
          onMenuClick={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          layoutMode={layoutMode}
          onLayoutModeChange={toggleLayoutMode}
        />
        
        {layoutMode === "topbar" && <TopBar />}
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}

