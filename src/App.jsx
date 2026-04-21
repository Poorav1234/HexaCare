import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase/firebaseConfig";
import { getUserProfile } from "./firebase/dbService";
import { initializeSuperAdmin } from "./firebase/adminService";

import Login from "./Pages/Login";
import Register from "./Pages/Register";
import CompleteProfile from "./Pages/CompleteProfile";
import Dashboard from "./Pages/Dashboard";
import Reports from "./Pages/Reports";
import PredictPages from "./Pages/PredictPages";
import Profile from "./Pages/Profile";

// Admin module
import AdminRoute from "./admin/AdminRoute";
import AdminDashboard from "./admin/AdminDashboard";
import AdminManagement from "./admin/AdminManagement";
import AdminLogs from "./admin/AdminLogs";

const IS_DEV =
  import.meta.env.MODE === "development" ||
  import.meta.env.DEV ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "development");

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devState, setDevState] = useState({
    userDocExists: false,
    profileCompleted: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const fetchDocWithTimeout = () => {
            return new Promise(async (resolve, reject) => {
              const timer = setTimeout(() => reject(new Error("Firebase check timed out.")), 8000);
              try {
                const profile = await getUserProfile(currentUser.uid);
                resolve(profile);
              } catch (e) {
                reject(e);
              } finally {
                clearTimeout(timer);
              }
            });
          };

          const userProfile = await fetchDocWithTimeout();
          if (userProfile) {
            const profileCompleted = !!userProfile.profileCompleted;
            const role = userProfile.role || "user";
            const isActive = userProfile.isActive !== false;

            // Block deactivated admins
            if ((role === "admin" || role === "super_admin") && !isActive) {
              await signOut(auth);
              setUser(null);
              setLoading(false);
              return;
            }

            // Initialize super admin role if applicable
            await initializeSuperAdmin(currentUser.uid, currentUser.email);
            // Re-read role in case it was just set
            const finalRole = (await getUserProfile(currentUser.uid))?.role || role;

            setUser({ ...currentUser, profileCompleted, role: finalRole, isActive });
            setDevState({
              userDocExists: true,
              profileCompleted,
            });
          } else {
            // No profile yet — check for super admin init
            await initializeSuperAdmin(currentUser.uid, currentUser.email);
            setUser({ ...currentUser, profileCompleted: false, role: "user", isActive: true });
            setDevState({
              userDocExists: false,
              profileCompleted: false,
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[App] Error fetching user data:", error);
          setUser({ ...currentUser, profileCompleted: false, role: "user", isActive: true });
          setDevState({
            userDocExists: false,
            profileCompleted: false,
          });
        }
      } else {
        setUser(null);
        setDevState({
          userDocExists: false,
          profileCompleted: false,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="bg-futuristic flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neonCyan"></div>
      </div>
    );
  }

  // Admins go directly to admin dashboard
  const homeRoute = (user?.role === "super_admin" || user?.role === "admin") ? "/admin" : "/dashboard";

  return (
    <Router>
      <div className="bg-futuristic text-slate-100 min-h-screen font-sans">
        <div className="content-layer min-h-screen">
          <Routes>
            <Route
              path="/"
              element={
                user && user.profileCompleted ? (
                  <Navigate to={homeRoute} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route
              path="/login"
              element={
                user && user.profileCompleted ? <Navigate to={homeRoute} /> : <Login />
              }
            />

            <Route
              path="/register"
              element={
                user && user.profileCompleted ? (
                  <Navigate to={homeRoute} />
                ) : (
                  <Register />
                )
              }
            />

            <Route
              path="/complete-profile"
              element={
                user && !user.profileCompleted ? (
                  <CompleteProfile user={user} />
                ) : (
                  <Navigate to={user ? "/dashboard" : "/login"} />
                )
              }
            />

            <Route
              path="/dashboard"
              element={
                user && user.profileCompleted ? (
                  <Dashboard user={user} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route
              path="/reports"
              element={
                user && user.profileCompleted ? (
                  <Reports user={user} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route
              path="/predict/:type"
              element={
                user && user.profileCompleted ? (
                  <PredictPages user={user} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route
              path="/profile"
              element={
                user && user.profileCompleted ? (
                  <Profile user={user} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* ── Admin Routes ─────────────────────────────────────── */}
            <Route
              path="/admin"
              element={
                <AdminRoute user={user}>
                  <AdminDashboard user={user} />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/management"
              element={
                <AdminRoute user={user} requireSuperAdmin>
                  <AdminManagement user={user} />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AdminRoute user={user}>
                  <AdminLogs user={user} />
                </AdminRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;