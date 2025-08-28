import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { getComplaintStats } from '../services/complaintService';
import { getBlockchainStats } from '../services/blockchainService';

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
    <Container>
      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="py-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="mb-3">Welcome back, {user?.fullName}! 👋</h1>
                  <p className="mb-0 fs-5">
                    Student ID: {user?.studentId} | Role: {user?.role}
                  </p>
                  <p className="mb-0 opacity-75">
                    Submit and track your grievances with blockchain transparency
                  </p>
                </Col>
                <Col md={4} className="text-center">
                  <div className="display-1">🎓</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Blockchain Status */}
      <Row className="mb-4">
        <Col>
          <Alert variant={isConnected ? "success" : "warning"} className="mb-0">
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
          </Alert>
        </Col>
      </Row>

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
          <Card className="h-100 border-primary">
            <Card.Body className="text-center">
              <div className="display-4 text-primary mb-3">📝</div>
              <h5>Submit New Complaint</h5>
              <p className="text-muted">
                File a new grievance with AI-powered duplicate detection
              </p>
              <Link to="/submit-complaint">
                <Button variant="primary" size="lg">
                  Submit Complaint
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100 border-info">
            <Card.Body className="text-center">
              <div className="display-4 text-info mb-3">📋</div>
              <h5>View My Complaints</h5>
              <p className="text-muted">
                Track the status of your submitted grievances
              </p>
              <Link to="/my-complaints">
                <Button variant="info" size="lg">
                  My Complaints
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistics */}
      {stats && (
        <Row className="mb-4">
          <Col>
            <h4 className="mb-3">📊 System Statistics</h4>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        {stats && (
          <>
            <Col md={3}>
              <Card className="stats-card text-center">
                <Card.Body>
                  <div className="display-4 mb-2">📈</div>
                  <h3 className="mb-1">{stats.overview.total_complaints}</h3>
                  <p className="mb-0">Total Complaints</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center border-warning">
                <Card.Body>
                  <div className="display-4 text-warning mb-2">⏳</div>
                  <h3 className="mb-1">{stats.overview.pending}</h3>
                  <p className="mb-0">Pending</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center border-info">
                <Card.Body>
                  <div className="display-4 text-info mb-2">🔄</div>
                  <h3 className="mb-1">{stats.overview.in_progress}</h3>
                  <p className="mb-0">In Progress</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center border-success">
                <Card.Body>
                  <div className="display-4 text-success mb-2">✅</div>
                  <h3 className="mb-1">{stats.overview.resolved}</h3>
                  <p className="mb-0">Resolved</p>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}
      </Row>

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

      {/* Additional Actions */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">🔍 Explore More</h5>
            </Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col md={4}>
                  <Link to="/ledger" className="text-decoration-none">
                    <div className="p-3 border rounded hover-shadow">
                      <div className="display-6 mb-2">🔗</div>
                      <h6>Blockchain Ledger</h6>
                      <p className="text-muted small">
                        View all complaints on the transparent blockchain ledger
                      </p>
                    </div>
                  </Link>
                </Col>
                
                <Col md={4}>
                  <div className="p-3 border rounded">
                    <div className="display-6 mb-2">👥</div>
                    <h6>Admin Dashboard</h6>
                    <p className="text-muted small">
                      Administrative features (Coming Soon)
                    </p>
                  </div>
                </Col>
                
                <Col md={4}>
                  <div className="p-3 border rounded">
                    <div className="display-6 mb-2">📊</div>
                    <h6>Analytics</h6>
                    <p className="text-muted small">
                      Advanced analytics and insights (Coming Soon)
                    </p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
