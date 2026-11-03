import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './layouts/AppShell';
import { Spinner } from './components/ui/States';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import Classes from './pages/admin/Classes';
import Attendance from './pages/admin/Attendance';
import Results from './pages/admin/Results';
import Fees from './pages/admin/Fees';
import Teachers from './pages/admin/Teachers';
import Academics from './pages/admin/Academics';
import Overview from './pages/portal/Overview';
import TeacherHome from './pages/teacher/Home';
import Announcements from './pages/admin/Announcements';
import AuditLogs from './pages/admin/AuditLogs';

const home = (user) => (user.role === 'admin' ? '/' : user.role === 'teacher' ? '/teacher' : '/portal');

function Guard({ role }) {
  const { user, booting } = useAuth();
  if (booting) return <Spinner label="Restoring your session…" variant="shell" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={home(user)} replace />;
  return <AppShell><Outlet /></AppShell>;
}

export default function App() {
  const { user, booting } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={booting ? <Spinner /> : user ? <Navigate to={home(user)} replace /> : <Login />} />
      <Route element={<Guard role="admin" />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="classes" element={<Classes />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="academics" element={<Academics />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="results" element={<Results />} />
        <Route path="fees" element={<Fees />} />
      </Route>
      <Route element={<Guard role="student" />}>
        <Route path="portal" element={<Overview />} />
      </Route>
      <Route element={<Guard role="teacher" />}>
        <Route path="teacher" element={<TeacherHome />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
