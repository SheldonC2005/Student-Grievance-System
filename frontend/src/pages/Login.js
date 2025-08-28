import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tabs, Tab, ButtonGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';

const Login = () => {
  const { login, register, loginWithMetaMask, adminLogin } = useAuth();
  const { connectWallet, signMessage, account } = useWeb3();
  
  const [activeTab, setActiveTab] = useState('login');
  const [userType, setUserType] = useState('student'); // 'student' or 'admin'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });
  
  // Register form state
  const [registerForm, setRegisterForm] = useState({
    studentId: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  // Admin login form state
  const [adminLoginForm, setAdminLoginForm] = useState({
    adminId: '',
    password: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (userType === 'admin') {
        result = await adminLogin(adminLoginForm);
      } else {
        result = await login(loginForm);
      }
      
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...userData } = registerForm;
      const result = await register(userData);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMetaMaskLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // First connect wallet if not connected
      let walletAccount = account;
      if (!walletAccount) {
        const connectResult = await connectWallet();
        if (!connectResult.success) {
          setError(connectResult.error);
          setLoading(false);
          return;
        }
        walletAccount = connectResult.account;
      }

      // Create message to sign
      const message = `Login to Student Grievance System\nWallet: ${walletAccount}\nTimestamp: ${Date.now()}`;
      
      // Sign message
      const signature = await signMessage(message);
      
      // Send to backend for authentication
      const result = await loginWithMetaMask({
        walletAddress: walletAccount,
        signature,
        message
      });

      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      console.error('MetaMask login error:', err);
      setError('MetaMask login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (form, field, value) => {
    if (form === 'login') {
      setLoginForm(prev => ({ ...prev, [field]: value }));
    } else if (form === 'register') {
      setRegisterForm(prev => ({ ...prev, [field]: value }));
    } else if (form === 'admin') {
      setAdminLoginForm(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="login-container">
      <Container>
        <Row className="justify-content-center align-items-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="login-card">
              <Card.Body>
                <div className="text-center mb-4">
                  <h2 className="text-primary">🎓 Student Grievance System</h2>
                  <p className="text-muted">Secure, Transparent, Blockchain-Powered</p>
                  
                  {/* User Type Selection */}
                  <div className="mb-3">
                    <ButtonGroup className="w-100">
                      <Button
                        variant={userType === 'student' ? 'primary' : 'outline-primary'}
                        onClick={() => {
                          setUserType('student');
                          setError('');
                        }}
                      >
                        👨‍🎓 Student
                      </Button>
                      <Button
                        variant={userType === 'admin' ? 'primary' : 'outline-primary'}
                        onClick={() => {
                          setUserType('admin');
                          setError('');
                        }}
                      >
                        👨‍💼 Admin
                      </Button>
                    </ButtonGroup>
                  </div>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-3"
                >
                  <Tab eventKey="login" title="Login">
                    <Form onSubmit={handleLoginSubmit}>
                      {userType === 'admin' ? (
                        <>
                          <Form.Group className="mb-3">
                            <Form.Label>Admin ID</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Enter your admin ID"
                              value={adminLoginForm.adminId}
                              onChange={(e) => handleInputChange('admin', 'adminId', e.target.value)}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                              type="password"
                              placeholder="Enter your password"
                              value={adminLoginForm.password}
                              onChange={(e) => handleInputChange('admin', 'password', e.target.value)}
                              required
                            />
                          </Form.Group>
                        </>
                      ) : (
                        <>
                          <Form.Group className="mb-3">
                            <Form.Label>Student ID or Email</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Enter your student ID or email"
                              value={loginForm.identifier}
                              onChange={(e) => handleInputChange('login', 'identifier', e.target.value)}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                              type="password"
                              placeholder="Enter your password"
                              value={loginForm.password}
                              onChange={(e) => handleInputChange('login', 'password', e.target.value)}
                              required
                            />
                          </Form.Group>
                        </>
                      )}

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 mb-3"
                        disabled={loading}
                      >
                        {loading ? 'Logging in...' : `Login as ${userType === 'admin' ? 'Admin' : 'Student'}`}
                      </Button>
                    </Form>
                  </Tab>

                  {userType === 'student' && (
                    <Tab eventKey="register" title="Register">
                      <Form onSubmit={handleRegisterSubmit}>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Student ID</Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="Enter student ID"
                                value={registerForm.studentId}
                                onChange={(e) => handleInputChange('register', 'studentId', e.target.value)}
                                required
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Full Name</Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="Enter full name"
                                value={registerForm.fullName}
                                onChange={(e) => handleInputChange('register', 'fullName', e.target.value)}
                                required
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Email</Form.Label>
                          <Form.Control
                            type="email"
                            placeholder="Enter email address"
                            value={registerForm.email}
                            onChange={(e) => handleInputChange('register', 'email', e.target.value)}
                            required
                          />
                        </Form.Group>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Password</Form.Label>
                              <Form.Control
                                type="password"
                                placeholder="Enter password"
                                value={registerForm.password}
                                onChange={(e) => handleInputChange('register', 'password', e.target.value)}
                                required
                                minLength={6}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Confirm Password</Form.Label>
                              <Form.Control
                                type="password"
                                placeholder="Confirm password"
                                value={registerForm.confirmPassword}
                                onChange={(e) => handleInputChange('register', 'confirmPassword', e.target.value)}
                                required
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Button
                          variant="success"
                          type="submit"
                          className="w-100 mb-3"
                          disabled={loading}
                        >
                          {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                      </Form>
                    </Tab>
                  )}
                </Tabs>

                {userType === 'student' && (
                  <div className="text-center">
                    <div className="divider my-3">
                      <span className="divider-text">OR</span>
                    </div>
                    
                    <Button
                      variant="outline-warning"
                      className="wallet-connect-btn w-100"
                      onClick={handleMetaMaskLogin}
                      disabled={loading}
                    >
                      {loading ? 'Connecting...' : '🦊 Login with MetaMask'}
                    </Button>

                    <p className="mt-3 text-muted small">
                      Connect your MetaMask wallet for secure blockchain authentication
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
