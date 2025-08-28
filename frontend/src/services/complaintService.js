import api from './api';

// Submit a new complaint
export const submitComplaint = async (complaintData) => {
  try {
    const response = await api.post('/complaints/submit', complaintData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Analyze sentiment in real-time
export const analyzeSentiment = async (text) => {
  try {
    const response = await api.post('/complaints/analyze-sentiment', { text });
    return response.data;
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return {
      sentiment: { score: 0.5, label: 'neutral', color: 'secondary' },
      urgency: { detected: false, level: 'normal' },
      analysis: { wordCount: 0, detailLevel: 'minimal', readabilityScore: 50 }
    };
  }
};

// Get all complaints for ledger
export const getAllComplaints = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    
    const response = await api.get(`/complaints?${params}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get user's complaints
export const getMyComplaints = async () => {
  try {
    const response = await api.get('/complaints/my-complaints');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get complaint by ID
export const getComplaintById = async (id) => {
  try {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Escalate complaint
export const escalateComplaint = async (id) => {
  try {
    const response = await api.patch(`/complaints/${id}/escalate`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Find similar complaints
export const findSimilarComplaints = async (description, category) => {
  try {
    const response = await api.post('/complaints/find-similar', {
      description,
      category
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get complaint statistics
export const getComplaintStats = async () => {
  try {
    const response = await api.get('/complaints/stats/overview');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Categories for complaints
export const COMPLAINT_CATEGORIES = [
  { value: 'Academic', label: 'Academic Issues' },
  { value: 'Harassment', label: 'Harassment' },
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'FoodServices', label: 'Food Services' },
  { value: 'HostelIssues', label: 'Hostel Issues' },
  { value: 'FinancialIssues', label: 'Financial Issues' },
  { value: 'AdministrativeIssues', label: 'Administrative Issues' },
  { value: 'TechnicalIssues', label: 'Technical Issues' },
  { value: 'Other', label: 'Other' }
];

// Priority levels
export const PRIORITY_LEVELS = [
  { value: 'Low', label: 'Low', color: 'success' },
  { value: 'Medium', label: 'Medium', color: 'warning' },
  { value: 'High', label: 'High', color: 'danger' },
  { value: 'Critical', label: 'Critical', color: 'dark' }
];

// Status types
export const STATUS_TYPES = [
  { value: 'Pending', label: 'Pending', color: 'warning' },
  { value: 'InProgress', label: 'In Progress', color: 'info' },
  { value: 'Resolved', label: 'Resolved', color: 'success' },
  { value: 'Closed', label: 'Closed', color: 'secondary' }
];

// Utility functions
export const getPriorityColor = (priority) => {
  const priorityObj = PRIORITY_LEVELS.find(p => p.value === priority);
  return priorityObj ? priorityObj.color : 'secondary';
};

export const getStatusColor = (status) => {
  const statusObj = STATUS_TYPES.find(s => s.value === status);
  return statusObj ? statusObj.color : 'secondary';
};

export const getCategoryBadgeClass = (category) => {
  const classMap = {
    'Academic': 'category-academic',
    'Harassment': 'category-harassment',
    'Infrastructure': 'category-infrastructure',
    'FoodServices': 'category-foodservices',
    'HostelIssues': 'category-hostelissues',
    'Other': 'category-other'
  };
  return classMap[category] || 'category-other';
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
