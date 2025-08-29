import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { getComplaintStats, getAdminComplaintStats } from '../services/complaintService';
import { getBlockchainStats } from '../services/blockchainService';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isConnected, account, getNetworkName, chainId, connectWallet } = useWeb3();
  
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
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
      
      // Load admin-specific statistics
      const adminComplaintData = await getAdminComplaintStats();
      setAdminStats(adminComplaintData);
      
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
        <p className="mt-3">Loading admin dashboard...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="p-0">
      {/* Admin Hero Section */}
      <div className="admin-hero-section mb-4">
        <Container>
          <Row className="align-items-center" style={{ minHeight: '200px' }}>
            <Col md={12}>
              <div className="admin-hero-content text-white py-4">
                <h1 className="display-5 fw-bold mb-3">
                  Welcome back, {user?.fullName || user?.adminId}! 👨‍💼
                </h1>
                <div className="d-flex flex-wrap gap-4 mb-3">
                  <div className="d-flex align-items-center">
                    <span className="admin-badge">
                      🆔 {user?.adminId || user?.admin_id || 'ADMIN'}
                    </span>
                  </div>
                  <div className="d-flex align-items-center">
                    <span className="admin-badge">
                      👤 Administrator
                    </span>
                  </div>
                  <div className="d-flex align-items-center">
                    <span className="admin-badge">
                      📊 {adminStats?.overview?.total_complaints || 0} Managed
                    </span>
                  </div>
                </div>
                <p className="fs-5 mb-0 opacity-90">
                  Oversee and manage student grievances with blockchain transparency and institutional integrity
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Blockchain Connection Status */}
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

        {/* Admin Quick Actions */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className="admin-action-card h-100">
              <Card.Body className="text-center p-4">
                <div className="display-4 text-success mb-3">🏗️</div>
                <h5 className="fw-bold">Create Block</h5>
                <p className="text-muted">
                  Create blockchain blocks from processed complaints
                </p>
                <Link to="/admin/blocks">
                  <Button className="btn-admin-success">
                    Block Management
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="admin-action-card h-100">
              <Card.Body className="text-center p-4">
                <div className="display-4 text-primary mb-3">⚖️</div>
                <h5 className="fw-bold">Manage Complaints</h5>
                <p className="text-muted">
                  Review, update status, and manage all student complaints
                </p>
                <Link to="/admin/complaints">
                  <Button className="btn-admin-primary">
                    Manage Complaints
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Statistics Overview */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className="admin-stats-card h-100">
              <Card.Header>
                <h5 className="mb-0">📊 System Complaint Statistics</h5>
              </Card.Header>
              <Card.Body>
                {stats ? (
                  <Row>
                    <Col sm={6} className="text-center mb-3">
                      <div className="h3 text-primary">{stats.overview?.total_complaints || 0}</div>
                      <small className="text-muted">Total Complaints</small>
                    </Col>
                    <Col sm={6} className="text-center mb-3">
                      <div className="h3 text-success">{stats.overview?.resolved_complaints || 0}</div>
                      <small className="text-muted">Resolved</small>
                    </Col>
                    <Col sm={6} className="text-center">
                      <div className="h3 text-warning">{stats.overview?.pending_complaints || 0}</div>
                      <small className="text-muted">Pending</small>
                    </Col>
                    <Col sm={6} className="text-center">
                      <div className="h3 text-info">{stats.overview?.in_progress_complaints || 0}</div>
                      <small className="text-muted">In Progress</small>
                    </Col>
                  </Row>
                ) : (
                  <div className="text-center text-muted">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2">Loading statistics...</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="admin-stats-card h-100">
              <Card.Header>
                <h5 className="mb-0">⛓️ Blockchain Status</h5>
              </Card.Header>
              <Card.Body>
                {blockchainStats ? (
                  <Row>
                    <Col sm={6} className="text-center mb-3">
                      <div className="h3 text-info">{blockchainStats.totalBlocks || 0}</div>
                      <small className="text-muted">Total Blocks</small>
                    </Col>
                    <Col sm={6} className="text-center mb-3">
                      <div className="h3 text-warning">{blockchainStats.totalTransactions || 0}</div>
                      <small className="text-muted">Transactions</small>
                    </Col>
                    <Col className="text-center">
                      <div className="h6 text-success">
                        {blockchainStats.connected ? '🟢 Connected' : '🔴 Disconnected'}
                      </div>
                      <small className="text-muted">
                        {blockchainStats.mockData ? 'Mock Mode' : blockchainStats.chainId || 'Unknown Network'}
                      </small>
                    </Col>
                  </Row>
                ) : (
                  <div className="text-center text-muted">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2">Loading blockchain status...</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Row>
          <Col>
            <Card className="admin-stats-card">
              <Card.Header>
                <h5 className="mb-0">🕒 Recent Admin Activity</h5>
              </Card.Header>
              <Card.Body>
                <div className="text-center text-muted py-4">
                  <p>Recent activities will be displayed here</p>
                  <small>Complaint updates, block creations, system events</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AdminDashboard;
