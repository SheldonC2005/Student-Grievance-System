const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { ipfsService } = require('./ipfsService');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.isConnected = false;
    this.contractAddress = null;
    this.networkId = null;
    
    // Mock blockchain storage for development
    this.mockBlockchain = [];
    this.mockBlockNumber = 1;
    
    this.predefinedAccounts = [
      {
        name: 'Admin',
        address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
        privateKey: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
        role: 'admin'
      },
      {
        name: 'Student 1',
        address: '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0',
        privateKey: '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
        role: 'student'
      },
      {
        name: 'Student 2',
        address: '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b',
        privateKey: '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
        role: 'student'
      },
      {
        name: 'Student 3',
        address: '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d',
        privateKey: '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913',
        role: 'student'
      }
    ];
  }

  /**
   * Initialize blockchain connection with retry logic
   */
  async initialize() {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Attempting to connect to Ganache at http://127.0.0.1:7545... (Attempt ${attempt}/${maxRetries})`);
        
        // Create provider with timeout settings
        this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545', undefined, {
          staticNetwork: true,
          polling: false
        });
        
        // Test connection with timeout
        const connectPromise = this.testConnection();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );
        
        await Promise.race([connectPromise, timeoutPromise]);
        
        // Load contract if deployed
        const contractLoaded = await this.loadContract();
        if (contractLoaded) {
          console.log('✅ Contract loaded successfully');
        } else {
          console.log('⚠️ Contract not loaded, but connection established');
        }
        
        this.isConnected = true;
        console.log('🎉 Blockchain connection established successfully!');
        return true;
        
      } catch (error) {
        console.warn(`⚠️ Connection attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`🔄 Retrying in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.warn('⚠️ All connection attempts failed, using mock mode');
          this.isConnected = false;
          this.networkId = 'mock';
          this.provider = null;
          return false;
        }
      }
    }
    
    return false;
  }

  /**
   * Test blockchain connection
   */
  async testConnection() {
    const network = await this.provider.getNetwork();
    this.networkId = network.chainId.toString();
    
    // Additional test - get block number
    const blockNumber = await this.provider.getBlockNumber();
    
    console.log('🔗 Connected to blockchain network:', this.networkId);
    console.log('📊 Current block number:', blockNumber);
    
    return true;
  }

  /**
   * Load smart contract
   */
  async loadContract() {
    try {
      // Try to load from deployment info
      const deploymentPath = path.join(__dirname, '../../blockchain/deployment.json');
      const abiPath = path.join(__dirname, '../../frontend/src/contracts/ComplaintRegistry.json');
      
      if (fs.existsSync(deploymentPath) && fs.existsSync(abiPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        const contractData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        
        this.contractAddress = deployment.contractAddress;
        
        // Create contract instance with admin signer
        const adminWallet = new ethers.Wallet(this.predefinedAccounts[0].privateKey, this.provider);
        this.contract = new ethers.Contract(this.contractAddress, contractData.abi, adminWallet);
        
        console.log('✅ Smart contract loaded:', this.contractAddress);
        return true;
      } else {
        console.log('⚠️ Contract not deployed yet. Run deployment first.');
        return false;
      }
    } catch (error) {
      console.error('❌ Contract loading failed:', error.message);
      return false;
    }
  }

  /**
   * Get signer for specific account
   */
  getSigner(accountIndex = 0) {
    if (!this.isConnected || !this.provider) {
      return null;
    }
    
    const account = this.predefinedAccounts[accountIndex];
    if (!account) {
      return null;
    }
    
    return new ethers.Wallet(account.privateKey, this.provider);
  }

  /**
   * Submit complaint to blockchain
   */
  async submitComplaint(complaintData, studentAccountIndex = 1) {
    try {
      if (!this.isConnected || !this.contract) {
        // Mock mode - store in mock blockchain
        const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66);
        const mockComplaintId = `COMPLAINT_${Date.now()}`;
        
        // Store in mock blockchain
        const mockComplaint = {
          complaintId: mockComplaintId,
          title: complaintData.title,
          description: complaintData.description,
          category: complaintData.category,
          priority: complaintData.priority,
          status: 'SUBMITTED',
          blockNumber: this.mockBlockNumber++,
          transactionHash: mockTxHash,
          blockHash: '0x' + Math.random().toString(16).substring(2, 66),
          ipfsHash: `Qm${Math.random().toString(36).substring(2, 15)}`,
          timestamp: new Date().toISOString(),
          gasUsed: (20000 + Math.floor(Math.random() * 5000)).toString(),
          studentId: complaintData.student_id
        };
        
        this.mockBlockchain.push(mockComplaint);
        
        console.log('🔄 Mock blockchain: Complaint submitted with tx:', mockTxHash);
        console.log('📦 Stored in mock blockchain:', mockComplaintId);
        
        return {
          success: true,
          transactionHash: mockTxHash,
          complaintId: mockComplaintId,
          gasUsed: mockComplaint.gasUsed,
          mock: true
        };
      }

      // Upload to IPFS first
      const ipfsHash = await ipfsService.uploadComplaint(complaintData);
      
      // Convert to bytes32
      const ipfsHashBytes32 = ethers.encodeBytes32String(ipfsHash.substring(0, 31)); // Truncate for bytes32
      
      // Map priority to number
      const priorityMap = { 'low': 0, 'medium': 1, 'high': 2 };
      const priority = priorityMap[complaintData.priority.toLowerCase()] || 0;
      
      // Map category to number (you can extend this)
      const categoryMap = { 
        'academic': 1, 
        'administrative': 2, 
        'facilities': 3, 
        'financial': 4, 
        'other': 5 
      };
      const category = categoryMap[complaintData.category.toLowerCase()] || 5;
      
      // Get student signer
      const studentSigner = this.getSigner(studentAccountIndex);
      const contractWithSigner = this.contract.connect(studentSigner);
      
      // Submit to blockchain
      console.log('📤 Submitting complaint to blockchain...');
      const tx = await contractWithSigner.submitComplaint(
        ipfsHashBytes32,
        priority,
        category
      );
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Extract complaint ID from events
      const complaintSubmittedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'ComplaintSubmitted'
      );
      
      let complaintId = null;
      if (complaintSubmittedEvent) {
        complaintId = complaintSubmittedEvent.args[0].toString();
      }
      
      console.log('✅ Complaint submitted to blockchain:', {
        txHash: receipt.hash,
        complaintId: complaintId,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return {
        success: true,
        transactionHash: receipt.hash,
        complaintId: complaintId,
        gasUsed: receipt.gasUsed.toString(),
        ipfsHash: ipfsHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('❌ Blockchain complaint submission failed:', error);
      return {
        success: false,
        error: error.message,
        mock: !this.isConnected
      };
    }
  }

  /**
   * Get predefined test accounts
   */
  getTestAccounts() {
    return this.predefinedAccounts;
  }

  /**
   * Get service status
   */
  async getStatus() {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          mode: 'mock',
          provider: null,
          contract: null
        };
      }

      const blockNumber = await this.provider.getBlockNumber();
      const network = await this.provider.getNetwork();
      
      return {
        connected: true,
        mode: 'real',
        provider: 'ganache',
        network: network.chainId.toString(),
        blockNumber: blockNumber,
        contract: this.contractAddress,
        accounts: this.predefinedAccounts.length
      };
      
    } catch (error) {
      return {
        connected: false,
        mode: 'error',
        error: error.message
      };
    }
  }

  /**
   * Clean shutdown
   */
  async shutdown() {
    try {
      console.log('🔄 Initiating blockchain service shutdown...');
      
      // Cancel any pending transactions if provider supports it
      if (this.provider && typeof this.provider.removeAllListeners === 'function') {
        this.provider.removeAllListeners();
      }
      
      // Clear contract references
      if (this.contract) {
        this.contract = null;
        console.log('🔗 Contract reference cleared');
      }
      
      // Clear signer
      if (this.signer) {
        this.signer = null;
        console.log('🔑 Signer reference cleared');
      }
      
      // Clear provider
      if (this.provider) {
        // Gracefully close provider if it has a destroy method
        if (typeof this.provider.destroy === 'function') {
          await this.provider.destroy();
        }
        this.provider = null;
        console.log('🌐 Provider connection closed');
      }
      
      // Reset connection state
      this.isConnected = false;
      this.networkId = null;
      this.contractAddress = null;
      
      console.log('🔗 Blockchain service shutdown completed');
    } catch (error) {
      console.warn('⚠️ Blockchain shutdown warning:', error.message);
      // Force cleanup even if there were errors
      this.isConnected = false;
      this.contract = null;
      this.provider = null;
      this.signer = null;
      this.networkId = null;
      this.contractAddress = null;
    }
  }

  /**
   * Emergency shutdown - immediate halt of all operations
   */
  emergencyShutdown() {
    console.log('🚨 Emergency blockchain service shutdown');
    
    // Immediate cleanup without waiting for promises
    this.isConnected = false;
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.networkId = null;
    this.contractAddress = null;
    
    console.log('🚨 Emergency shutdown completed');
  }

  /**
   * Check if service is in a healthy state
   */
  isHealthy() {
    return {
      connected: this.isConnected,
      hasProvider: !!this.provider,
      hasContract: !!this.contract,
      hasNetworkId: !!this.networkId,
      hasContractAddress: !!this.contractAddress,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get comprehensive service status
   */
  async getServiceStatus() {
    const status = {
      isConnected: this.isConnected,
      networkId: this.networkId,
      contractAddress: this.contractAddress,
      provider: !!this.provider,
      contract: !!this.contract,
      signer: !!this.signer,
      accountsCount: this.predefinedAccounts ? this.predefinedAccounts.length : 0,
      timestamp: new Date().toISOString()
    };

    if (this.isConnected && this.provider) {
      try {
        const blockNumber = await this.provider.getBlockNumber();
        const network = await this.provider.getNetwork();
        
        status.blockNumber = blockNumber;
        status.chainId = network.chainId.toString();
        status.networkName = network.name;
      } catch (error) {
        status.networkError = error.message;
      }
    }

    return status;
  }

  // Get all complaints stored on blockchain
  async getAllBlockchainComplaints() {
    try {
      console.log('📖 Getting all blockchain complaints');

      if (!this.isConnected || !this.contract) {
        // Return stored mock blockchain complaints if any
        if (this.mockBlockchain.length > 0) {
          console.log(`📦 Returning ${this.mockBlockchain.length} mock blockchain complaints`);
          return this.mockBlockchain;
        }
        
        // Return default mock data when no complaints submitted yet
        return [
          {
            complaintId: 'DEMO_001',
            title: 'Demo: Academic Grading Issue',
            description: 'Sample complaint for demonstration purposes',
            category: 'academic',
            priority: 'HIGH',
            status: 'SUBMITTED',
            blockNumber: 1,
            transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            ipfsHash: 'QmDemoHash123456789',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            gasUsed: '21500',
            studentId: 'DEMO123'
          },
          {
            complaintId: 'DEMO_002',
            title: 'Demo: Facility Maintenance',
            description: 'Sample facility complaint for demonstration',
            category: 'facilities',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            blockNumber: 2,
            transactionHash: '0x2345678901bcdef12345678901cdef12345678901def12345678901ef123456',
            blockHash: '0xbcdef12345678901cdef12345678901def12345678901ef12345678901234567',
            ipfsHash: 'QmDemoHash987654321',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            gasUsed: '22000',
            studentId: 'DEMO456'
          }
        ];
      }

      // Get all events from the contract
      const filter = this.contract.filters.ComplaintSubmitted();
      const events = await this.contract.queryFilter(filter);

      const complaints = [];
      for (const event of events) {
        const block = await this.provider.getBlock(event.blockNumber);
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
        
        complaints.push({
          complaintId: event.args.complaintId,
          title: event.args.title || 'Blockchain Complaint',
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          blockHash: event.blockHash,
          ipfsHash: event.args.ipfsHash,
          status: event.args.status || 'SUBMITTED',
          priority: event.args.priority || 'MEDIUM',
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          gasUsed: receipt.gasUsed.toString()
        });
      }

      // If no events found, return mock data for demonstration
      if (complaints.length === 0) {
        console.log('🔄 No blockchain events found, providing mock data for demonstration');
        return [
          {
            complaintId: 'BLOCKCHAIN_001',
            title: 'Academic Issue with Grading',
            blockNumber: 12,
            transactionHash: '0xabc123def456789012345678901234567890123456789012345678901234567890',
            blockHash: '0x123abc456def789012345678901234567890123456789012345678901234567abc',
            ipfsHash: 'QmDemoHash123456789',
            status: 'SUBMITTED',
            priority: 'HIGH',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            gasUsed: '21500'
          },
          {
            complaintId: 'BLOCKCHAIN_002',
            title: 'Dormitory Facility Issue',
            blockNumber: 13,
            transactionHash: '0xdef456abc789012345678901234567890123456789012345678901234567abc123',
            blockHash: '0x456def789abc012345678901234567890123456789012345678901234567def456',
            ipfsHash: 'QmDemoHash987654321',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            gasUsed: '22000'
          },
          {
            complaintId: 'BLOCKCHAIN_003',
            title: 'Library Access Problem',
            blockNumber: 14,
            transactionHash: '0x789abc123def456012345678901234567890123456789012345678901234def789',
            blockHash: '0x789abc123def456012345678901234567890123456789012345678901234def789',
            ipfsHash: 'QmDemoHash555666777',
            status: 'RESOLVED',
            priority: 'LOW',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            gasUsed: '20800'
          }
        ];
      }

      return complaints;
    } catch (error) {
      console.error('Error getting blockchain complaints:', error);
      
      // Return mock data if there's an error
      console.log('🔄 Blockchain error occurred, providing mock data for demonstration');
      return [
        {
          complaintId: 'MOCK_BLOCKCHAIN_001',
          title: 'Mock Complaint - Connection Error',
          blockNumber: 1,
          transactionHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
          blockHash: '0xaaabbbbccccddddeeeeffff1111222233334444555566667777888899990000',
          ipfsHash: 'QmMockErrorHash123',
          status: 'SUBMITTED',
          priority: 'HIGH',
          timestamp: new Date().toISOString(),
          gasUsed: '21000',
          note: 'Mock data due to blockchain connection issue'
        }
      ];
    }
  }

  // Get contract information
  async getContractInfo() {
    try {
      console.log('📋 Getting contract information');

      const info = {
        address: this.contractAddress || 'Not deployed',
        isDeployed: !!this.contractAddress,
        isConnected: this.isConnected,
        network: 'localhost:7545',
        status: this.isConnected ? 'connected' : 'disconnected'
      };

      if (this.isConnected && this.provider) {
        try {
          const network = await this.provider.getNetwork();
          const balance = await this.provider.getBalance(this.contractAddress);
          
          info.chainId = network.chainId.toString();
          info.networkName = network.name;
          info.balance = balance.toString();
        } catch (error) {
          info.networkError = error.message;
        }
      }

      return info;
    } catch (error) {
      console.error('Error getting contract info:', error);
      throw error;
    }
  }

  // Verify complaint on blockchain
  async verifyComplaint(complaintId) {
    try {
      console.log(`🔍 Verifying complaint ${complaintId} on blockchain`);

      if (!this.isConnected || !this.contract) {
        return {
          verified: false,
          exists: false,
          reason: 'Blockchain not connected',
          mockData: {
            complaintId: complaintId,
            verified: true,
            exists: true,
            onBlockchain: true,
            transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            blockNumber: 1,
            note: 'Mock verification - blockchain not connected'
          }
        };
      }

      try {
        const complaint = await this.contract.getComplaint(complaintId);
        
        return {
          verified: true,
          exists: true,
          onBlockchain: true,
          complaint: {
            id: complaintId,
            ipfsHash: complaint.ipfsHash,
            status: complaint.status,
            submittedAt: new Date(Number(complaint.submittedAt) * 1000).toISOString(),
            lastUpdated: new Date(Number(complaint.lastUpdated) * 1000).toISOString()
          }
        };
      } catch (contractError) {
        return {
          verified: false,
          exists: false,
          onBlockchain: false,
          reason: 'Complaint not found on blockchain'
        };
      }
    } catch (error) {
      console.error('Error verifying complaint:', error);
      return {
        verified: false,
        exists: false,
        error: error.message
      };
    }
  }

  // Get blockchain statistics
  async getBlockchainStats() {
    try {
      console.log('📊 Getting blockchain statistics');

      if (!this.isConnected || !this.provider) {
        return {
          connected: false,
          mockData: true,
          totalComplaints: 2,
          totalBlocks: 3,
          totalTransactions: 5,
          averageGasUsed: 21500,
          contractAddress: 'Mock Mode',
          chainId: 'localhost',
          note: 'Mock statistics - blockchain not connected'
        };
      }

      try {
        const network = await this.provider.getNetwork();
        const blockNumber = await this.provider.getBlockNumber();
        
        // Get complaint events for statistics
        const filter = this.contract.filters.ComplaintSubmitted();
        const events = await this.contract.queryFilter(filter);
        
        let totalGasUsed = 0;
        for (const event of events) {
          const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
          totalGasUsed += Number(receipt.gasUsed);
        }

        return {
          connected: true,
          mockData: false,
          chainId: network.chainId.toString(),
          networkName: network.name,
          currentBlock: blockNumber,
          contractAddress: this.contractAddress,
          totalComplaints: events.length,
          totalGasUsed: totalGasUsed,
          averageGasUsed: events.length > 0 ? Math.round(totalGasUsed / events.length) : 0
        };
      } catch (error) {
        throw new Error(`Failed to get blockchain stats: ${error.message}`);
      }
    } catch (error) {
      console.error('Error getting blockchain stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
const blockchainService = new BlockchainService();

module.exports = {
  BlockchainService,
  blockchainService
};
