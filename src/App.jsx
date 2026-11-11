import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { RequireAuth } from './components/layout/RequireAuth.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DevicesPage } from './pages/DevicesPage.jsx';
import { VisitsPage } from './pages/VisitsPage.jsx';
import { VisitPage } from './pages/VisitPage.jsx';
import { PosPage } from './pages/PosPage.jsx';
import { ProductsPage } from './pages/ProductsPage.jsx';
import { InventoryPage } from './pages/InventoryPage.jsx';
import { InvoicesPage } from './pages/InvoicesPage.jsx';
import { ExpensesPage } from './pages/ExpensesPage.jsx';
import { RecordsPage } from './pages/RecordsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="visits" element={<VisitsPage />} />
        <Route path="visits/:id" element={<VisitPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="records" element={<RecordsPage />} />
      </Route>

      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
