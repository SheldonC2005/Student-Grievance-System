import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { 
  getMyComplaints, 
  escalateComplaint,
  getPriorityColor,
  getStatusColor,
  getCategoryBadgeClass,
  formatDate 
} from '../services/complaintService';

const MyComplaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMyComplaints();
  }, []);

  const loadMyComplaints = async () => {
    try {
      setLoading(true);
      const result = await getMyComplaints();
      setComplaints(result.complaints || []);
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError('Failed to load your complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (complaintId) => {
    try {
      setEscalating(complaintId);
      const result = await escalateComplaint(complaintId);
      
      toast.success(`Complaint escalated from ${result.oldPriority} to ${result.newPriority}!`);
      
      // Update the complaint in the list
      setComplaints(prev => 
        prev.map(complaint => 
          complaint.id === complaintId 
            ? { ...complaint, ...result.complaint }
            : complaint
        )
      );
    } catch (err) {
      console.error('Error escalating complaint:', err);
      const message = err.response?.data?.error || 'Failed to escalate complaint';
      toast.error(message);
    } finally {
      setEscalating(null);
    }
  };

  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  const canEscalate = (complaint) => {
    return complaint.priority !== 'Critical' && 
           (complaint.status === 'Pending' || complaint.status === 'InProgress');
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your complaints...</p>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2 className="text-primary">📋 My Complaints</h2>
          <p className="text-muted">
            Track and manage your submitted grievances
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

      {complaints.length === 0 ? (
        <Row>
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <div className="display-4 text-muted mb-3">📝</div>
                <h4>No Complaints Yet</h4>
                <p className="text-muted">
                  You haven't submitted any complaints yet. 
                  Would you like to submit your first complaint?
                </p>
                <Button variant="primary" href="/submit-complaint">
                  Submit Your First Complaint
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <>
          <Row className="mb-3">
            <Col>
              <p className="text-muted">
                Found {complaints.length} complaint(s)
              </p>
            </Col>
          </Row>

          <Row>
            {complaints.map((complaint) => (
              <Col lg={6} key={complaint.id} className="mb-4">
                <Card className={`complaint-card priority-${complaint.priority.toLowerCase()}`}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-1">{complaint.title}</h5>
                        <Badge className={`category-badge ${getCategoryBadgeClass(complaint.category)}`}>
                          {complaint.category}
                        </Badge>
                      </div>
                      <div className="text-end">
                        <Badge bg={getPriorityColor(complaint.priority)} className="mb-1">
                          {complaint.priority} Priority
                        </Badge>
                        <br />
                        <Badge bg={getStatusColor(complaint.status)}>
                          {complaint.status}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-muted mb-3">
                      {complaint.description.length > 150 
                        ? `${complaint.description.substring(0, 150)}...` 
                        : complaint.description
                      }
                    </p>

                    <div className="mb-3">
                      <small className="text-muted">
                        <strong>Submitted:</strong> {formatDate(complaint.created_at)}
                        {complaint.escalation_count > 0 && (
                          <>
                            <br />
                            <strong>Escalated:</strong> {complaint.escalation_count} time(s)
                          </>
                        )}
                        {complaint.blockchain_hash && (
                          <>
                            <br />
                            <strong>Blockchain:</strong> 
                            <code className="ms-1">
                              {complaint.blockchain_hash.substring(0, 10)}...
                            </code>
                          </>
                        )}
                      </small>
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewDetails(complaint)}
                      >
                        View Details
                      </Button>
                      
                      {canEscalate(complaint) && (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleEscalate(complaint.id)}
                          disabled={escalating === complaint.id}
                        >
                          {escalating === complaint.id ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-1" />
                              Escalating...
                            </>
                          ) : (
                            '⬆️ Escalate Priority'
                          )}
                        </Button>
                      )}
                    </div>

                    {complaint.sentiment_score && (
                      <div className="mt-2">
                        <small className="text-muted">
                          AI Sentiment: {(complaint.sentiment_score * 100).toFixed(0)}% 
                          {complaint.sentiment_score < 0.3 ? ' (High Concern)' : 
                           complaint.sentiment_score < 0.6 ? ' (Moderate)' : ' (Positive)'}
                        </small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {/* Complaint Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Complaint Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedComplaint && (
            <>
              <h5>{selectedComplaint.title}</h5>
              
              <div className="mb-3">
                <Badge className={`category-badge ${getCategoryBadgeClass(selectedComplaint.category)} me-2`}>
                  {selectedComplaint.category}
                </Badge>
                <Badge bg={getPriorityColor(selectedComplaint.priority)} className="me-2">
                  {selectedComplaint.priority} Priority
                </Badge>
                <Badge bg={getStatusColor(selectedComplaint.status)}>
                  {selectedComplaint.status}
                </Badge>
              </div>

              <h6>Description</h6>
              <p className="mb-3">{selectedComplaint.description}</p>

              <Row>
                <Col md={6}>
                  <h6>Submission Details</h6>
                  <ul className="list-unstyled">
                    <li><strong>Submitted:</strong> {formatDate(selectedComplaint.created_at)}</li>
                    <li><strong>Last Updated:</strong> {formatDate(selectedComplaint.updated_at)}</li>
                    <li><strong>Escalations:</strong> {selectedComplaint.escalation_count}</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6>Blockchain Info</h6>
                  <ul className="list-unstyled">
                    <li><strong>Blockchain ID:</strong> {selectedComplaint.blockchain_id || 'N/A'}</li>
                    <li><strong>Hash:</strong> 
                      <br />
                      <code className="small">
                        {selectedComplaint.blockchain_hash || 'N/A'}
                      </code>
                    </li>
                    {selectedComplaint.ipfs_hash && (
                      <li><strong>IPFS Hash:</strong>
                        <br />
                        <code className="small">{selectedComplaint.ipfs_hash}</code>
                      </li>
                    )}
                  </ul>
                </Col>
              </Row>

              {selectedComplaint.sentiment_score && (
                <div className="mt-3">
                  <h6>AI Analysis</h6>
                  <p>
                    <strong>Sentiment Score:</strong> {(selectedComplaint.sentiment_score * 100).toFixed(1)}%
                    {selectedComplaint.sentiment_score < 0.3 && 
                      <span className="text-danger"> (High concern detected)</span>
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedComplaint && canEscalate(selectedComplaint) && (
            <Button
              variant="warning"
              onClick={() => {
                handleEscalate(selectedComplaint.id);
                setShowModal(false);
              }}
              disabled={escalating === selectedComplaint.id}
            >
              {escalating === selectedComplaint.id ? 'Escalating...' : 'Escalate Priority'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyComplaints;
