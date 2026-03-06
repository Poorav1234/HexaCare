import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    Hexagon,
    User,
    LogOut,
    ChevronDown,
} from "lucide-react";
import { logoutUser } from "../firebase/authService";

const NavBar = ({ user, profileData }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const navLinks = [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Predict", path: "/predict" },
        { name: "Blockchain Reports", path: "/reports" },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link to="/dashboard" className="flex items-center gap-2 group">
                            <Hexagon className="w-8 h-8 text-neonCyan group-hover:text-neonPurple transition-colors" />
                            <span className="text-white font-bold text-lg tracking-wider">
                                HEXA<span className="text-neonCyan group-hover:text-neonPurple transition-colors">CARE</span>
                            </span>
                        </Link>
                    </div>

                    {/* Links */}
                    <div className="hidden md:block flex-1">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${location.pathname === link.path || (link.path !== '/dashboard' && location.pathname.startsWith(link.path))
                                            ? "text-neonCyan bg-slate-800/50"
                                            : "text-slate-300 hover:text-white hover:bg-slate-800/30"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center">
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 text-sm focus:outline-none"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                                    <span className="text-slate-300 font-medium">
                                        {profileData?.fullName?.charAt(0) || user?.email?.charAt(0) || "U"}
                                    </span>
                                </div>
                                <div className="hidden md:flex flex-col items-start px-1 text-left">
                                    <span className="text-slate-200 text-xs font-medium max-w-[100px] truncate">
                                        {profileData?.fullName || user?.email}
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>

                            {/* Dropdown menu */}
                            {dropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setDropdownOpen(false)}
                                    ></div>
                                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-20 overflow-hidden backdrop-blur-md">
                                        <div className="py-1">
                                            <Link
                                                to="/profile"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-neonCyan transition-colors"
                                            >
                                                <User className="mr-3 h-4 w-4" />
                                                Profile Settings
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setDropdownOpen(false);
                                                    handleLogout();
                                                }}
                                                className="flex items-center w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-slate-800 transition-colors"
                                            >
                                                <LogOut className="mr-3 h-4 w-4" />
                                                Disconnect
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;