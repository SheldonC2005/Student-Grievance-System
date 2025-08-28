import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { getComplaintStats } from '../services/complaintService';
import { getBlockchainStats } from '../services/blockchainService';

const AdminDashboard = () => {
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
        <p className="mt-3">Loading admin dashboard...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="text-primary">👨‍💼 Admin Dashboard</h2>
          <p className="text-muted">Welcome back, {user?.fullName || user?.adminId}</p>
        </Col>
      </Row>

      {/* Web3 Connection Status */}
      <Row className="mb-4">
        <Col>
          <Alert variant={isConnected ? "success" : "warning"} className="mb-0">
            <Row className="align-items-center">
              <Col md={8}>
                <strong>🔗 Blockchain Connection Status</strong>
                <br />
                <small>
                  {isConnected ? (
                    <>
                      ✅ Connected to {getNetworkName(chainId)} 
                      {account && (
                        <> | Account: {account.slice(0, 6)}...{account.slice(-4)}</>
                      )}
                    </>
                  ) : (
                    '❌ Not connected to blockchain network'
                  )}
                </small>
              </Col>
              <Col md={4} className="text-end">
                {!isConnected && (
                  <Button variant="warning" size="sm" onClick={connectWallet}>
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

      {/* Admin Quick Actions */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100 border-success">
            <Card.Body className="text-center">
              <div className="display-4 text-success mb-3">🏗️</div>
              <h5>Create Block</h5>
              <p className="text-muted">
                Create blockchain blocks from processed complaints
              </p>
              <Link to="/admin/blocks">
                <Button variant="success" size="lg">
                  Block Management
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100 border-primary">
            <Card.Body className="text-center">
              <div className="display-4 text-primary mb-3">⚖️</div>
              <h5>Manage Complaints</h5>
              <p className="text-muted">
                Review, update status, and manage all student complaints
              </p>
              <Link to="/admin/complaints">
                <Button variant="primary" size="lg">
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
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">📊 Complaint Statistics</h5>
            </Card.Header>
            <Card.Body>
              {stats ? (
                <Row>
                  <Col sm={6} className="text-center mb-3">
                    <div className="h3 text-primary">{stats.totalComplaints || 0}</div>
                    <small className="text-muted">Total Complaints</small>
                  </Col>
                  <Col sm={6} className="text-center mb-3">
                    <div className="h3 text-success">{stats.resolvedComplaints || 0}</div>
                    <small className="text-muted">Resolved</small>
                  </Col>
                  <Col sm={6} className="text-center">
                    <div className="h3 text-warning">{stats.pendingComplaints || 0}</div>
                    <small className="text-muted">Pending</small>
                  </Col>
                  <Col sm={6} className="text-center">
                    <div className="h3 text-info">{stats.inProgressComplaints || 0}</div>
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
          <Card className="h-100">
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
          <Card>
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
  );
};

export default AdminDashboard;
