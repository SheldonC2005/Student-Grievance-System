// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ComplaintRegistry
 * @dev Gas-optimized smart contract for storing student complaints on blockchain
 * Features:
 * - IPFS hash storage for complaint data
 * - Immutable complaint records
 * - Status tracking with admin controls
 * - Block summaries for complaint history
 * - Event-based logging for efficiency
 */
contract ComplaintRegistry {
    
    // ============ ENUMS & STRUCTS ============
    
    enum Priority { LOW, MEDIUM, HIGH }
    enum Status { PENDING, IN_REVIEW, RESOLVED, REJECTED, CLOSED }
    
    struct Complaint {
        bytes32 ipfsHash;        // IPFS hash of complaint details (32 bytes)
        address student;         // Student who submitted complaint (20 bytes)
        uint32 timestamp;        // Submission timestamp (4 bytes)
        uint8 priority;          // Priority level (1 byte)
        uint8 status;            // Current status (1 byte)
        uint16 category;         // Complaint category (2 bytes)
        // Total: 60 bytes per complaint (gas optimized)
    }
    
    struct BlockSummary {
        bytes32 summaryHash;     // Hash of all complaints in this block
        uint32 timestamp;        // Block creation time
        uint32 totalComplaints; // Total complaints at this block
        uint16 pendingCount;     // Pending complaints count
        uint16 resolvedCount;    // Resolved complaints count
    }
    
    // ============ STATE VARIABLES ============
    
    address public admin;
    uint256 public nextComplaintId;
    uint256 public nextBlockId;
    
    // Mappings for efficient storage
    mapping(uint256 => Complaint) public complaints;
    mapping(uint256 => BlockSummary) public blockSummaries;
    mapping(address => uint256[]) public studentComplaints;
    mapping(uint8 => uint256) public statusCounts; // Track complaint counts by status
    
    // ============ EVENTS ============
    
    event ComplaintSubmitted(
        uint256 indexed complaintId,
        address indexed student,
        bytes32 ipfsHash,
        uint8 priority,
        uint16 category
    );
    
    event StatusUpdated(
        uint256 indexed complaintId,
        uint8 oldStatus,
        uint8 newStatus,
        address updatedBy
    );
    
    event BlockSummaryCreated(
        uint256 indexed blockId,
        bytes32 summaryHash,
        uint32 totalComplaints
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier validComplaintId(uint256 _complaintId) {
        require(_complaintId < nextComplaintId, "Invalid complaint ID");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        admin = msg.sender;
        nextComplaintId = 1; // Start from 1 (0 reserved for null)
        nextBlockId = 1;
        
        // Initialize status counts
        for (uint8 i = 0; i < 5; i++) {
            statusCounts[i] = 0;
        }
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Submit a new complaint to the blockchain
     * @param _ipfsHash IPFS hash containing complaint details
     * @param _priority Priority level (0=LOW, 1=MEDIUM, 2=HIGH)
     * @param _category Complaint category identifier
     * @return complaintId The ID of the newly created complaint
     */
    function submitComplaint(
        bytes32 _ipfsHash,
        uint8 _priority,
        uint16 _category
    ) external returns (uint256) {
        require(_ipfsHash != bytes32(0), "IPFS hash cannot be empty");
        require(_priority <= uint8(Priority.HIGH), "Invalid priority level");
        
        uint256 complaintId = nextComplaintId;
        
        // Create complaint struct
        complaints[complaintId] = Complaint({
            ipfsHash: _ipfsHash,
            student: msg.sender,
            timestamp: uint32(block.timestamp),
            priority: _priority,
            status: uint8(Status.PENDING),
            category: _category
        });
        
        // Update mappings
        studentComplaints[msg.sender].push(complaintId);
        statusCounts[uint8(Status.PENDING)]++;
        
        // Emit event
        emit ComplaintSubmitted(
            complaintId,
            msg.sender,
            _ipfsHash,
            _priority,
            _category
        );
        
        nextComplaintId++;
        
        // Create block summary after every complaint
        _createBlockSummary();
        
        return complaintId;
    }
    
    /**
     * @dev Update complaint status (admin only)
     * @param _complaintId ID of the complaint to update
     * @param _newStatus New status for the complaint
     */
    function updateComplaintStatus(
        uint256 _complaintId,
        uint8 _newStatus
    ) external onlyAdmin validComplaintId(_complaintId) {
        require(_newStatus <= uint8(Status.CLOSED), "Invalid status");
        
        Complaint storage complaint = complaints[_complaintId];
        uint8 oldStatus = complaint.status;
        
        require(oldStatus != _newStatus, "Status already set");
        require(_isValidStatusTransition(oldStatus, _newStatus), "Invalid status transition");
        
        // Update status counts
        statusCounts[oldStatus]--;
        statusCounts[_newStatus]++;
        
        // Update complaint status
        complaint.status = _newStatus;
        
        emit StatusUpdated(_complaintId, oldStatus, _newStatus, msg.sender);
        
        // Create block summary after status update
        _createBlockSummary();
    }
    
    /**
     * @dev Get complaint details
     * @param _complaintId ID of the complaint
     * @return Complaint struct data
     */
    function getComplaint(uint256 _complaintId) 
        external 
        view 
        validComplaintId(_complaintId) 
        returns (Complaint memory) {
        return complaints[_complaintId];
    }
    
    /**
     * @dev Get complaints submitted by a specific student
     * @param _student Address of the student
     * @return Array of complaint IDs
     */
    function getStudentComplaints(address _student) 
        external 
        view 
        returns (uint256[] memory) {
        return studentComplaints[_student];
    }
    
    /**
     * @dev Get total number of complaints
     * @return Total complaint count
     */
    function getTotalComplaints() external view returns (uint256) {
        return nextComplaintId - 1;
    }
    
    /**
     * @dev Get complaint counts by status
     * @return pending Number of pending complaints
     * @return inReview Number of complaints in review
     * @return resolved Number of resolved complaints
     * @return rejected Number of rejected complaints
     * @return closed Number of closed complaints
     */
    function getStatusCounts() external view returns (
        uint256 pending,
        uint256 inReview,
        uint256 resolved,
        uint256 rejected,
        uint256 closed
    ) {
        return (
            statusCounts[uint8(Status.PENDING)],
            statusCounts[uint8(Status.IN_REVIEW)],
            statusCounts[uint8(Status.RESOLVED)],
            statusCounts[uint8(Status.REJECTED)],
            statusCounts[uint8(Status.CLOSED)]
        );
    }
    
    /**
     * @dev Get latest block summary
     * @return Latest BlockSummary struct
     */
    function getLatestBlockSummary() external view returns (BlockSummary memory) {
        require(nextBlockId > 1, "No block summaries exist");
        return blockSummaries[nextBlockId - 1];
    }
    
    /**
     * @dev Get block summary by ID
     * @param _blockId ID of the block summary
     * @return BlockSummary struct
     */
    function getBlockSummary(uint256 _blockId) external view returns (BlockSummary memory) {
        require(_blockId < nextBlockId, "Invalid block ID");
        return blockSummaries[_blockId];
    }
    
    /**
     * @dev Get all complaints in a range (for pagination)
     * @param _start Start index (inclusive)
     * @param _end End index (exclusive)
     * @return Array of complaint IDs
     */
    function getComplaintsInRange(uint256 _start, uint256 _end) 
        external 
        view 
        returns (uint256[] memory) {
        require(_start < nextComplaintId, "Start index out of bounds");
        require(_end <= nextComplaintId, "End index out of bounds");
        require(_start < _end, "Invalid range");
        
        uint256[] memory result = new uint256[](_end - _start);
        for (uint256 i = _start; i < _end; i++) {
            result[i - _start] = i + 1; // Complaint IDs start from 1
        }
        return result;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Create a block summary with hash of all current complaints
     */
    function _createBlockSummary() internal {
        bytes32 summaryHash = _calculateSummaryHash();
        
        blockSummaries[nextBlockId] = BlockSummary({
            summaryHash: summaryHash,
            timestamp: uint32(block.timestamp),
            totalComplaints: uint32(nextComplaintId - 1),
            pendingCount: uint16(statusCounts[uint8(Status.PENDING)]),
            resolvedCount: uint16(statusCounts[uint8(Status.RESOLVED)])
        });
        
        emit BlockSummaryCreated(nextBlockId, summaryHash, uint32(nextComplaintId - 1));
        nextBlockId++;
    }
    
    /**
     * @dev Calculate hash of all complaint data for block summary
     */
    function _calculateSummaryHash() internal view returns (bytes32) {
        bytes memory data;
        
        for (uint256 i = 1; i < nextComplaintId; i++) {
            Complaint memory complaint = complaints[i];
            data = abi.encodePacked(
                data,
                complaint.ipfsHash,
                complaint.student,
                complaint.timestamp,
                complaint.priority,
                complaint.status,
                complaint.category
            );
        }
        
        return keccak256(data);
    }
    
    /**
     * @dev Validate status transitions
     */
    function _isValidStatusTransition(uint8 _from, uint8 _to) internal pure returns (bool) {
        // PENDING -> IN_REVIEW, REJECTED
        if (_from == uint8(Status.PENDING)) {
            return _to == uint8(Status.IN_REVIEW) || _to == uint8(Status.REJECTED);
        }
        
        // IN_REVIEW -> RESOLVED, REJECTED
        if (_from == uint8(Status.IN_REVIEW)) {
            return _to == uint8(Status.RESOLVED) || _to == uint8(Status.REJECTED);
        }
        
        // RESOLVED -> CLOSED
        if (_from == uint8(Status.RESOLVED)) {
            return _to == uint8(Status.CLOSED);
        }
        
        // REJECTED -> CLOSED
        if (_from == uint8(Status.REJECTED)) {
            return _to == uint8(Status.CLOSED);
        }
        
        // CLOSED is final state
        return false;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Transfer admin rights (emergency only)
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        admin = _newAdmin;
    }
    
    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 totalComplaints,
        uint256 totalBlocks,
        address contractAdmin
    ) {
        return (
            nextComplaintId - 1,
            nextBlockId - 1,
            admin
        );
    }
}
