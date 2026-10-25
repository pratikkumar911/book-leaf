import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import MyBooks from './pages/author/MyBooks.jsx';
import MyTickets from './pages/author/MyTickets.jsx';
import NewTicket from './pages/author/NewTicket.jsx';
import AuthorTicketDetail from './pages/author/TicketDetail.jsx';
import AdminQueue from './pages/admin/AdminQueue.jsx';
import AdminTicketDetail from './pages/admin/TicketDetail.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;

  const isAdmin = user.role === 'admin';
  return (
    <Layout>
      <Routes>
        {isAdmin ? (
          <>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<AdminQueue />} />
            <Route path="/admin/tickets/:id" element={<AdminTicketDetail />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/books" replace />} />
            <Route path="/books" element={<MyBooks />} />
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/tickets/new" element={<NewTicket />} />
            <Route path="/tickets/:id" element={<AuthorTicketDetail />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}