// src/admin/AdminLayout.jsx
// Sidebar + topbar layout wrapper for all admin pages.
// Matches the existing HexaCare dark theme exactly.

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Hexagon,
    LayoutDashboard,
    Users,
    ScrollText,
    LogOut,
    ChevronLeft,
    Menu,
    X,
    Shield,
    FileText,
    User,
} from "lucide-react";
import { logoutUser } from "../firebase/authService";

const sidebarLinks = [
    {
        name: "Dashboard",
        path: "/admin",
        icon: LayoutDashboard,
        exact: true,
    },
    {
        name: "Users",
        path: "/admin/users",
        icon: Users,
    },
    {
        name: "Reports",
        path: "/admin/reports",
        icon: FileText,
    },
    {
        name: "Admin Management",
        path: "/admin/management",
        icon: Shield,
        superOnly: true,
    },
    {
        name: "Activity Logs",
        path: "/admin/logs",
        icon: ScrollText,
    },
    {
        name: "My Profile",
        path: "/admin/profile",
        icon: User,
    },
];

const AdminLayout = ({ user, children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const isActivePath = (link) => {
        if (link.exact) return location.pathname === link.path;
        return location.pathname.startsWith(link.path);
    };

    const visibleLinks = sidebarLinks.filter(
        (link) => !link.superOnly || user?.role === "super_admin"
    );

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* ── Mobile overlay ───────────────────────────────────────── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-white/5 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0">
                    <Link
                        to="/admin"
                        className="flex items-center gap-2 group"
                    >
                        <Hexagon className="w-7 h-7 text-neonCyan group-hover:text-neonPurple transition-colors" />
                        <span className="text-white font-bold text-base tracking-wider">
                            HEXA
                            <span className="text-neonCyan group-hover:text-neonPurple transition-colors">
                                CARE
                            </span>
                        </span>
                        <span className="ml-1 text-[9px] uppercase tracking-widest text-slate-500 font-bold border border-slate-700 rounded px-1.5 py-0.5">
                            Admin
                        </span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {visibleLinks.map((link) => {
                        const active = isActivePath(link);
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    active
                                        ? "bg-neonCyan/10 text-neonCyan border border-neonCyan/20"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
                                }`}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                {link.name}
                                {link.superOnly && (
                                    <Shield className="w-3 h-3 ml-auto text-amber-400/60" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Back to App */}
                <div className="p-3 border-t border-white/5 space-y-1">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to App
                    </Link>
                </div>

                {/* User Info */}
                <div className="p-4 border-t border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-sm text-slate-300 font-medium flex-shrink-0">
                            {user?.displayName?.charAt(0) ||
                                user?.email?.charAt(0) ||
                                "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200 font-medium truncate">
                                {user?.displayName || user?.email}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                {user?.role === "super_admin"
                                    ? "Super Admin"
                                    : "Admin"}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Logout"
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Area ────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-screen relative">
                {/* Topbar */}
                <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-slate-400 hover:text-white transition-colors p-1"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500">
                        <Shield className="w-4 h-4" />
                        <span className="uppercase tracking-widest text-[11px] font-bold">
                            Admin Panel
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
                            <span className="uppercase tracking-widest font-mono">
                                System Online
                            </span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    {/* Background glow (matches existing app) */}
                    <div className="fixed top-0 left-64 right-0 bottom-0 pointer-events-none">
                        <div className="absolute top-[-10%] right-[-10%] w-[35%] h-[35%] bg-neonCyan/5 blur-[120px] rounded-full" />
                        <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[30%] bg-neonPurple/5 blur-[120px] rounded-full" />
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
