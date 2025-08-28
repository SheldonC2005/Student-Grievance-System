const crypto = require('crypto');

/**
 * Merkle Tree Service for generating and verifying complaint blocks
 * Each leaf: hash(complaintId + ipfsHash + sqliteRowId)
 */
class MerkleTreeService {
  constructor() {
    this.hashFunction = 'sha256';
  }

  /**
   * Create a hash from complaint data
   * @param {string} complaintId - The complaint ID
   * @param {string} ipfsHash - The IPFS hash of complaint data
   * @param {number} sqliteRowId - The SQLite row ID
   * @returns {string} Hex string hash
   */
  createComplaintHash(complaintId, ipfsHash, sqliteRowId) {
    try {
      const data = `${complaintId}${ipfsHash}${sqliteRowId}`;
      return crypto.createHash(this.hashFunction).update(data).digest('hex');
    } catch (error) {
      console.error('Error creating complaint hash:', error);
      throw new Error('Failed to create complaint hash');
    }
  }

  /**
   * Create a hash from two child hashes
   * @param {string} left - Left child hash
   * @param {string} right - Right child hash
   * @returns {string} Combined hash
   */
  combineHashes(left, right) {
    try {
      // Ensure consistent ordering for same hash pairs
      const sortedHashes = [left, right].sort();
      const combined = sortedHashes.join('');
      return crypto.createHash(this.hashFunction).update(combined).digest('hex');
    } catch (error) {
      console.error('Error combining hashes:', error);
      throw new Error('Failed to combine hashes');
    }
  }

  /**
   * Build Merkle tree from complaint data
   * @param {Array} complaints - Array of complaint objects with id, ipfs_hash, sqlite_id
   * @returns {Object} Merkle tree structure with root and leaves
   */
  buildMerkleTree(complaints) {
    try {
      if (!complaints || complaints.length === 0) {
        throw new Error('No complaints provided for Merkle tree construction');
      }

      console.log(`🌳 Building Merkle tree for ${complaints.length} complaints...`);

      // Step 1: Create leaf hashes
      const leaves = complaints.map((complaint, index) => ({
        index,
        complaintId: complaint.id,
        hash: this.createComplaintHash(
          complaint.id.toString(),
          complaint.ipfs_hash || '',
          complaint.sqlite_id || complaint.id
        ),
        originalData: complaint
      }));

      // Step 2: Build tree levels bottom-up
      let currentLevel = leaves.map(leaf => leaf.hash);
      const tree = [currentLevel]; // Store all levels for proof generation
      const leafCount = currentLevel.length;

      // Build tree until we reach the root
      while (currentLevel.length > 1) {
        const nextLevel = [];
        
        // Process pairs of hashes
        for (let i = 0; i < currentLevel.length; i += 2) {
          const left = currentLevel[i];
          const right = currentLevel[i + 1] || left; // Duplicate last hash if odd number
          
          const parentHash = this.combineHashes(left, right);
          nextLevel.push(parentHash);
        }
        
        currentLevel = nextLevel;
        tree.push(currentLevel);
      }

      const merkleRoot = currentLevel[0];
      const depth = tree.length - 1;

      console.log(`✅ Merkle tree built successfully:`);
      console.log(`   📊 Leaves: ${leafCount}`);
      console.log(`   📏 Depth: ${depth}`);
      console.log(`   🔐 Root: ${merkleRoot}`);

      return {
        root: merkleRoot,
        leaves,
        tree,
        depth,
        leafCount
      };

    } catch (error) {
      console.error('❌ Error building Merkle tree:', error);
      throw error;
    }
  }

