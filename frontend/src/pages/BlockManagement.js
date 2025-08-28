import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, Table, Badge, 
  Modal, Spinner, Form, Tabs, Tab, ProgressBar
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { blockManagementAPI } from '../services/api';

const BlockManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for different views
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Block creation state
  const [blockPreview, setBlockPreview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Blocks list state
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState(null);

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    category: '',
    admin_id: '',
    from_date: '',
    to_date: '',
    min_complaints: '',
    max_complaints: ''
  });

  // Fetch block creation preview
  const fetchBlockPreview = async () => {
    try {
      setLoading(true);
      const response = await blockManagementAPI.getPreview();
      setBlockPreview(response.preview);
    } catch (err) {
      console.error('Error fetching block preview:', err);
      setError('Failed to fetch block preview');
    } finally {
      setLoading(false);
    }
  };

  // Fetch blocks list
  const fetchBlocks = async (page = 1) => {
    try {
      setLoading(true);
      const response = await blockManagementAPI.getBlocks(page, 10);
      setBlocks(response.blocks);
    } catch (err) {
      console.error('Error fetching blocks:', err);
      setError('Failed to fetch blocks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await blockManagementAPI.getStatistics();
      setStatistics(response.statistics);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  // Create block
  const handleCreateBlock = async () => {
    try {
      setCreating(true);
      setError('');
      setSuccess('');

      const response = await blockManagementAPI.createBlock();
      
      setSuccess(`Block #${response.block.number} created successfully! 🎉`);
      setShowCreateModal(false);
      
      // Refresh data
      await Promise.all([
        fetchBlockPreview(),
        fetchBlocks(),
        fetchStatistics()
      ]);

    } catch (err) {
      console.error('Error creating block:', err);
      setError(err.response?.data?.error || 'Failed to create block');
    } finally {
      setCreating(false);
    }
  };

  // View block details
  const handleViewDetails = async (blockNumber) => {
    try {
      setLoading(true);
      const response = await blockManagementAPI.getBlockDetails(blockNumber);
      setSelectedBlock(response.block);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching block details:', err);
      setError('Failed to fetch block details');
    } finally {
      setLoading(false);
    }
  };

  // Search blocks
  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await blockManagementAPI.searchBlocks(searchFilters);
      setBlocks(response.results);
    } catch (err) {
      console.error('Error searching blocks:', err);
      setError('Failed to search blocks');
    } finally {
      setLoading(false);
    }
  };

  // Export block data
  const handleExport = async (blockNumber) => {
    try {
      const response = await blockManagementAPI.exportBlock(blockNumber);
      
      // Create and trigger download
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `block_${blockNumber}_export.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Block #${blockNumber} exported successfully!`);
    } catch (err) {
      console.error('Error exporting block:', err);
      setError('Failed to export block');
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchBlockPreview(),
        fetchBlocks(),
        fetchStatistics()
      ]);
    };

    loadData();
  }, []);

  // Dashboard Overview Component
  const DashboardOverview = () => (
    <Row>
      <Col md={8}>
        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">📦 Block Creation</h5>
            <Button
              variant="success"
              onClick={() => setShowCreateModal(true)}
              disabled={!blockPreview?.hasComplaints}
            >
              <i className="fas fa-plus"></i> Create Block
            </Button>
          </Card.Header>
          <Card.Body>
            {blockPreview ? (
              <>
                {blockPreview.hasComplaints ? (
                  <div>
                    <Alert variant="info">
                      <strong>{blockPreview.complaintCount}</strong> unprocessed complaints ready for block creation
                    </Alert>
                    
                    <Row>
                      <Col md={6}>
                        <h6>Top Categories:</h6>
                        <ul>
                          {blockPreview.categoryStats && Object.entries(blockPreview.categoryStats).slice(0, 3).map(([category, count]) => (
                            <li key={category}>
                              <Badge variant="primary">{category}</Badge> - {count} complaints
                            </li>
                          ))}
                          {(!blockPreview.categoryStats || Object.keys(blockPreview.categoryStats).length === 0) && (
                            <li><small className="text-muted">No category data available</small></li>
                          )}
                        </ul>
                      </Col>
                      <Col md={6}>
                        <h6>Priority Breakdown:</h6>
                        {blockPreview.sentimentStats ? (
                          <>
                            <div>
                              <small>Critical: {blockPreview.sentimentStats.critical || 0}</small>
                              <ProgressBar variant="danger" now={((blockPreview.sentimentStats.critical || 0) / Math.max(blockPreview.complaintCount, 1)) * 100} />
                            </div>
                            <div className="mt-2">
                              <small>High: {blockPreview.sentimentStats.high || 0}</small>
                              <ProgressBar variant="warning" now={((blockPreview.sentimentStats.high || 0) / Math.max(blockPreview.complaintCount, 1)) * 100} />
                            </div>
                            <div className="mt-2">
                              <small>Normal: {blockPreview.sentimentStats.normal || 0}</small>
                              <ProgressBar variant="success" now={((blockPreview.sentimentStats.normal || 0) / Math.max(blockPreview.complaintCount, 1)) * 100} />
                            </div>
                          </>
                        ) : (
                          <small className="text-muted">No priority data available</small>
                        )}
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <Alert variant="warning">
                    No unprocessed complaints available for block creation.
                  </Alert>
                )}
              </>
            ) : (
              <div className="text-center">
                <Spinner animation="border" />
                <p className="mt-2">Loading block preview...</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}>
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">📊 System Statistics</h5>
          </Card.Header>
          <Card.Body>
            {statistics ? (
              <>
                <div className="stat-item mb-3">
                  <h3 className="text-primary">{statistics.overview.total_blocks || 0}</h3>
                  <small className="text-muted">Total Blocks</small>
                </div>
                <div className="stat-item mb-3">
                  <h3 className="text-success">{statistics.overview.total_complaints_processed || 0}</h3>
                  <small className="text-muted">Complaints Processed</small>
                </div>
                <div className="stat-item mb-3">
                  <h3 className="text-warning">{statistics.pendingComplaints.count}</h3>
                  <small className="text-muted">Pending Complaints</small>
                </div>
                <div className="stat-item">
                  <h5 className="text-info">#{statistics.overview.latest_block_number || 0}</h5>
                  <small className="text-muted">Latest Block</small>
                </div>
              </>
            ) : (
              <Spinner animation="border" size="sm" />
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  // Blocks List Component
  const BlocksList = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">🧱 All Blocks</h5>
        <Button variant="outline-primary" onClick={() => fetchBlocks()}>
          <i className="fas fa-sync-alt"></i> Refresh
        </Button>
      </Card.Header>
      <Card.Body>
        {blocks.length > 0 ? (
          <Table responsive striped hover>
            <thead>
              <tr>
                <th>Block #</th>
                <th>Complaints</th>
                <th>Top Category</th>
                <th>Priority Score</th>
                <th>Created</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.block_number}>
                  <td>
                    <Badge variant="info">#{block.block_number}</Badge>
                  </td>
                  <td>{block.complaint_count}</td>
                  <td>
                    <Badge variant="secondary">{block.top_category}</Badge>
                  </td>
                  <td>{block.total_priority_score}</td>
                  <td>{new Date(block.created_at).toLocaleDateString()}</td>
                  <td>{block.admin_name || block.admin_id}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleViewDetails(block.block_number)}
                    >
                      <i className="fas fa-eye"></i> View
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleExport(block.block_number)}
                    >
                      <i className="fas fa-download"></i> Export
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center">
            <p className="text-muted">No blocks found</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>🏗️ Block Management</h2>
            <div>
              <Badge variant="info">Admin: {user?.admin_id}</Badge>
            </div>
          </div>

          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

          <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
            <Tab eventKey="dashboard" title="📊 Dashboard">
              <DashboardOverview />
            </Tab>
            
            <Tab eventKey="blocks" title="🧱 All Blocks">
              <BlocksList />
            </Tab>

            <Tab eventKey="search" title="🔍 Search">
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Search Blocks</h5>
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Category</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="e.g. Academic, Hostel"
                            value={searchFilters.category}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, category: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Admin ID</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="Created by admin"
                            value={searchFilters.admin_id}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, admin_id: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>From Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={searchFilters.from_date}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, from_date: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>To Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={searchFilters.to_date}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, to_date: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Min Complaints</Form.Label>
                          <Form.Control
                            type="number"
                            placeholder="0"
                            value={searchFilters.min_complaints}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, min_complaints: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Max Complaints</Form.Label>
                          <Form.Control
                            type="number"
                            placeholder="100"
                            value={searchFilters.max_complaints}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, max_complaints: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Button variant="primary" onClick={handleSearch} disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : <i className="fas fa-search"></i>} Search
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>

          {/* Create Block Modal */}
          <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>🏗️ Create New Block</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {blockPreview && (
                <div>
                  <Alert variant="info">
                    You are about to create a new block with <strong>{blockPreview.complaintCount}</strong> complaints.
                  </Alert>
                  
                  <h6>Block Contents:</h6>
                  <ul>
                    {blockPreview.categoryStats && Object.entries(blockPreview.categoryStats).map(([category, count]) => (
                      <li key={category}>
                        <Badge variant="secondary">{category}</Badge> - {count} complaints
                      </li>
                    ))}
                    {(!blockPreview.categoryStats || Object.keys(blockPreview.categoryStats).length === 0) && (
                      <li><small className="text-muted">No category data available</small></li>
                    )}
                  </ul>
                  
                  <h6>Priority Distribution:</h6>
                  {blockPreview.sentimentStats ? (
                    <>
                      <div className="mb-2">
                        <small>Critical Priority: {blockPreview.sentimentStats.critical || 0} complaints</small>
                        <ProgressBar variant="danger" now={((blockPreview.sentimentStats.critical || 0) / Math.max(blockPreview.complaintCount, 1)) * 100} />
                      </div>
                      <div className="mb-2">
                        <small>High Priority: {blockPreview.sentimentStats.high || 0} complaints</small>
                        <ProgressBar variant="warning" now={((blockPreview.sentimentStats.high || 0) / Math.max(blockPreview.complaintCount, 1)) * 100} />
                      </div>
                      <div className="mb-2">
                        <small>Normal Priority: {blockPreview.sentimentStats.normal || 0} complaints</small>
                        <ProgressBar variant="success" now={((blockPreview.sentimentStats.normal || 0) / Math.max(blockPreview.complaintCount, 1)) * 100} />
                      </div>
                    </>
                  ) : (
                    <small className="text-muted">No priority data available</small>
                  )}
                  
                  <p className="text-muted mt-3">
                    This action will create a permanent block on the blockchain and cannot be undone.
                  </p>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleCreateBlock} disabled={creating}>
                {creating ? <Spinner animation="border" size="sm" /> : <i className="fas fa-plus"></i>} Create Block
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Block Details Modal */}
          <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="xl">
            <Modal.Header closeButton>
              <Modal.Title>📦 Block #{selectedBlock?.block_number} Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedBlock && (
                <div>
                  <Row className="mb-4">
                    <Col md={6}>
                      <h6>Block Information</h6>
                      <ul className="list-unstyled">
                        <li><strong>Block Number:</strong> #{selectedBlock.block_number}</li>
                        <li><strong>Merkle Root:</strong> <code>{selectedBlock.merkle_root}</code></li>
                        <li><strong>Complaint Count:</strong> {selectedBlock.complaint_count}</li>
                        <li><strong>Total Priority Score:</strong> {selectedBlock.total_priority_score}</li>
                        <li><strong>Created:</strong> {new Date(selectedBlock.created_at).toLocaleString()}</li>
                        <li><strong>Created By:</strong> {selectedBlock.admin_name || selectedBlock.admin_id}</li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <h6>Category Statistics</h6>
                      {selectedBlock.categoryStats && Object.entries(selectedBlock.categoryStats).map(([category, count]) => (
                        <div key={category} className="d-flex justify-content-between">
                          <Badge variant="secondary">{category}</Badge>
                          <span>{count}</span>
                        </div>
                      ))}
                    </Col>
                  </Row>

                  <h6>Complaints in this Block</h6>
                  <Table striped hover size="sm">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBlock.complaints?.map((complaint) => (
                        <tr key={complaint.complaint_id}>
                          <td>{complaint.inclusion_order}</td>
                          <td>{complaint.complaint_id}</td>
                          <td>{complaint.title}</td>
                          <td><Badge variant="info">{complaint.category}</Badge></td>
                          <td><Badge variant="warning">{complaint.status}</Badge></td>
                          <td>{new Date(complaint.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="success" onClick={() => handleExport(selectedBlock?.block_number)}>
                <i className="fas fa-download"></i> Export Block Data
              </Button>
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
};

export default BlockManagement;
