import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { 
  getAllComplaints,
  getPriorityColor,
  getStatusColor,
  getCategoryBadgeClass,
  formatDate,
  COMPLAINT_CATEGORIES 
} from '../services/complaintService';
import { getBlockchainLedger, truncateHash, copyToClipboard } from '../services/blockchainService';

const Ledger = () => {
  const [complaints, setComplaints] = useState([]);
  const [blockchainData, setBlockchainData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('database');
  const [filters, setFilters] = useState({
    category: '',
    priority: '',
    status: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadLedgerData();
  }, [filters]);

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load database complaints
      const dbResult = await getAllComplaints(filters);
      setComplaints(dbResult.complaints || []);

      // Load blockchain ledger
      if (activeTab === 'blockchain') {
        const blockchainResult = await getBlockchainLedger();
        setBlockchainData(blockchainResult.ledger || []);
      }

    } catch (err) {
      console.error('Error loading ledger data:', err);
      setError('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'blockchain') {
      loadBlockchainData();
    }
  };

  const loadBlockchainData = async () => {
    try {
      setLoading(true);
      const result = await getBlockchainLedger();
      setBlockchainData(result.ledger || []);
    } catch (err) {
      console.error('Error loading blockchain data:', err);
      setError('Failed to load blockchain ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ category: '', priority: '', status: '' });
  };

  const handleCopyHash = (hash) => {
    copyToClipboard(hash);
    // You could add a toast notification here
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2 className="text-primary">🔗 Transparent Blockchain Ledger</h2>
          <p className="text-muted">
            View all complaints recorded in the system with full transparency
          </p>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      {/* Tab Navigation */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <Button
                    variant={activeTab === 'database' ? 'primary' : 'outline-primary'}
                    className="me-2"
                    onClick={() => handleTabChange('database')}
                  >
                    📊 Database View
                  </Button>
                  <Button
                    variant={activeTab === 'blockchain' ? 'primary' : 'outline-primary'}
                    onClick={() => handleTabChange('blockchain')}
                  >
                    ⛓️ Blockchain View
                  </Button>
                </div>
                <div>
                  <small className="text-muted">
                    {activeTab === 'database' 
                      ? `${complaints.length} complaints in database`
                      : `${blockchainData.length} blocks in blockchain`
                    }
                  </small>
                </div>
              </div>
            </Card.Header>
          </Card>
        </Col>
      </Row>

      {/* Filters (only for database view) */}
      {activeTab === 'database' && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h6 className="mb-0">🔍 Filters</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Category</Form.Label>
                      <Form.Select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {COMPLAINT_CATEGORIES.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Priority</Form.Label>
                      <Form.Select
                        value={filters.priority}
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                      >
                        <option value="">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                      >
                        <option value="">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Button variant="outline-secondary" onClick={clearFilters} className="w-100">
                      Clear Filters
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Content */}
      <Row>
        <Col>
          <Card className="ledger-container">
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading {activeTab} data...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'database' ? (
                    <DatabaseView 
                      complaints={complaints} 
                      onCopyHash={handleCopyHash}
                    />
                  ) : (
                    <BlockchainView 
                      blockchainData={blockchainData} 
                      onCopyHash={handleCopyHash}
                    />
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

// Database View Component
const DatabaseView = ({ complaints, onCopyHash }) => {
  if (complaints.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="display-4 text-muted mb-3">📊</div>
        <h4>No Complaints Found</h4>
        <p className="text-muted">No complaints match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>Student</th>
            <th>Category</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Blockchain Hash</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((complaint) => (
            <tr key={complaint.id}>
              <td>{complaint.id}</td>
              <td>
                <strong>{complaint.full_name || 'Unknown'}</strong>
                <br />
                <small className="text-muted">{complaint.student_identifier}</small>
              </td>
              <td>
                <Badge className={`category-badge ${getCategoryBadgeClass(complaint.category)}`}>
                  {complaint.category}
                </Badge>
              </td>
              <td>
                <strong>{complaint.title}</strong>
                {complaint.description && (
                  <div className="small text-muted mt-1">
                    {complaint.description.substring(0, 100)}...
                  </div>
                )}
              </td>
              <td>
                <Badge bg={getPriorityColor(complaint.priority)}>
                  {complaint.priority}
                </Badge>
              </td>
              <td>
                <Badge bg={getStatusColor(complaint.status)}>
                  {complaint.status}
                </Badge>
              </td>
              <td>
                <small>{formatDate(complaint.created_at)}</small>
              </td>
              <td>
                {complaint.blockchain_hash ? (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => onCopyHash(complaint.blockchain_hash)}
                    title="Click to copy"
                  >
                    <code className="small">
                      {truncateHash(complaint.blockchain_hash)}
                    </code>
                  </Button>
                ) : (
                  <span className="text-muted">Not on chain</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

// Blockchain View Component
const BlockchainView = ({ blockchainData, onCopyHash }) => {
  if (blockchainData.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="display-4 text-muted mb-3">⛓️</div>
        <h4>No Blockchain Data</h4>
        <p className="text-muted">
          No complaints have been recorded on the blockchain yet, or the blockchain is not accessible.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead className="table-dark">
          <tr>
            <th>Block ID</th>
            <th>Student ID</th>
            <th>Category</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Block Hash</th>
            <th>Nonce</th>
            <th>Timestamp</th>
            <th>Verified</th>
          </tr>
        </thead>
        <tbody>
          {blockchainData.map((block, index) => (
            <tr key={index}>
              <td>
                <Badge bg="primary">#{block.id}</Badge>
              </td>
              <td>{block.studentId}</td>
              <td>
                <Badge className={`category-badge ${getCategoryBadgeClass(block.category)}`}>
                  {block.category}
                </Badge>
              </td>
              <td>
                <strong>{block.title}</strong>
                {block.description && (
                  <div className="small text-muted mt-1">
                    {block.description.substring(0, 80)}...
                  </div>
                )}
              </td>
              <td>
                <Badge bg={getPriorityColor(block.priority)}>
                  {block.priority}
                </Badge>
              </td>
              <td>
                <Badge bg={getStatusColor(block.status)}>
                  {block.status}
                </Badge>
              </td>
              <td>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => onCopyHash(block.complaintHash)}
                  title="Click to copy hash"
                >
                  <code className="small">
                    {truncateHash(block.complaintHash)}
                  </code>
                </Button>
              </td>
              <td>
                <code className="small">{block.nonce}</code>
              </td>
              <td>
                <small>{formatDate(block.timestamp)}</small>
              </td>
              <td>
                {block.isVerified ? (
                  <Badge bg="success">✓ Verified</Badge>
                ) : (
                  <Badge bg="warning">⏳ Pending</Badge>
                )}
                {block.mockData && (
                  <div>
                    <br />
                    <Badge bg="info" className="mt-1">Mock Data</Badge>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default Ledger;
