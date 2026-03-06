import React from "react";
import Navbar from "./NavBar";

const DashboardLayout = ({ user, children, currentPath }) => {
    return (
        <div className="min-h-screen bg-futuristic flex flex-col relative text-slate-100 overflow-hidden">
            {/* Background Decor */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neonCyan/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neonPurple/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
            <div className="fixed top-[40%] left-[60%] w-[30%] h-[30%] bg-neonGreen/5 blur-[100px] rounded-full pointer-events-none z-0"></div>

            {/* Sticky Top Navbar */}
            <Navbar user={user} currentPath={currentPath} />

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20 relative z-10">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