  /**
   * Generate Merkle proof for a specific complaint
   * @param {Object} merkleTree - The Merkle tree structure
   * @param {number} leafIndex - Index of the leaf to prove
   * @returns {Array} Array of sibling hashes for proof
   */
  generateMerkleProof(merkleTree, leafIndex) {
    try {
      if (!merkleTree || !merkleTree.tree || leafIndex < 0 || leafIndex >= merkleTree.leafCount) {
        throw new Error('Invalid Merkle tree or leaf index');
      }

      const proof = [];
      let currentIndex = leafIndex;

      // Traverse from leaf to root, collecting sibling hashes
      for (let level = 0; level < merkleTree.tree.length - 1; level++) {
        const currentLevelNodes = merkleTree.tree[level];
        const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
        
        // Add sibling hash if it exists
        if (siblingIndex < currentLevelNodes.length) {
          proof.push(currentLevelNodes[siblingIndex]);
        }
        
        // Move to parent index
        currentIndex = Math.floor(currentIndex / 2);
      }

      console.log(`🔍 Generated Merkle proof for leaf ${leafIndex}: ${proof.length} elements`);
      return proof;

    } catch (error) {
      console.error('❌ Error generating Merkle proof:', error);
      throw error;
    }
  }

  /**
   * Verify a Merkle proof
   * @param {Array} proof - Array of sibling hashes
   * @param {string} root - Expected Merkle root
   * @param {string} leafHash - Hash of the leaf to verify
   * @param {number} leafIndex - Index of the leaf
   * @returns {boolean} True if proof is valid
   */
  verifyMerkleProof(proof, root, leafHash, leafIndex) {
    try {
      let computedHash = leafHash;
      let index = leafIndex;

      // Traverse proof path and recompute root
      for (const siblingHash of proof) {
        if (index % 2 === 0) {
          // Current hash goes on left
          computedHash = this.combineHashes(computedHash, siblingHash);
        } else {
          // Current hash goes on right
          computedHash = this.combineHashes(siblingHash, computedHash);
        }
        
        index = Math.floor(index / 2);
      }

      const isValid = computedHash === root;
      console.log(`🔐 Merkle proof verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      return isValid;

    } catch (error) {
      console.error('❌ Error verifying Merkle proof:', error);
      return false;
    }
  }

  /**
   * Create complaint hash for external verification
   * @param {Object} complaint - Complaint object
   * @returns {string} Complaint hash
   */
  hashComplaint(complaint) {
    return this.createComplaintHash(
      complaint.id.toString(),
      complaint.ipfs_hash || '',
      complaint.sqlite_id || complaint.id
    );
  }

  /**
   * Validate Merkle tree structure
   * @param {Object} merkleTree - Merkle tree to validate
   * @returns {boolean} True if tree is valid
   */
  validateMerkleTree(merkleTree) {
    try {
      if (!merkleTree || !merkleTree.root || !merkleTree.leaves || !merkleTree.tree) {
        return false;
      }

      // Verify tree structure
      const expectedLevels = Math.ceil(Math.log2(merkleTree.leafCount)) + 1;
      if (merkleTree.tree.length !== expectedLevels && merkleTree.leafCount > 1) {
        // Allow for single leaf case
        if (merkleTree.leafCount !== 1 || merkleTree.tree.length !== 1) {
          return false;
        }
      }

      // Verify root is at top level
      const topLevel = merkleTree.tree[merkleTree.tree.length - 1];
      if (topLevel.length !== 1 || topLevel[0] !== merkleTree.root) {
        return false;
      }

      console.log('✅ Merkle tree validation passed');
      return true;

    } catch (error) {
      console.error('❌ Error validating Merkle tree:', error);
      return false;
    }
  }

  /**
   * Get tree statistics
   * @param {Object} merkleTree - Merkle tree structure
   * @returns {Object} Tree statistics
   */
  getTreeStats(merkleTree) {
    if (!merkleTree) {
      return null;
    }

    return {
      leafCount: merkleTree.leafCount,
      depth: merkleTree.depth,
      root: merkleTree.root,
      totalNodes: merkleTree.tree.reduce((sum, level) => sum + level.length, 0),
      levels: merkleTree.tree.length,
      isValid: this.validateMerkleTree(merkleTree)
    };
  }
}

module.exports = {
  MerkleTreeService,
  merkleTreeService: new MerkleTreeService()
};
