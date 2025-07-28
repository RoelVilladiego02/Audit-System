import { createBrowserRouter } from 'react-router-dom';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';

// Pages
import Home from './pages/Home';
import Login from './auth/Login';
import Register from './auth/Register';
import UserDashboard from './pages/User/UserDashboard';
import AuditForm from './pages/User/AuditForm';
import SubmissionsList from './pages/User/SubmissionsList';
import SubmissionDetails from './pages/User/SubmissionDetails';
import ManageQuestions from './pages/Admin/ManageQuestions';
import ManageSubmissions from './pages/Admin/ManageSubmissions';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminAnalyticsDashboard from './pages/Analytics/AdminAnalyticsDashboard';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />
    },
    {
        path: '/register',
        element: <Register />
    },
    {
        path: '/',
        element: <Layout />,
        children: [
            {
                path: '',
                element: <Home />
            },
            {
                path: 'dashboard',
                element: <RoleRoute requiredRoles={['user']}><UserDashboard /></RoleRoute>
            },
            {
                path: 'audit',
                element: <RoleRoute requiredRoles={['user']}><AuditForm /></RoleRoute>
            },
            {
                path: 'submissions',
                element: <RoleRoute requiredRoles={['user']}><SubmissionsList /></RoleRoute>
            },
            {
                path: 'submissions/:id',
                element: <RoleRoute requiredRoles={['user']}><SubmissionDetails /></RoleRoute>
            },
            {
                path: 'admin',
                element: <RoleRoute requiredRoles={['admin']}><AdminDashboard /></RoleRoute>
            },
            {
                path: 'admin/questions',
                element: <RoleRoute requiredRoles={['admin']}><ManageQuestions /></RoleRoute>
            },
            {
                path: 'admin/submissions',
                element: <RoleRoute requiredRoles={['admin']}><ManageSubmissions /></RoleRoute>
            },
            {
                path: 'analytics',
                element: <RoleRoute requiredRoles={['user', 'admin']}><AdminAnalyticsDashboard /></RoleRoute>
            }
        ]
    },
    {
        path: '*',
        element: <NotFound />
    }
]);

export default router;
