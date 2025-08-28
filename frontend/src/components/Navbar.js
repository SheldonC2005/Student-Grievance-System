import React from 'react';
import { Navbar as BootstrapNavbar, Nav, Button, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <BootstrapNavbar bg="primary" variant="dark" expand="lg" className="shadow-sm">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/dashboard" className="fw-bold">
          🎓 Student Grievance System
        </BootstrapNavbar.Brand>
        
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {user?.role === 'admin' ? (
              // Admin Navigation
              <>
                <Nav.Link as={Link} to="/dashboard">
                  📊 Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/admin/complaints">
                  ⚖️ Manage Complaints
                </Nav.Link>
                <Nav.Link as={Link} to="/admin/blocks">
                  🏗️ Block Management
                </Nav.Link>
                <Nav.Link as={Link} to="/ledger">
                  📋 Ledger
                </Nav.Link>
              </>
            ) : (
              // Student Navigation
              <>
                <Nav.Link as={Link} to="/dashboard">
                  📊 Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/submit-complaint">
                  📝 Submit Complaint
                </Nav.Link>
                <Nav.Link as={Link} to="/my-complaints">
                  📋 My Complaints
                </Nav.Link>
                <Nav.Link as={Link} to="/ledger">
                  🔍 Ledger
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            <Nav.Link disabled className="text-light">
              👤 {user?.fullName || user?.adminId || user?.studentId}
              <small className="ms-2 badge bg-secondary">
                {user?.role}
              </small>
            </Nav.Link>
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={handleLogout}
              className="ms-2"
            >
              🚪 Logout
            </Button>
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;