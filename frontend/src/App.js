import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import router from './routes';
import EnvironmentIndicator from './components/EnvironmentIndicator';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <EnvironmentIndicator />
    </AuthProvider>
  );
}

export default App;
