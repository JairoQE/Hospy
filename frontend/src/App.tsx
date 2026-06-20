import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { warmupApi } from "./api/homeBootstrap";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ChatDockProvider } from "./context/ChatDockContext";
import { HospixChatProvider } from "./context/HospixChatContext";
import { LocaleCurrencyProvider } from "./context/LocaleCurrencyContext";
import { GeoHintsBootstrap } from "./components/geo/GeoHintsBootstrap";
import { SiteDesignProvider } from "./context/SiteDesignContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AccessibilityMenu } from "./components/accessibility/AccessibilityMenu";
import { ReadingMaskOverlay } from "./components/accessibility/ReadingMaskOverlay";
import { ThemeProvider } from "./context/ThemeContext";
import { ProductTourProvider } from "./context/ProductTourContext";
import { InboxNotificationWatcher } from "./components/inbox/InboxNotificationWatcher";
import { ProductTourLauncher } from "./components/productTour/ProductTourLauncher";
import { FloatingChatHeads } from "./components/chat/FloatingChatHeads";
import { GlobalChatDock } from "./components/GlobalChatDock";
import { HospixWidget } from "./components/hospix/HospixWidget";
import { AccommodationDetailPage } from "./pages/AccommodationDetailPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminConsultasPage } from "./pages/AdminConsultasPage";
import { AdminAuditLogPage } from "./pages/AdminAuditLogPage";
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
import { OwnerLayout } from "./components/owner/OwnerLayout";
import { OwnerPanelPage } from "./pages/OwnerPanelPage";
import { InboxPage } from "./pages/InboxPage";
import { OwnerStorePage } from "./pages/OwnerStorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SponsorLayout } from "./components/sponsor/SponsorLayout";
import { SponsorPanelPage } from "./pages/SponsorPanelPage";
import { InfoPage } from "./pages/InfoPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";

function AppTree() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <AccessibilityProvider>
      <LocaleCurrencyProvider>
      <GeoHintsBootstrap />
      <SiteDesignProvider>
      <ChatDockProvider>
        <BrowserRouter>
        <ProductTourProvider>
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
                  <OwnerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OwnerPanelPage />} />
              <Route path="hospedajes/:id" element={<OwnerEditAccommodationPage />} />
            </Route>
            <Route
              path="patrocinio"
              element={
                <ProtectedRoute roles={["patrocinador"]}>
                  <SponsorLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<SponsorPanelPage />} />
            </Route>
            <Route
              path="admin/*"
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
              <Route path="registro-actividad" element={<AdminAuditLogPage />} />
              <Route path="auditoria" element={<Navigate to="/admin/registro-actividad" replace />} />
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
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <FloatingChatHeads />
          <GlobalChatDock />
          <HospixWidget />
          <AccessibilityMenu />
          <ReadingMaskOverlay />
          <ProductTourLauncher />
          <InboxNotificationWatcher />
        </HospixChatProvider>
        </ProductTourProvider>
        </BrowserRouter>
      </ChatDockProvider>
      </SiteDesignProvider>
      </LocaleCurrencyProvider>
      </AccessibilityProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  useEffect(() => {
    warmupApi();
  }, []);

  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppTree />
      </GoogleOAuthProvider>
    );
  }
  return <AppTree />;
}
