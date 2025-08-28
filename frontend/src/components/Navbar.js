import React from 'react';
import { Navbar as BootstrapNavbar, Nav, Button, Container } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinkStyle = (path) => ({
    color: isActive(path) ? '#ffffff' : 'rgba(255,255,255,0.95)',
    fontWeight: isActive(path) ? '600' : '500',
    backgroundColor: isActive(path) ? 'rgba(255,255,255,0.15)' : 'transparent',
    borderRadius: '8px',
    padding: '10px 16px',
    margin: '0 4px',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
    border: 'none'
  });

  return (
    <BootstrapNavbar 
      expand="lg" 
      className="shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: '3px solid #5a67d8',
        minHeight: '70px',
        padding: '8px 0'
      }}
    >
      <Container>
        <BootstrapNavbar.Brand 
          as={Link} 
          to="/dashboard" 
          className="fw-bold d-flex align-items-center"
          style={{ 
            fontSize: '1.6rem', 
            textDecoration: 'none',
            color: '#ffffff',
            fontWeight: '700'
          }}
        >
          🎓 Student Grievance System
        </BootstrapNavbar.Brand>
        
        <BootstrapNavbar.Toggle 
          aria-controls="basic-navbar-nav"
          style={{ 
            borderColor: 'rgba(255,255,255,0.3)',
            backgroundColor: 'rgba(255,255,255,0.1)' 
          }}
        />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {user?.role === 'admin' ? (
              // Admin Navigation
              <>
                <Nav.Link 
                  as={Link} 
                  to="/dashboard"
                  style={navLinkStyle('/dashboard')}
                >
                  📊 Dashboard
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/admin/complaints"
                  style={navLinkStyle('/admin/complaints')}
                >
                  ⚖️ Manage Complaints
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/admin/blocks"
                  style={navLinkStyle('/admin/blocks')}
                >
                  🏗️ Block Management
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/ledger"
                  style={navLinkStyle('/ledger')}
                >
                  📋 Ledger
                </Nav.Link>
              </>
            ) : (
              // Student Navigation
              <>
                <Nav.Link 
                  as={Link} 
                  to="/dashboard"
                  style={navLinkStyle('/dashboard')}
                >
                  📊 Dashboard
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/submit-complaint"
                  style={navLinkStyle('/submit-complaint')}
                >
                  📝 Submit Complaint
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/my-complaints"
                  style={navLinkStyle('/my-complaints')}
                >
                  📋 My Complaints
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/ledger"
                  style={navLinkStyle('/ledger')}
                >
                  🔍 Ledger
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav className="align-items-center">
            <Nav.Link 
              disabled 
              style={{
                color: '#ffffff',
                fontWeight: '500',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                margin: '0 8px'
              }}
            >
              👤 {user?.fullName || user?.adminId || user?.studentId}
              <small 
                className="ms-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  color: '#ffffff'
                }}
              >
                {user?.role}
              </small>
            </Nav.Link>
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={handleLogout}
              style={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: '#ffffff',
                fontWeight: '500',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.15)';
                e.target.style.borderColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
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