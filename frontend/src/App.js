import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ManageComplaints from './pages/ManageComplaints';
import SubmitComplaint from './pages/SubmitComplaint';
import Ledger from './pages/Ledger';
import MyComplaints from './pages/MyComplaints';
import BlockManagement from './pages/BlockManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';
import { initializeShutdownHandlers, removeShutdownHandlers } from './services/shutdownService';
import useHeartbeat from './hooks/useHeartbeat';

function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <div className="App">
          <AppContent />
        </div>
      </Web3Provider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  
  // Initialize development heartbeat service
  const { status } = useHeartbeat();

  // Initialize shutdown handlers when app loads
  useEffect(() => {
    console.log('🚀 Initializing Student Grievance System...');
    initializeShutdownHandlers();
    
    // Log heartbeat status in development
    if (process.env.NODE_ENV === 'development') {
      console.log('💓 Heartbeat service status:', status);
    }
    
    // Cleanup on unmount
    return () => {
      removeShutdownHandlers();
    };
  }, [status]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? (
            user.role === 'admin' ? <AdminDashboard /> : <Dashboard />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/submit-complaint" 
          element={user && user.role !== 'admin' ? <SubmitComplaint /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/my-complaints" 
          element={user && user.role !== 'admin' ? <MyComplaints /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/ledger" 
          element={user ? <Ledger /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin/blocks" 
          element={user && user.role === 'admin' ? <BlockManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin/complaints" 
          element={user && user.role === 'admin' ? <ManageComplaints /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/login"} />} 
        />
      </Routes>
    </>
  );
}

export default App;
