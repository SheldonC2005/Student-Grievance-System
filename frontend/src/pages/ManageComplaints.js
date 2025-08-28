import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ManageComplaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingComplaint, setUpdatingComplaint] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updateData, setUpdateData] = useState({
    status: '',
    adminMessage: '',
    adminImage: null
  });

  const statusOptions = [
    { value: 'SUBMITTED', label: 'Submitted', variant: 'secondary' },
    { value: 'IN_PROGRESS', label: 'In Progress', variant: 'warning' },
    { value: 'UNDER_REVIEW', label: 'Under Review', variant: 'info' },
    { value: 'RESOLVED', label: 'Resolved', variant: 'success' },
    { value: 'CLOSED', label: 'Closed', variant: 'dark' },
    { value: 'REJECTED', label: 'Rejected', variant: 'danger' }
  ];

  const priorityColors = {
    'HIGH': 'danger',
    'MEDIUM': 'warning',
    'LOW': 'info'
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/api/complaints');
      
      if (response.data) {
        setComplaints(response.data);
      }
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError('Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    const statusObj = statusOptions.find(s => s.value === status);
    return statusObj ? statusObj.variant : 'secondary';
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const openUpdateModal = (complaint) => {
    setSelectedComplaint(complaint);
    setUpdateData({
      status: complaint.status,
      adminMessage: '',
      adminImage: null
    });
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedComplaint(null);
    setUpdateData({
      status: '',
      adminMessage: '',
      adminImage: null
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      if (file.size > maxSize) {
        setError('Image file must be less than 5MB');
        return;
      }

      setUpdateData(prev => ({
        ...prev,
        adminImage: file
      }));
      setError('');
    }
  };

  const updateComplaintStatus = async () => {
    if (!selectedComplaint || !updateData.status) {
      setError('Please select a status');
      return;
    }

    try {
      setUpdatingComplaint(selectedComplaint.id);
      setError('');

      // Prepare form data for file upload
      const formData = new FormData();
      formData.append('status', updateData.status);
      
      if (updateData.adminMessage.trim()) {
        formData.append('adminMessage', updateData.adminMessage.trim());
      }
      
      if (updateData.adminImage) {
        formData.append('adminImage', updateData.adminImage);
      }

      const response = await api.patch(`/api/complaints/${selectedComplaint.id}/status`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data) {
        setSuccessMessage(`Complaint ${selectedComplaint.id} status updated successfully`);
        await loadComplaints(); // Reload complaints
        closeUpdateModal();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error updating complaint:', err);
      setError(
        err.response?.data?.error || 
        'Failed to update complaint status. Please try again.'
      );
    } finally {
      setUpdatingComplaint(null);
    }
  };

  const quickStatusUpdate = async (complaintId, newStatus) => {
    try {
      setUpdatingComplaint(complaintId);
      setError('');

      const response = await api.patch(`/api/complaints/${complaintId}/status`, {
        status: newStatus
      });

      if (response.data) {
        setSuccessMessage(`Complaint ${complaintId} status updated to ${newStatus}`);
        await loadComplaints(); // Reload complaints
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error updating complaint:', err);
      setError(
        err.response?.data?.error || 
        'Failed to update complaint status. Please try again.'
      );
    } finally {
      setUpdatingComplaint(null);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading complaints...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="text-primary">⚖️ Manage Complaints</h2>
          <p className="text-muted">Review and update the status of all student complaints</p>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {successMessage && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Statistics */}
      <Row className="mb-4">
        <Col md={3} sm={6}>
          <Card className="text-center h-100 border-primary">
            <Card.Body>
              <h4 className="text-primary">{complaints.length}</h4>
              <small className="text-muted">Total Complaints</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="text-center h-100 border-warning">
            <Card.Body>
              <h4 className="text-warning">
                {complaints.filter(c => c.status === 'IN_PROGRESS').length}
              </h4>
              <small className="text-muted">In Progress</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="text-center h-100 border-success">
            <Card.Body>
              <h4 className="text-success">
                {complaints.filter(c => c.status === 'RESOLVED').length}
              </h4>
              <small className="text-muted">Resolved</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="text-center h-100 border-secondary">
            <Card.Body>
              <h4 className="text-secondary">
                {complaints.filter(c => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length}
              </h4>
              <small className="text-muted">Pending Review</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Complaints Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">All Complaints</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {complaints.length === 0 ? (
                <div className="text-center py-5">
                  <div className="text-muted">
                    <h5>No complaints found</h5>
                    <p>There are currently no complaints to display.</p>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Student</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((complaint) => (
                        <tr key={complaint.id}>
                          <td>
                            <code>{complaint.id}</code>
                          </td>
                          <td>
                            <div className="text-truncate" style={{ maxWidth: '200px' }}>
                              <strong>{complaint.title}</strong>
                            </div>
                            {complaint.description && (
                              <small className="text-muted text-truncate d-block" style={{ maxWidth: '200px' }}>
                                {complaint.description}
                              </small>
                            )}
                          </td>
                          <td>
                            <div>
                              <strong>{complaint.full_name || 'Unknown'}</strong>
                            </div>
                            <small className="text-muted">
                              {complaint.student_identifier || complaint.student_id}
                            </small>
                          </td>
                          <td>
                            <Badge bg="info" className="text-capitalize">
                              {complaint.category}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={priorityColors[complaint.priority] || 'secondary'}>
                              {complaint.priority}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(complaint.status)}>
                              {complaint.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td>
                            <small>{formatDate(complaint.created_at)}</small>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => openUpdateModal(complaint)}
                                disabled={updatingComplaint === complaint.id}
                              >
                                {updatingComplaint === complaint.id ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  '✏️'
                                )}
                              </Button>
                              
                              {complaint.status !== 'RESOLVED' && (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => quickStatusUpdate(complaint.id, 'RESOLVED')}
                                  disabled={updatingComplaint === complaint.id}
                                  title="Mark as Resolved"
                                >
                                  ✅
                                </Button>
                              )}
                              
                              {complaint.status === 'SUBMITTED' && (
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => quickStatusUpdate(complaint.id, 'IN_PROGRESS')}
                                  disabled={updatingComplaint === complaint.id}
                                  title="Start Processing"
                                >
                                  🔄
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Update Modal */}
      <Modal show={showUpdateModal} onHide={closeUpdateModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Update Complaint #{selectedComplaint?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedComplaint && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Title:</strong>
                  <p>{selectedComplaint.title}</p>
                </Col>
                <Col md={6}>
                  <strong>Student:</strong>
                  <p>{selectedComplaint.full_name} ({selectedComplaint.student_identifier})</p>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Category:</strong>
                  <p className="text-capitalize">{selectedComplaint.category}</p>
                </Col>
                <Col md={6}>
                  <strong>Priority:</strong>
                  <p>
                    <Badge bg={priorityColors[selectedComplaint.priority] || 'secondary'}>
                      {selectedComplaint.priority}
                    </Badge>
                  </p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col>
                  <strong>Description:</strong>
                  <p>{selectedComplaint.description}</p>
                </Col>
              </Row>

              <Form>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label><strong>Update Status:</strong></Form.Label>
                      <Form.Select
                        value={updateData.status}
                        onChange={(e) => setUpdateData(prev => ({ ...prev, status: e.target.value }))}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label><strong>Admin Response Image:</strong></Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <Form.Text className="text-muted">
                        Upload an image as part of your response (optional)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col>
                    <Form.Group>
                      <Form.Label><strong>Admin Message:</strong></Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder="Enter your response or update message for the student..."
                        value={updateData.adminMessage}
                        onChange={(e) => setUpdateData(prev => ({ ...prev, adminMessage: e.target.value }))}
                      />
                      <Form.Text className="text-muted">
                        This message will be visible to the student (optional)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeUpdateModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={updateComplaintStatus}
            disabled={!updateData.status || updatingComplaint}
          >
            {updatingComplaint ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              'Update Complaint'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageComplaints;
