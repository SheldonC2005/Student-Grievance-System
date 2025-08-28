// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ComplaintBlockRegistry
 * @dev Smart contract for managing complaint blocks with Merkle tree verification
 * @author Student Grievance System
 */
contract ComplaintBlockRegistry {
    
    // Struct to represent a complaint block
    struct ComplaintBlock {
        uint256 blockNumber;
        bytes32 merkleRoot;
        uint256 complaintCount;
        uint256 timestamp;
        address createdBy;
        string topCategory;
        uint256 totalPriorityScore;
        bool exists;
    }
    
    // State variables
    address public admin;
    uint256 public currentBlockNumber;
    uint256 public totalBlocks;
    uint256 public totalComplaints;
    
    // Mappings
    mapping(uint256 => ComplaintBlock) public blocks;
    mapping(address => bool) public authorizedAdmins;
    
    // Events
    event BlockCreated(
        uint256 indexed blockNumber,
        bytes32 indexed merkleRoot,
        uint256 complaintCount,
        address indexed createdBy,
        string topCategory,
        uint256 totalPriorityScore
    );
    
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    
    // Modifiers
    modifier onlyAdmin() {
        require(authorizedAdmins[msg.sender] || msg.sender == admin, "Not authorized admin");
        _;
    }
    
    modifier onlyMainAdmin() {
        require(msg.sender == admin, "Only main admin allowed");
        _;
    }
    
    modifier validMerkleRoot(bytes32 _merkleRoot) {
        require(_merkleRoot != bytes32(0), "Invalid Merkle root");
        _;
    }
    
    modifier validComplaintCount(uint256 _count) {
        require(_count > 0, "Complaint count must be positive");
        _;
    }
    
    /**
     * @dev Constructor to initialize the contract
     */
    constructor() {
        admin = msg.sender;
        authorizedAdmins[msg.sender] = true;
        currentBlockNumber = 0;
        totalBlocks = 0;
        totalComplaints = 0;
    }
    
    /**
     * @dev Create a new complaint block
     * @param _merkleRoot The Merkle root of all complaints in this block
     * @param _complaintCount Number of complaints in this block
     * @param _topCategory The category with highest priority score
     * @param _totalPriorityScore Sum of all weighted priority scores
     */
    function createBlock(
        bytes32 _merkleRoot,
        uint256 _complaintCount,
        string memory _topCategory,
        uint256 _totalPriorityScore
    ) 
        external 
        onlyAdmin 
        validMerkleRoot(_merkleRoot) 
        validComplaintCount(_complaintCount)
    {
        currentBlockNumber++;
        
        blocks[currentBlockNumber] = ComplaintBlock({
            blockNumber: currentBlockNumber,
            merkleRoot: _merkleRoot,
            complaintCount: _complaintCount,
            timestamp: block.timestamp,
            createdBy: msg.sender,
            topCategory: _topCategory,
            totalPriorityScore: _totalPriorityScore,
            exists: true
        });
        
        totalBlocks++;
        totalComplaints += _complaintCount;
        
        emit BlockCreated(
            currentBlockNumber,
            _merkleRoot,
            _complaintCount,
            msg.sender,
            _topCategory,
            _totalPriorityScore
        );
    }
    
    /**
     * @dev Get block information by block number
     * @param _blockNumber The block number to query
     * @return Block information
     */
    function getBlock(uint256 _blockNumber) 
        external 
        view 
        returns (
            uint256 blockNumber,
            bytes32 merkleRoot,
            uint256 complaintCount,
            uint256 timestamp,
            address createdBy,
            string memory topCategory,
            uint256 totalPriorityScore
        ) 
    {
        require(blocks[_blockNumber].exists, "Block does not exist");
        
        ComplaintBlock memory blockData = blocks[_blockNumber];
        
        return (
            blockData.blockNumber,
            blockData.merkleRoot,
            blockData.complaintCount,
            blockData.timestamp,
            blockData.createdBy,
            blockData.topCategory,
            blockData.totalPriorityScore
        );
    }
    
    /**
     * @dev Verify if a complaint is included in a specific block using Merkle proof
     * @param _blockNumber The block number to verify against
     * @param _complaintHash The hash of the complaint data
     * @param _merkleProof Array of hashes forming the Merkle proof
     * @param _leafIndex The index of the leaf in the Merkle tree
     * @return bool True if the complaint is verified in the block
     */
    function verifyComplaintInBlock(
        uint256 _blockNumber,
        bytes32 _complaintHash,
        bytes32[] memory _merkleProof,
        uint256 _leafIndex
    ) external view returns (bool) {
        require(blocks[_blockNumber].exists, "Block does not exist");
        
        bytes32 merkleRoot = blocks[_blockNumber].merkleRoot;
        return verifyMerkleProof(_merkleProof, merkleRoot, _complaintHash, _leafIndex);
    }
    
    /**
     * @dev Verify Merkle proof
     * @param _proof Array of sibling hashes
     * @param _root The Merkle root
     * @param _leaf The leaf hash to verify
     * @param _index The index of the leaf
     * @return bool True if proof is valid
     */
    function verifyMerkleProof(
        bytes32[] memory _proof,
        bytes32 _root,
        bytes32 _leaf,
        uint256 _index
    ) internal pure returns (bool) {
        bytes32 computedHash = _leaf;
        uint256 index = _index;
        
        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];
            
            if (index % 2 == 0) {
                // If index is even, current hash goes on the left
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // If index is odd, current hash goes on the right
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
            
            index = index / 2;
        }
        
        return computedHash == _root;
    }
    
    /**
     * @dev Add a new authorized admin
     * @param _newAdmin Address of the new admin
     */
    function addAdmin(address _newAdmin) external onlyMainAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        require(!authorizedAdmins[_newAdmin], "Admin already exists");
        
        authorizedAdmins[_newAdmin] = true;
        emit AdminAdded(_newAdmin, msg.sender);
    }
    
    /**
     * @dev Remove an authorized admin
     * @param _admin Address of the admin to remove
     */
    function removeAdmin(address _admin) external onlyMainAdmin {
        require(_admin != admin, "Cannot remove main admin");
        require(authorizedAdmins[_admin], "Admin does not exist");
        
        authorizedAdmins[_admin] = false;
        emit AdminRemoved(_admin, msg.sender);
    }
    
    /**
     * @dev Get contract statistics
     * @return Various contract statistics
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 _currentBlockNumber,
            uint256 _totalBlocks,
            uint256 _totalComplaints,
            address _admin
        ) 
    {
        return (currentBlockNumber, totalBlocks, totalComplaints, admin);
    }
    
    /**
     * @dev Get the latest block information
     * @return Latest block data
     */
    function getLatestBlock() 
        external 
        view 
        returns (
            uint256 blockNumber,
            bytes32 merkleRoot,
            uint256 complaintCount,
            uint256 timestamp,
            address createdBy,
            string memory topCategory,
            uint256 totalPriorityScore
        ) 
    {
        require(currentBlockNumber > 0, "No blocks created yet");
        
        ComplaintBlock memory blockData = blocks[currentBlockNumber];
        
        return (
            blockData.blockNumber,
            blockData.merkleRoot,
            blockData.complaintCount,
            blockData.timestamp,
            blockData.createdBy,
            blockData.topCategory,
            blockData.totalPriorityScore
        );
    }
    
    /**
     * @dev Check if an address is an authorized admin
     * @param _address Address to check
     * @return bool True if address is authorized admin
     */
    function isAuthorizedAdmin(address _address) external view returns (bool) {
        return authorizedAdmins[_address];
    }
    
    /**
     * @dev Get block existence status
     * @param _blockNumber Block number to check
     * @return bool True if block exists
     */
    function blockExists(uint256 _blockNumber) external view returns (bool) {
        return blocks[_blockNumber].exists;
    }
}
