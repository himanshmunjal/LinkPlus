// ProtectedRoute.jsx
// If you use react-router-dom, wrap protected routes with this component
// instead of the inline guard in App.jsx.
//
// Usage:
//   <Routes>
//     <Route path="/login"    element={<Login />} />
//     <Route path="/signup"   element={<Signup />} />
//     <Route element={<ProtectedRoute />}>
//       <Route path="/"          element={<Dashboard />} />
//       <Route path="/analytics" element={<Analytics />} />
//     </Route>
//   </Routes>

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ redirectTo = "/login" }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}