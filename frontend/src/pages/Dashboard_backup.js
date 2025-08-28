import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { getComplaintStats } from '../services/complaintService';
import { getBlockchainStats } from '../services/blockchainService';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { isConnected, account, getNetworkName, chainId, connectWallet } = useWeb3();
  
  const [stats, setStats] = useState(null);
  const [blockchainStats, setBlockchainStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load complaint statistics
      const complaintData = await getComplaintStats();
      setStats(complaintData);
      
      // Load blockchain statistics
      const blockchainData = await getBlockchainStats();
      setBlockchainStats(blockchainData);
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading dashboard...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="p-0">
      {/* Modern Hero Section */}
      <div 
        className="mb-4"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '200px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container>
          <Row className="align-items-center" style={{ minHeight: '200px' }}>
            <Col md={12}>
              <div className="text-white py-4">
                <h1 className="display-5 fw-bold mb-3">
                  Welcome back, {user?.fullName}! 👋
                </h1>
                <div className="d-flex flex-wrap gap-4 mb-3">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-light text-dark px-3 py-2 fs-6">
                      🆔 {user?.studentId}
                    </span>
                  </div>
                  <div className="d-flex align-items-center">
                    <span className="badge bg-light text-dark px-3 py-2 fs-6">
                      👤 {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                    </span>
                  </div>
                </div>
                <p className="fs-5 mb-0 opacity-90">
                  Submit and track your grievances with blockchain transparency
                </p>
              </div>
            </Col>
          </Row>
        </Container>
        
        {/* Decorative elements */}
        <div 
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            fontSize: '120px',
            opacity: '0.1',
            color: 'white',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          🎓
        </div>
        <div 
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            fontSize: '80px',
            opacity: '0.1',
            color: 'white',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          📚
        </div>
      </div>

      <Container>
        {/* Blockchain Status */}
        <Row className="mb-4">
          <Col>
            <Alert variant={isConnected ? "success" : "warning"} className="mb-0 border-0 shadow-sm">
              <Row className="align-items-center">
                <Col md={8}>
                  <div className="d-flex align-items-center">
                    <span className="me-3 fs-4">
                      {isConnected ? "🟢" : "🟡"}
                    </span>
                    <div>
                      <strong>
                        {isConnected ? "✅ Blockchain Connected" : "⚠️ Blockchain Disconnected"}
                      </strong>
                      {isConnected && (
                        <div className="small text-muted mt-1">
                          Network: {getNetworkName(chainId)} | Account: {account?.slice(0, 6)}...{account?.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  {!isConnected && (
                    <Button 
                      variant="outline-warning" 
                      size="sm" 
                      onClick={connectWallet}
                      className="fw-semibold"
                    >
                      🔗 Connect Wallet
                    </Button>
                  )}
                </Col>
              </Row>
            </Alert>
          </Col>
        </Row>
            <Row className="align-items-center">
              <Col md={8}>
                <h6 className="mb-1">
                  🔗 Blockchain Status: {isConnected ? "Connected" : "Disconnected"}
                </h6>
                {isConnected ? (
                  <small>
                    Network: {getNetworkName(chainId)} | 
                    Wallet: {account ? `${account.slice(0, 10)}...${account.slice(-8)}` : 'None'}
                  </small>
                ) : (
                  <small>Connect your MetaMask wallet to interact with the blockchain</small>
                )}
              </Col>
              <Col md={4} className="text-end">
                {!isConnected && (
                  <Button variant="outline-dark" size="sm" onClick={connectWallet}>
                    Connect Wallet
                  </Button>
                )}
              </Col>
            </Row>
          </div>
        </Container>

        {/* Main Dashboard Content */}
        <Container className="mt-4">
          {error && (
            <Row className="mb-4">
              <Col>
                <Alert variant="danger">{error}</Alert>
              </Col>
            </Row>
          )}

          {/* Quick Actions */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className="h-100 border-primary shadow-sm">
              <Card.Body className="text-center">
                <div className="display-4 text-primary mb-3">📝</div>
                <h5>Submit New Complaint</h5>
                <p className="text-muted">
                  File a new grievance with AI-powered duplicate detection
                </p>
                <Link to="/submit-complaint">
                  <Button variant="primary" size="lg" className="fw-semibold">
                    Submit Complaint
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="h-100 border-info shadow-sm">
              <Card.Body className="text-center">
                <div className="display-4 text-info mb-3">📋</div>
                <h5>View My Complaints</h5>
                <p className="text-muted">
                  Track the status of your submitted grievances
                </p>
                <Link to="/my-complaints">
                  <Button variant="info" size="lg" className="fw-semibold">
                    My Complaints
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Statistics */}
        {stats && (
          <>
            <Row className="mb-3">
              <Col>
                <h4 className="fw-bold text-dark mb-3">📊 System Overview</h4>
              </Col>
            </Row>
            
            <Row className="mb-4">
              <Col md={3}>
                <Card className="stats-card text-center border-0 shadow-sm h-100">
                  <Card.Body className="p-4">
                    <div className="display-4 mb-3">📈</div>
                    <h3 className="mb-2 text-primary fw-bold">{stats.overview.total_complaints}</h3>
                    <p className="mb-0 text-muted">Total Complaints</p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={3}>
                <Card className="stats-card text-center border-0 shadow-sm h-100">
                  <Card.Body className="p-4">
                    <div className="display-4 mb-3">⏳</div>
                    <h3 className="mb-2 text-warning fw-bold">{stats.overview.pending_complaints}</h3>
                    <p className="mb-0 text-muted">Pending</p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={3}>
                <Card className="stats-card text-center border-0 shadow-sm h-100">
                  <Card.Body className="p-4">
                    <div className="display-4 mb-3">✅</div>
                    <h3 className="mb-2 text-success fw-bold">{stats.overview.resolved_complaints}</h3>
                    <p className="mb-0 text-muted">Resolved</p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={3}>
                <Card className="stats-card text-center border-0 shadow-sm h-100">
                  <Card.Body className="p-4">
                    <div className="display-4 mb-3">🔄</div>
                    <h3 className="mb-2 text-info fw-bold">{stats.overview.in_progress_complaints}</h3>
                    <p className="mb-0 text-muted">In Progress</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

      {/* Category Breakdown */}
      {stats?.categories && stats.categories.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">📂 Complaints by Category</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {stats.categories.slice(0, 6).map((category, index) => (
                    <Col md={4} key={index} className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{category.category}</span>
                        <span className="badge bg-secondary">{category.count}</span>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Blockchain Information */}
      {blockchainStats && (
        <Row className="mb-4">
          <Col>
            <Card className="border-warning">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">⛓️ Blockchain Information</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p><strong>Total Blockchain Records:</strong> {blockchainStats.totalComplaints}</p>
                    <p><strong>Network ID:</strong> {blockchainStats.networkId}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Contract Address:</strong></p>
                    <code className="small">{blockchainStats.contractAddress}</code>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
        </Container>
      </Container>
    );
  };

  export default Dashboard;
