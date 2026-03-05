import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import Login from "./Pages/Login";
import Register from "./Pages/Register";
import CompleteProfile from "./Pages/CompleteProfile";
import Dashboard from "./Pages/Dashboard";

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
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error("Firebase check timed out.")), 8000);
              getDoc(doc(db, "users", currentUser.uid))
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
            });
          };

          const userDoc = await fetchDocWithTimeout();
          if (userDoc.exists()) {
            const data = userDoc.data();
            const profileCompleted = !!data.profileCompleted;
            setUser({ ...currentUser, profileCompleted });
            setDevState({
              userDocExists: true,
              profileCompleted,
            });
          } else {
            setUser({ ...currentUser, profileCompleted: false });
            setDevState({
              userDocExists: false,
              profileCompleted: false,
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[App] Error fetching user data:", error);
          setUser({ ...currentUser, profileCompleted: false });
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

  return (
    <Router>
      <div className="bg-futuristic text-slate-100 min-h-screen font-sans">
        <div className="content-layer min-h-screen">
          <Routes>
            <Route
              path="/"
              element={
                user && user.profileCompleted ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route
              path="/login"
              element={
                user && user.profileCompleted ? <Navigate to="/dashboard" /> : <Login />
              }
            />

            <Route
              path="/register"
              element={
                user && user.profileCompleted ? (
                  <Navigate to="/dashboard" />
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
          </Routes>

          {IS_DEV && (
            <div className="fixed bottom-4 left-4 z-40 max-w-xs rounded-xl bg-slate-900/80 border border-slate-700/80 px-4 py-3 text-xs text-slate-200 shadow-lg shadow-slate-900/70 backdrop-blur-md">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold tracking-wide text-[10px] text-slate-400 uppercase">
                  Dev Panel · Auth Debug
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${user ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">UID</span>
                  <span className="text-right truncate max-w-[10rem] font-mono text-[10px]">
                    {user?.uid || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Email</span>
                  <span className="text-right truncate max-w-[10rem] font-mono text-[10px]">
                    {user?.email || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">User doc</span>
                  <span className="font-mono text-[10px]">
                    {devState.userDocExists ? "EXISTS" : "MISSING"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Profile completed</span>
                  <span className="font-mono text-[10px]">
                    {devState.profileCompleted ? "TRUE" : "FALSE"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Router>
  );
}

export default App;