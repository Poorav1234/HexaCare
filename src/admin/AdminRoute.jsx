// src/admin/AdminRoute.jsx
// Route guard that blocks non-admin users from accessing admin pages.
// Optionally requires super_admin role for sensitive actions.

import React from "react";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ user, requireSuperAdmin = false, children }) => {
    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Profile not completed
    if (!user.profileCompleted) {
        return <Navigate to="/complete-profile" replace />;
    }

    // Not an admin
    if (user.role !== "admin" && user.role !== "super_admin") {
        return <Navigate to="/dashboard" replace />;
    }

    // Deactivated admin
    if (user.isActive === false) {
        return <Navigate to="/login" replace />;
    }

    // Requires super_admin but user is a regular admin
    if (requireSuperAdmin && user.role !== "super_admin") {
        return <Navigate to="/admin" replace />;
    }

    return children;
};

export default AdminRoute;
