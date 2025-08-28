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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [complaintStats, bcStats] = await Promise.all([
        getComplaintStats(),
        getBlockchainStats()
      ]);

      setStats(complaintStats);
      setBlockchainStats(bcStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
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
        className="hero-section mb-4"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '200px',
          borderRadius: '0 0 15px 15px'
        }}
      >
        <Container>
          <Row className="align-items-center" style={{ minHeight: '200px' }}>
            <Col md={12}>
              <div className="hero-content text-white py-4">
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
      </div>

      {/* Blockchain Status Alert */}
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <div className="blockchain-status p-3 rounded">
              <Row className="align-items-center">
                <Col md={8}>
                  {isConnected && account ? (
                    <Alert variant="success" className="mb-0 d-flex align-items-center">
                      <span className="me-2">🔗</span>
                      <div>
                        <strong>Blockchain Connected</strong><br />
                        <small>
                          Account: {account}<br />
                          Network: {getNetworkName(chainId)}
                        </small>
                      </div>
                    </Alert>
                  ) : (
                    <Alert variant="warning" className="mb-0 d-flex align-items-center">
                      <span className="me-2">⚠️</span>
                      <div>
                        <strong>Wallet Not Connected</strong><br />
                        <small>Connect your MetaMask wallet to interact with the blockchain</small>
                      </div>
                    </Alert>
                  )}
                </Col>
                <Col md={4} className="text-end">
                  {!isConnected && (
                    <Button variant="outline-primary" size="sm" onClick={connectWallet}>
                      Connect Wallet
                    </Button>
                  )}
                </Col>
              </Row>
            </div>
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
            <Card className="action-card h-100 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="display-4 text-primary mb-3">📝</div>
                <h5 className="fw-bold">Submit New Complaint</h5>
                <p className="text-muted">
                  File a new grievance with secure blockchain tracking
                </p>
                <Link to="/complaints/submit">
                  <Button className="btn-gradient-primary">
                    Submit Complaint
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="action-card h-100 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="display-4 text-info mb-3">📋</div>
                <h5 className="fw-bold">Track Complaints</h5>
                <p className="text-muted">
                  Monitor the status and progress of your submissions
                </p>
                <Link to="/complaints">
                  <Button className="btn-gradient-primary">
                    View My Complaints
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
              <Card className="category-card">
                <Card.Header className="bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <h5 className="mb-0 text-white">📂 Complaints by Category</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    {stats.categories.slice(0, 6).map((category, index) => (
                      <Col md={4} key={index} className="mb-3">
                        <div className="category-item d-flex justify-content-between align-items-center">
                          <span className="fw-medium">{category.category}</span>
                          <span className="category-badge">{category.count}</span>
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
              <Card className="border-0 shadow-sm">
                <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <h5 className="mb-0 text-white">⛓️ Blockchain Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Total Blockchain Records:</strong> <span className="text-primary">{blockchainStats.totalComplaints}</span></p>
                      <p><strong>Network ID:</strong> <span className="text-info">{blockchainStats.networkId}</span></p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Contract Address:</strong></p>
                      <code className="small bg-light p-2 rounded d-block" style={{ wordBreak: 'break-all' }}>
                        {blockchainStats.contractAddress}
                      </code>
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
