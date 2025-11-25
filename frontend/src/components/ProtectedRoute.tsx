import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
    allowedRoles?: string[];
    children?: React.ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        // You can replace this with a proper loading spinner
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user) {
        // Check if user has any of the allowed roles
        // We check both user_type (for candidate/business) and role (for admin)
        const userRole = user.user_type || user.role;

        if (!allowedRoles.includes(userRole)) {
            // User is authenticated but doesn't have permission
            // Redirect to home or a specific 403 page
            return <Navigate to="/" replace />;
        }
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
