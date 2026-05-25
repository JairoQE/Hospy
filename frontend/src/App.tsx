import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ChatDockProvider } from "./context/ChatDockContext";
import { HospixChatProvider } from "./context/HospixChatContext";
import { LocaleCurrencyProvider } from "./context/LocaleCurrencyContext";
import { FloatingChatHeads } from "./components/chat/FloatingChatHeads";
import { GlobalChatDock } from "./components/GlobalChatDock";
import { HospixWidget } from "./components/hospix/HospixWidget";
import { AccommodationDetailPage } from "./pages/AccommodationDetailPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminConsultasPage } from "./pages/AdminConsultasPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminHomeContentPage } from "./pages/AdminHomeContentPage";
import { AdminModerationPage } from "./pages/AdminModerationPage";
import { AdminReservationsPage } from "./pages/AdminReservationsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { HomePage } from "./pages/HomePage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { OwnerEditAccommodationPage } from "./pages/OwnerEditAccommodationPage";
import { OwnerPanelPage } from "./pages/OwnerPanelPage";
import { InboxPage } from "./pages/InboxPage";
import { OwnerStorePage } from "./pages/OwnerStorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SponsorPanelPage } from "./pages/SponsorPanelPage";
import { InfoPage } from "./pages/InfoPage";

export default function App() {
  return (
    <AuthProvider>
      <LocaleCurrencyProvider>
      <ChatDockProvider>
        <BrowserRouter>
        <HospixChatProvider>
          <Routes>
            <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route
              path="hospedajes/:id"
              element={
                <ErrorBoundary>
                  <AccommodationDetailPage />
                </ErrorBoundary>
              }
            />
            <Route path="anfitrion/:ownerId" element={<OwnerStorePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="recuperar-contraseña" element={<ForgotPasswordPage />} />
            <Route path="registro" element={<RegisterPage />} />
            <Route path="registro-propietario" element={<RegisterPage asOwner />} />
            <Route path="registro-patrocinador" element={<RegisterPage asSponsor />} />
            <Route path="sobre-nosotros" element={<InfoPage pageId="sobre-nosotros" />} />
            <Route path="centro-ayuda" element={<InfoPage pageId="centro-ayuda" />} />
            <Route path="contacto" element={<InfoPage pageId="contacto" />} />
            <Route path="legal/:slug" element={<InfoPage />} />
            <Route
              path="mis-reservas"
              element={
                <ProtectedRoute roles={["huesped"]}>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="panel"
              element={
                <ProtectedRoute roles={["propietario"]}>
                  <OwnerPanelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="panel/hospedajes/:id"
              element={
                <ProtectedRoute roles={["propietario"]}>
                  <OwnerEditAccommodationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="patrocinio"
              element={
                <ProtectedRoute roles={["patrocinador"]}>
                  <SponsorPanelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute roles={["administrador"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="moderacion" element={<AdminModerationPage />} />
              <Route path="reservas" element={<AdminReservationsPage />} />
              <Route path="consultas" element={<AdminConsultasPage />} />
              <Route path="inicio" element={<AdminHomeContentPage />} />
            </Route>
            <Route
              path="bandeja"
              element={
                <ProtectedRoute>
                  <InboxPage />
                </ProtectedRoute>
              }
            />
            <Route path="perfil/:userId" element={<ProfilePage />} />
            <Route
              path="perfil"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <FloatingChatHeads />
          <GlobalChatDock />
          <HospixWidget />
        </HospixChatProvider>
        </BrowserRouter>
      </ChatDockProvider>
      </LocaleCurrencyProvider>
    </AuthProvider>
  );
}
