import { Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoginScreen from './LoginScreen';
import Sidebar from './Sidebar';
import Toast from './Toast';

export default function Layout() {
  const { session } = useApp();

  return (
    <>
      <LoginScreen />
      {session ? (
        <div className="app">
          <Sidebar />
          <main className="main">
            <Outlet />
          </main>
        </div>
      ) : null}
      <Toast />
    </>
  );
}
