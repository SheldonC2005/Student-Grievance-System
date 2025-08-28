import api from './api';

// Get blockchain ledger
export const getBlockchainLedger = async () => {
  try {
    const response = await api.get('/blockchain/ledger');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get contract information
export const getContractInfo = async () => {
  try {
    const response = await api.get('/blockchain/contract-info');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Verify complaint on blockchain
export const verifyComplaintOnBlockchain = async (complaintId) => {
  try {
    const response = await api.get(`/blockchain/verify/${complaintId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get blockchain statistics
export const getBlockchainStats = async () => {
  try {
    const response = await api.get('/blockchain/stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Utility functions for blockchain data
export const truncateHash = (hash, startLength = 6, endLength = 4) => {
  if (!hash) return 'N/A';
  if (hash.length <= startLength + endLength) return hash;
  return `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`;
};

export const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard:', text);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
};

export const formatBlockNumber = (blockNumber) => {
  if (!blockNumber) return 'N/A';
  return `#${blockNumber}`;
};

export const getBlockchainExplorerUrl = (hash, type = 'tx') => {
  // This would be configured based on the blockchain network
  // For Ganache, there's no explorer, so we return null
  return null;
};
