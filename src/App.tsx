import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import UploadPage from './pages/UploadPage';
import EntryPage from './pages/EntryPage';
import ReportsPage from './pages/ReportsPage';
import Employees from './pages/Employees';
import LeavePage from './pages/LeavePage';
import PayItemsPage from './pages/PayItemsPage';
import PackagesPage from './pages/PackagesPage';
import PayrollPage from './pages/PayrollPage';
import PayHistoryPage from './pages/PayHistoryPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="entry" element={<EntryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="employees" element={<Employees />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="payitems" element={<PayItemsPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="payhistory" element={<PayHistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
