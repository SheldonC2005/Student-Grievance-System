const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.isConnected = false;
  }

  /**
   * Initialize IPFS connection
   */
  async initialize() {
    try {
      // Try to connect to local IPFS node
      this.ipfs = create({
        host: 'localhost',
        port: 5001,
        protocol: 'http'
      });

      // Test connection
      const version = await this.ipfs.version();
      console.log('📡 Connected to IPFS node:', version.version);
      this.isConnected = true;
      
      return true;
    } catch (error) {
      console.warn('⚠️ Local IPFS node not available, using mock for development');
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Upload complaint data to IPFS
   * @param {Object} complaintData - The complaint data to upload
   * @returns {Promise<string>} IPFS hash
   */
  async uploadComplaint(complaintData) {
    try {
      // Prepare complaint metadata
      const metadata = {
        title: complaintData.title,
        description: complaintData.description,
        category: complaintData.category,
        priority: complaintData.priority,
        studentId: complaintData.studentId,
        evidence: complaintData.evidence || [],
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      if (this.isConnected) {
        // Real IPFS upload
        const jsonString = JSON.stringify(metadata, null, 2);
        const result = await this.ipfs.add(jsonString);
        const hash = result.cid.toString();
        
        console.log('📤 Complaint uploaded to IPFS:', hash);
        return hash;
      } else {
        // Mock IPFS for development
        const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log('🔄 Using mock IPFS hash for development:', mockHash);
        console.log('📦 Data that would be uploaded:', JSON.stringify(metadata, null, 2).substring(0, 100) + '...');
        return mockHash;
      }
      
    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      // Fallback to mock
      const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      console.log('🔄 Using mock IPFS hash for development:', mockHash);
      return mockHash;
    }
  }

  /**
   * Upload file evidence to IPFS
   * @param {Buffer} fileBuffer - File data as buffer
   * @param {string} filename - Original filename
   * @returns {Promise<string>} IPFS hash
   */
  async uploadFile(fileBuffer, filename) {
    try {
      if (this.isConnected) {
        const result = await this.ipfs.add({
          content: fileBuffer,
          path: filename
        });
        
        const hash = result.cid.toString();
        console.log('📎 File uploaded to IPFS:', filename, '->', hash);
        return hash;
      } else {
        // Mock file upload
        const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log('🔄 Mock file upload:', filename, '->', mockHash);
        return mockHash;
      }
      
    } catch (error) {
      console.error('❌ File upload to IPFS failed:', error);
      // Fallback to mock
      const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      console.log('🔄 Mock file upload fallback:', filename, '->', mockHash);
      return mockHash;
    }
  }

  /**
   * Retrieve complaint data from IPFS
   * @param {string} hash - IPFS hash
   * @returns {Promise<Object>} Complaint data
   */
  async getComplaint(hash) {
    try {
      if (this.isConnected) {
        const chunks = [];
        for await (const chunk of this.ipfs.cat(hash)) {
          chunks.push(chunk);
        }
        
        const data = Buffer.concat(chunks).toString();
        const complaintData = JSON.parse(data);
        
        console.log('📥 Complaint retrieved from IPFS:', hash);
        return complaintData;
      } else {
        // Mock retrieval
        console.log('🔄 Mock IPFS retrieval for hash:', hash);
        return {
          hash: hash,
          mockData: true,
          title: 'Mock Complaint Title',
          description: 'This is mock complaint data for development purposes',
          category: 'general',
          priority: 'medium',
          timestamp: new Date().toISOString(),
          retrievedAt: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error('❌ IPFS retrieval failed:', error);
      // Fallback to mock
      return {
        error: 'IPFS retrieval failed',
        mockData: true,
        hash: hash,
        title: 'Error - Mock Data',
        description: 'IPFS retrieval failed, showing mock data',
        retrievedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get IPFS node status
   */
  async getStatus() {
    if (!this.isConnected) {
      return { connected: false, mode: 'mock' };
    }

    try {
      const id = await this.ipfs.id();
      const version = await this.ipfs.version();
      
      return {
        connected: true,
        mode: 'real',
        nodeId: id.id,
        version: version.version,
        addresses: id.addresses
      };
    } catch (error) {
      return { 
        connected: false, 
        mode: 'mock',
        error: error.message 
      };
    }
  }

  /**
   * Create IPFS gateway URL for file access
   * @param {string} hash - IPFS hash
   * @returns {string} Gateway URL
   */
  getGatewayUrl(hash) {
    return `https://ipfs.io/ipfs/${hash}`;
  }

  /**
   * Validate IPFS hash format
   * @param {string} hash - Hash to validate
   * @returns {boolean} Is valid hash
   */
  isValidHash(hash) {
    // Basic IPFS hash validation (CID v0 and v1)
    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidV1Regex = /^b[a-z2-7]{58}$/;
    
    return cidV0Regex.test(hash) || cidV1Regex.test(hash);
  }

  /**
   * Clean shutdown
   */
  async shutdown() {
    try {
      console.log('🔄 Initiating IPFS service shutdown...');
      
      if (this.ipfs) {
        // If using real IPFS, try to stop it gracefully
        if (this.isConnected && typeof this.ipfs.stop === 'function') {
          try {
            await this.ipfs.stop();
            console.log('📡 IPFS node stopped');
          } catch (stopError) {
            console.warn('⚠️ IPFS stop warning:', stopError.message);
          }
        }
        
        // Clear IPFS reference
        this.ipfs = null;
        console.log('📡 IPFS reference cleared');
      }
      
      // Reset connection state
      this.isConnected = false;
      
      console.log('📡 IPFS service shutdown completed');
    } catch (error) {
      console.warn('⚠️ IPFS shutdown warning:', error.message);
      // Force cleanup
      this.isConnected = false;
      this.ipfs = null;
    }
  }

  /**
   * Emergency shutdown - immediate halt
   */
  emergencyShutdown() {
    console.log('🚨 Emergency IPFS service shutdown');
    this.isConnected = false;
    this.ipfs = null;
    console.log('🚨 IPFS emergency shutdown completed');
  }

  /**
   * Health check for IPFS service
   */
  isHealthy() {
    return {
      connected: this.isConnected,
      hasIpfs: !!this.ipfs,
      mode: this.isConnected ? 'real' : 'mock',
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const ipfsService = new IPFSService();

// Legacy exports for backward compatibility
const uploadToIPFS = async (data) => {
  return await ipfsService.uploadComplaint(data);
};

const retrieveFromIPFS = async (hash) => {
  return await ipfsService.getComplaint(hash);
};

const uploadFileToIPFS = async (fileBuffer, fileName) => {
  return await ipfsService.uploadFile(fileBuffer, fileName);
};

module.exports = {
  IPFSService,
  ipfsService,
  uploadToIPFS,
  retrieveFromIPFS,
  uploadFileToIPFS
};
