import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import { useAppContext } from './context/AppContext';

function App() {
  const { user } = useAppContext();

  return (
    <Routes>
      <Route path="/signin" element={user.isLoggedIn ? <Navigate to="/" /> : <SignIn />} />
      <Route path="/signup" element={user.isLoggedIn ? <Navigate to="/" /> : <SignUp />} />
      
      <Route path="/" element={user.isLoggedIn ? <Layout /> : <Navigate to="/signin" />}>
        <Route index element={<Dashboard />} />
        {/* Remove old routes since everything is on dashboard now */}
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;
