import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Loading } from './components/ui';
import AppLayout from './layouts/AppLayout';
import Landing from './pages/Landing';
import Track from './pages/Track';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import Customers from './pages/Customers';
import Services from './pages/Services';
import Finance from './pages/Finance';
import Employees from './pages/Employees';
import Activity from './pages/Activity';

function Protected({ owner, children }: { owner?: boolean; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (owner && user.role !== 'owner') return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/cek" element={<Track />} />
      <Route path="/cek/:code" element={<Track />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="transaksi" element={<Orders />} />
        <Route path="transaksi/baru" element={<NewOrder />} />
        <Route path="transaksi/:id" element={<OrderDetail />} />
        <Route path="pelanggan" element={<Customers />} />
        <Route path="layanan" element={<Protected owner><Services /></Protected>} />
        <Route path="keuangan" element={<Protected owner><Finance /></Protected>} />
        <Route path="karyawan" element={<Protected owner><Employees /></Protected>} />
        <Route path="aktivitas" element={<Protected owner><Activity /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
