import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, ListGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { 
  submitComplaint, 
  findSimilarComplaints,
  analyzeSentiment,
  COMPLAINT_CATEGORIES 
} from '../services/complaintService';

const SubmitComplaint = () => {
  const { user } = useAuth();
  const { isConnected } = useWeb3();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [checkingSimilar, setCheckingSimilar] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  const [similarComplaints, setSimilarComplaints] = useState([]);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Debounced similar complaint check and sentiment analysis
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.description.length > 20 && formData.category) {
        checkForSimilarComplaints();
      }
      if (formData.description.length > 10) {
        performSentimentAnalysis();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData.description, formData.category]);

  const checkForSimilarComplaints = async () => {
    if (!formData.description.trim() || !formData.category) return;

    setCheckingSimilar(true);
    try {
      const result = await findSimilarComplaints(formData.description, formData.category);
      setSimilarComplaints(result.similarComplaints || []);
      setShowSimilar(result.similarComplaints?.length > 0);
    } catch (err) {
      console.error('Error checking similar complaints:', err);
    } finally {
      setCheckingSimilar(false);
    }
  };

  const performSentimentAnalysis = async () => {
    if (!formData.description.trim()) {
      setSentimentAnalysis(null);
      return;
    }

    setAnalyzingSentiment(true);
    try {
      const analysis = await analyzeSentiment(formData.description);
      setSentimentAnalysis(analysis);
    } catch (err) {
      console.error('Error analyzing sentiment:', err);
      setSentimentAnalysis(null);
    } finally {
      setAnalyzingSentiment(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.description.length < 10) {
      setError('Please provide a more detailed description (at least 10 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await submitComplaint(formData);
      
      setSuccess('Complaint submitted successfully!');
      toast.success('Complaint submitted and recorded on blockchain!');
      
      // Reset form
      setFormData({ category: '', title: '', description: '' });
      setSimilarComplaints([]);
      setSentimentAnalysis(null);
      setShowSimilar(false);
      
      // Navigate to my complaints after a short delay
      setTimeout(() => {
        navigate('/my-complaints');
      }, 2000);

    } catch (err) {
      console.error('Error submitting complaint:', err);
      const message = err.response?.data?.error || 'Failed to submit complaint';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateExisting = (complaintId) => {
    // This would typically navigate to the existing complaint or show escalation options
    toast.info(`You can escalate complaint #${complaintId} from your complaints page`);
    navigate('/my-complaints');
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="form-container">
            <Card.Body>
              <div className="text-center mb-4">
                <h2 className="text-primary">📝 Submit New Complaint</h2>
                <p className="text-muted">
                  Your complaint will be recorded on the blockchain for transparency and immutability
                </p>
              </div>

              {/* Blockchain Connection Warning */}
              {!isConnected && (
                <Alert variant="warning" className="mb-4">
                  <Alert.Heading>⚠️ Blockchain Not Connected</Alert.Heading>
                  <p>
                    While you can still submit complaints, connecting your MetaMask wallet 
                    enables full blockchain features and enhanced security.
                  </p>
                </Alert>
              )}

              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                {/* Category Selection */}
                <Form.Group className="mb-4">
                  <Form.Label>
                    <strong>Complaint Category *</strong>
                  </Form.Label>
                  <Form.Select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    required
                  >
                    <option value="">Select a category...</option>
                    {COMPLAINT_CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Choose the category that best describes your complaint
                  </Form.Text>
                </Form.Group>

                {/* Title */}
                <Form.Group className="mb-4">
                  <Form.Label>
                    <strong>Complaint Title *</strong>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Brief summary of your complaint"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    maxLength={200}
                    required
                  />
                  <Form.Text className="text-muted">
                    Provide a clear, concise title for your complaint ({formData.title.length}/200)
                  </Form.Text>
                </Form.Group>

                {/* Description */}
                <Form.Group className="mb-4">
                  <Form.Label>
                    <strong>Detailed Description *</strong>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    placeholder="Describe your complaint in detail. Include relevant dates, locations, and any other important information..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Provide as much detail as possible. This helps with AI analysis and resolution.
                    ({formData.description.length} characters)
                  </Form.Text>
                  
                  {(checkingSimilar || analyzingSentiment) && (
                    <div className="mt-2">
                      <Spinner animation="border" size="sm" className="me-2" />
                      <small className="text-muted">
                        {checkingSimilar && "Checking for similar complaints..."}
                        {analyzingSentiment && "Analyzing sentiment..."}
                      </small>
                    </div>
                  )}
                </Form.Group>

                {/* Similar Complaints Warning */}
                {showSimilar && similarComplaints.length > 0 && (
                  <Alert variant="warning" className="mb-4">
                    <Alert.Heading>⚠️ Similar Complaints Found</Alert.Heading>
                    <p>
                      We found {similarComplaints.length} similar complaint(s). 
                      You may want to escalate an existing complaint instead of creating a duplicate.
                    </p>
                    
                    <ListGroup className="mt-3">
                      {similarComplaints.slice(0, 3).map((complaint, index) => (
                        <ListGroup.Item 
                          key={index}
                          className="d-flex justify-content-between align-items-start"
                        >
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{complaint.title}</h6>
                            <p className="mb-1 text-muted small">
                              {complaint.description.substring(0, 100)}...
                            </p>
                            <Badge bg="info">
                              {Math.round(complaint.similarity * 100)}% similar
                            </Badge>
                          </div>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() => handleEscalateExisting(complaint.id)}
                          >
                            View & Escalate
                          </Button>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                    
                    <hr />
                    <p className="mb-0">
                      <strong>Still want to submit a new complaint?</strong> 
                      Continue below if your issue is genuinely different.
                    </p>
                  </Alert>
                )}

                {/* AI Insights */}
                {sentimentAnalysis && formData.description.length > 10 && (
                  <Alert variant="info" className="mb-4">
                    <h6>🤖 AI Analysis Results</h6>
                    <Row>
                      <Col md={4}>
                        <strong>Sentiment:</strong>
                        <br />
                        <Badge bg={sentimentAnalysis.sentiment.color} className="me-1">
                          {sentimentAnalysis.sentiment.label}
                        </Badge>
                        <small className="text-muted">
                          (Score: {Math.round(sentimentAnalysis.sentiment.score * 100)}%)
                        </small>
                      </Col>
                      <Col md={4}>
                        <strong>Urgency Level:</strong>
                        <br />
                        <Badge bg={sentimentAnalysis.urgency.detected ? 'warning' : 'success'}>
                          {sentimentAnalysis.urgency.level}
                        </Badge>
                        {sentimentAnalysis.urgency.detected && (
                          <small className="text-muted d-block">
                            Urgent keywords detected
                          </small>
                        )}
                      </Col>
                      <Col md={4}>
                        <strong>Detail Level:</strong>
                        <br />
                        <Badge bg="info">
                          {sentimentAnalysis.analysis.detailLevel}
                        </Badge>
                        <small className="text-muted d-block">
                          {sentimentAnalysis.analysis.wordCount} words
                        </small>
                      </Col>
                    </Row>
                  </Alert>
                )}

                {/* Submit Button */}
                <div className="text-center">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={loading || !formData.category || !formData.title.trim() || !formData.description.trim()}
                    className="px-5"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Submitting to Blockchain...
                      </>
                    ) : (
                      '📤 Submit Complaint'
                    )}
                  </Button>
                </div>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    By submitting, you agree that your complaint will be recorded on the blockchain 
                    for transparency and cannot be deleted.
                  </small>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SubmitComplaint;
