// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GrievanceSystem is Ownable, ReentrancyGuard {
    
    // Enums for complaint categories and priority levels
    enum ComplaintCategory {
        Academic,
        Harassment,
        Infrastructure,
        FoodServices,
        HostelIssues,
        FinancialIssues,
        AdministrativeIssues,
        TechnicalIssues,
        Other
    }
    
    enum Priority {
        Low,
        Medium,
        High,
        Critical
    }
    
    enum Status {
        Pending,
        InProgress,
        Resolved,
        Closed
    }
    
    // Complaint structure
    struct Complaint {
        uint256 id;
        address student;
        string studentId;
        ComplaintCategory category;
        string title;
        string description;
        string ipfsHash;
        Priority priority;
        Status status;
        uint256 timestamp;
        uint256 blockNumber;
        bytes32 complaintHash;
        uint256 nonce;
        uint256 escalationCount;
        bool isVerified;
        address verifiedBy;
    }
    
    // State variables
    uint256 public complaintCounter;
    uint256 public totalComplaints;
    
    // Mappings
    mapping(uint256 => Complaint) public complaints;
    mapping(address => uint256[]) public studentComplaints;
    mapping(bytes32 => uint256) public complaintHashToId;
    mapping(string => uint256[]) public studentIdToComplaints;
    
    // Events
    event ComplaintSubmitted(
        uint256 indexed complaintId,
        address indexed student,
        string studentId,
        ComplaintCategory category,
        Priority priority,
        uint256 timestamp
    );
    
    event ComplaintEscalated(
        uint256 indexed complaintId,
        Priority oldPriority,
        Priority newPriority,
        uint256 escalationCount
    );
    
    event ComplaintStatusUpdated(
        uint256 indexed complaintId,
        Status oldStatus,
        Status newStatus,
        address updatedBy
    );
    
    event ComplaintVerified(
        uint256 indexed complaintId,
        address verifiedBy,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyStudentOrOwner(uint256 _complaintId) {
        require(
            complaints[_complaintId].student == msg.sender || msg.sender == owner(),
            "Only complaint owner or admin can perform this action"
        );
        _;
    }
    
    modifier validComplaint(uint256 _complaintId) {
        require(_complaintId > 0 && _complaintId <= complaintCounter, "Invalid complaint ID");
        _;
    }
    
    constructor() {
        complaintCounter = 0;
        totalComplaints = 0;
    }
    
    // Submit a new complaint
    function submitComplaint(
        string memory _studentId,
        ComplaintCategory _category,
        string memory _title,
        string memory _description,
        string memory _ipfsHash
    ) external nonReentrant returns (uint256) {
        require(bytes(_studentId).length > 0, "Student ID cannot be empty");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        
        complaintCounter++;
        uint256 nonce = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            complaintCounter
        )));
        
        bytes32 complaintHash = keccak256(abi.encodePacked(
            _studentId,
            _category,
            _title,
            _description,
            block.timestamp,
            nonce
        ));
        
        Complaint memory newComplaint = Complaint({
            id: complaintCounter,
            student: msg.sender,
            studentId: _studentId,
            category: _category,
            title: _title,
            description: _description,
            ipfsHash: _ipfsHash,
            priority: Priority.Low,
            status: Status.Pending,
            timestamp: block.timestamp,
            blockNumber: block.number,
            complaintHash: complaintHash,
            nonce: nonce,
            escalationCount: 0,
            isVerified: false,
            verifiedBy: address(0)
        });
        
        complaints[complaintCounter] = newComplaint;
        studentComplaints[msg.sender].push(complaintCounter);
        studentIdToComplaints[_studentId].push(complaintCounter);
        complaintHashToId[complaintHash] = complaintCounter;
        totalComplaints++;
        
        emit ComplaintSubmitted(
            complaintCounter,
            msg.sender,
            _studentId,
            _category,
            Priority.Low,
            block.timestamp
        );
        
        return complaintCounter;
    }
    
    // Escalate complaint priority
    function escalateComplaint(uint256 _complaintId) 
        external 
        validComplaint(_complaintId) 
        onlyStudentOrOwner(_complaintId) 
        nonReentrant 
    {
        Complaint storage complaint = complaints[_complaintId];
        require(complaint.status == Status.Pending || complaint.status == Status.InProgress, 
                "Cannot escalate resolved or closed complaints");
        require(complaint.priority != Priority.Critical, "Complaint already at highest priority");
        
        Priority oldPriority = complaint.priority;
        
        if (complaint.priority == Priority.Low) {
            complaint.priority = Priority.Medium;
        } else if (complaint.priority == Priority.Medium) {
            complaint.priority = Priority.High;
        } else if (complaint.priority == Priority.High) {
            complaint.priority = Priority.Critical;
        }
        
        complaint.escalationCount++;
        
        emit ComplaintEscalated(_complaintId, oldPriority, complaint.priority, complaint.escalationCount);
    }
    
    // Update complaint status (Admin only)
    function updateComplaintStatus(uint256 _complaintId, Status _newStatus) 
        external 
        onlyOwner 
        validComplaint(_complaintId) 
        nonReentrant 
    {
        Complaint storage complaint = complaints[_complaintId];
        Status oldStatus = complaint.status;
        complaint.status = _newStatus;
        
        emit ComplaintStatusUpdated(_complaintId, oldStatus, _newStatus, msg.sender);
    }
    
    // Verify complaint (Admin only)
    function verifyComplaint(uint256 _complaintId) 
        external 
        onlyOwner 
        validComplaint(_complaintId) 
        nonReentrant 
    {
        Complaint storage complaint = complaints[_complaintId];
        require(!complaint.isVerified, "Complaint already verified");
        
        complaint.isVerified = true;
        complaint.verifiedBy = msg.sender;
        
        emit ComplaintVerified(_complaintId, msg.sender, block.timestamp);
    }
    
    // Get complaint details
    function getComplaint(uint256 _complaintId) 
        external 
        view 
        validComplaint(_complaintId) 
        returns (Complaint memory) 
    {
        return complaints[_complaintId];
    }
    
    // Get complaints by student address
    function getComplaintsByStudent(address _student) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return studentComplaints[_student];
    }
    
    // Get complaints by student ID
    function getComplaintsByStudentId(string memory _studentId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return studentIdToComplaints[_studentId];
    }
    
    // Get complaints by category
    function getComplaintsByCategory(ComplaintCategory _category) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory categoryComplaints = new uint256[](totalComplaints);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= complaintCounter; i++) {
            if (complaints[i].category == _category) {
                categoryComplaints[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = categoryComplaints[i];
        }
        
        return result;
    }
    
    // Get complaints by priority
    function getComplaintsByPriority(Priority _priority) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory priorityComplaints = new uint256[](totalComplaints);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= complaintCounter; i++) {
            if (complaints[i].priority == _priority) {
                priorityComplaints[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = priorityComplaints[i];
        }
        
        return result;
    }
    
    // Get all complaint IDs
    function getAllComplaintIds() external view returns (uint256[] memory) {
        uint256[] memory allIds = new uint256[](complaintCounter);
        for (uint256 i = 1; i <= complaintCounter; i++) {
            allIds[i-1] = i;
        }
        return allIds;
    }
    
    // Get complaint hash
    function getComplaintHash(uint256 _complaintId) 
        external 
        view 
        validComplaint(_complaintId) 
        returns (bytes32) 
    {
        return complaints[_complaintId].complaintHash;
    }
    
    // Verify complaint hash
    function verifyComplaintHash(uint256 _complaintId, bytes32 _hash) 
        external 
        view 
        validComplaint(_complaintId) 
        returns (bool) 
    {
        return complaints[_complaintId].complaintHash == _hash;
    }
    
    // Get blockchain statistics
    function getStatistics() external view returns (
        uint256 totalComplaintsCount,
        uint256 pendingCount,
        uint256 inProgressCount,
        uint256 resolvedCount,
        uint256 closedCount
    ) {
        uint256 pending = 0;
        uint256 inProgress = 0;
        uint256 resolved = 0;
        uint256 closed = 0;
        
        for (uint256 i = 1; i <= complaintCounter; i++) {
            if (complaints[i].status == Status.Pending) pending++;
            else if (complaints[i].status == Status.InProgress) inProgress++;
            else if (complaints[i].status == Status.Resolved) resolved++;
            else if (complaints[i].status == Status.Closed) closed++;
        }
        
        return (totalComplaints, pending, inProgress, resolved, closed);
    }
}
