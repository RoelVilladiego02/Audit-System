import { useAuth as useAuthContext } from '../context/AuthContext';

// Re-export the useAuth hook from context for convenient imports
export const useAuth = () => {
    return useAuthContext();
};

export default useAuth;
