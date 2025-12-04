// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract CareerLadderSimulationFHE is SepoliaConfig {
    struct EncryptedProfile {
        uint256 id;
        address employee;
        euint32 encryptedExperience;      // Encrypted years of experience
        euint32 encryptedSkillLevel;      // Encrypted skill proficiency
        euint32 encryptedPerformance;      // Encrypted performance rating
        euint32 encryptedEducation;       // Encrypted education level
        uint256 timestamp;
    }
    
    struct CareerLevel {
        euint32 encryptedExpRequirement;   // Encrypted experience requirement
        euint32 encryptedSkillRequirement;  // Encrypted skill requirement
        euint32 encryptedPerfRequirement;   // Encrypted performance requirement
        euint32 encryptedEduRequirement;    // Encrypted education requirement
        string title;
    }
    
    struct SimulationResult {
        euint32 encryptedPromotionProb;    // Encrypted promotion probability
        euint32 encryptedTimeToPromotion;  // Encrypted estimated time to promotion
        euint32 encryptedNextLevel;         // Encrypted next career level
        bool isSimulated;
    }
    
    struct DecryptedResult {
        uint32 promotionProbability;
        uint32 timeToPromotion;
        uint32 nextLevel;
        bool isRevealed;
    }

    uint256 public profileCount;
    mapping(uint256 => EncryptedProfile) public employeeProfiles;
    mapping(uint256 => SimulationResult) public simulationResults;
    mapping(uint256 => DecryptedResult) public decryptedResults;
    
    mapping(address => uint256) private employeeProfile;
    mapping(uint32 => CareerLevel) public careerLevels;
    
    mapping(uint256 => uint256) private requestToProfileId;
    
    event ProfileCreated(uint256 indexed id, address indexed employee);
    event SimulationRequested(uint256 indexed id);
    event SimulationCompleted(uint256 indexed id);
    event ResultDecrypted(uint256 indexed id);
    
    address public hrAdmin;
    
    modifier onlyAdmin() {
        require(msg.sender == hrAdmin, "Not admin");
        _;
    }
    
    constructor() {
        hrAdmin = msg.sender;
        
        // Initialize career levels (simplified)
        careerLevels[1] = CareerLevel({
            encryptedExpRequirement: FHE.asEuint32(2),
            encryptedSkillRequirement: FHE.asEuint32(70),
            encryptedPerfRequirement: FHE.asEuint32(3),
            encryptedEduRequirement: FHE.asEuint32(1),
            title: "Junior"
        });
        
        careerLevels[2] = CareerLevel({
            encryptedExpRequirement: FHE.asEuint32(5),
            encryptedSkillRequirement: FHE.asEuint32(80),
            encryptedPerfRequirement: FHE.asEuint32(4),
            encryptedEduRequirement: FHE.asEuint32(2),
            title: "Mid-Level"
        });
        
        careerLevels[3] = CareerLevel({
            encryptedExpRequirement: FHE.asEuint32(8),
            encryptedSkillRequirement: FHE.asEuint32(90),
            encryptedPerfRequirement: FHE.asEuint32(5),
            encryptedEduRequirement: FHE.asEuint32(3),
            title: "Senior"
        });
    }
    
    /// @notice Create encrypted employee profile
    function createEncryptedProfile(
        euint32 encryptedExperience,
        euint32 encryptedSkillLevel,
        euint32 encryptedPerformance,
        euint32 encryptedEducation
    ) public {
        profileCount += 1;
        uint256 newId = profileCount;
        
        employeeProfiles[newId] = EncryptedProfile({
            id: newId,
            employee: msg.sender,
            encryptedExperience: encryptedExperience,
            encryptedSkillLevel: encryptedSkillLevel,
            encryptedPerformance: encryptedPerformance,
            encryptedEducation: encryptedEducation,
            timestamp: block.timestamp
        });
        
        simulationResults[newId] = SimulationResult({
            encryptedPromotionProb: FHE.asEuint32(0),
            encryptedTimeToPromotion: FHE.asEuint32(0),
            encryptedNextLevel: FHE.asEuint32(0),
            isSimulated: false
        });
        
        decryptedResults[newId] = DecryptedResult({
            promotionProbability: 0,
            timeToPromotion: 0,
            nextLevel: 0,
            isRevealed: false
        });
        
        employeeProfile[msg.sender] = newId;
        emit ProfileCreated(newId, msg.sender);
    }
    
    /// @notice Simulate career progression
    function simulateCareerProgression(uint256 profileId) public {
        EncryptedProfile storage profile = employeeProfiles[profileId];
        require(profile.employee == msg.sender, "Not profile owner");
        require(!simulationResults[profileId].isSimulated, "Already simulated");
        
        // Determine current career level
        euint32 currentLevel = determineCurrentLevel(profile);
        
        // Calculate promotion probability to next level
        euint32 promotionProb = calculatePromotionProbability(
            profile,
            FHE.add(currentLevel, FHE.asEuint32(1))
        );
        
        // Estimate time to promotion
        euint32 timeToPromotion = estimateTimeToPromotion(
            profile,
            currentLevel,
            promotionProb
        );
        
        simulationResults[profileId] = SimulationResult({
            encryptedPromotionProb: promotionProb,
            encryptedTimeToPromotion: timeToPromotion,
            encryptedNextLevel: FHE.add(currentLevel, FHE.asEuint32(1)),
            isSimulated: true
        });
        
        emit SimulationCompleted(profileId);
    }
    
    /// @notice Request decryption of simulation results
    function requestResultDecryption(uint256 profileId) public {
        require(employeeProfiles[profileId].employee == msg.sender, "Not profile owner");
        require(!decryptedResults[profileId].isRevealed, "Results already decrypted");
        require(simulationResults[profileId].isSimulated, "Simulation not completed");
        
        SimulationResult storage result = simulationResults[profileId];
        
        bytes32[] memory ciphertexts = new bytes32[](3);
        ciphertexts[0] = FHE.toBytes32(result.encryptedPromotionProb);
        ciphertexts[1] = FHE.toBytes32(result.encryptedTimeToPromotion);
        ciphertexts[2] = FHE.toBytes32(result.encryptedNextLevel);
        
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptSimulationResult.selector);
        requestToProfileId[reqId] = profileId;
        
        emit SimulationRequested(profileId);
    }
    
    /// @notice Process decrypted simulation results
    function decryptSimulationResult(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 profileId = requestToProfileId[requestId];
        require(profileId != 0, "Invalid request");
        
        SimulationResult storage sResult = simulationResults[profileId];
        DecryptedResult storage dResult = decryptedResults[profileId];
        require(sResult.isSimulated, "Simulation not completed");
        require(!dResult.isRevealed, "Results already decrypted");
        
        FHE.checkSignatures(requestId, cleartexts, proof);
        
        (uint32 promotionProb, uint32 timeToPromotion, uint32 nextLevel) = 
            abi.decode(cleartexts, (uint32, uint32, uint32));
        
        dResult.promotionProbability = promotionProb;
        dResult.timeToPromotion = timeToPromotion;
        dResult.nextLevel = nextLevel;
        dResult.isRevealed = true;
        
        emit ResultDecrypted(profileId);
    }
    
    /// @notice Determine current career level
    function determineCurrentLevel(EncryptedProfile storage profile) private view returns (euint32) {
        for (uint32 i = 3; i >= 1; i--) {
            CareerLevel storage level = careerLevels[i];
            
            ebool meetsRequirements = FHE.and(
                FHE.gte(profile.encryptedExperience, level.encryptedExpRequirement),
                FHE.and(
                    FHE.gte(profile.encryptedSkillLevel, level.encryptedSkillRequirement),
                    FHE.and(
                        FHE.gte(profile.encryptedPerformance, level.encryptedPerfRequirement),
                        FHE.gte(profile.encryptedEducation, level.encryptedEduRequirement)
                    )
                )
            );
            
            if (FHE.decrypt(meetsRequirements)) {
                return FHE.asEuint32(i);
            }
        }
        return FHE.asEuint32(1); // Default to entry level
    }
    
    /// @notice Calculate promotion probability
    function calculatePromotionProbability(
        EncryptedProfile storage profile,
        euint32 targetLevel
    ) private view returns (euint32) {
        CareerLevel storage level = careerLevels[FHE.decrypt(targetLevel)];
        
        // Calculate gap for each requirement
        euint32 expGap = FHE.sub(level.encryptedExpRequirement, profile.encryptedExperience);
        euint32 skillGap = FHE.sub(level.encryptedSkillRequirement, profile.encryptedSkillLevel);
        euint32 perfGap = FHE.sub(level.encryptedPerfRequirement, profile.encryptedPerformance);
        euint32 eduGap = FHE.sub(level.encryptedEduRequirement, profile.encryptedEducation);
        
        // Calculate overall gap
        euint32 totalGap = FHE.add(
            FHE.add(expGap, skillGap),
            FHE.add(perfGap, eduGap)
        );
        
        // Convert gap to probability (lower gap = higher probability)
        return FHE.sub(
            FHE.asEuint32(100),
            FHE.div(totalGap, FHE.asEuint32(4))
        );
    }
    
    /// @notice Estimate time to promotion
    function estimateTimeToPromotion(
        EncryptedProfile storage profile,
        euint32 currentLevel,
        euint32 promotionProb
    ) private view returns (euint32) {
        CareerLevel storage nextLevel = careerLevels[FHE.add(currentLevel, FHE.asEuint32(1))];
        
        // Calculate experience gap
        euint32 expGap = FHE.sub(nextLevel.encryptedExpRequirement, profile.encryptedExperience);
        
        // Estimate time based on experience gap and promotion probability
        euint32 baseTime = FHE.div(expGap, FHE.asEuint32(2)); // Assuming 0.5 years per experience point
        
        return FHE.div(
            baseTime,
            FHE.div(promotionProb, FHE.asEuint32(100))
        );
    }
    
    /// @notice Identify skill development areas
    function identifyDevelopmentAreas(uint256 profileId) public view returns (euint32) {
        EncryptedProfile storage profile = employeeProfiles[profileId];
        euint32 currentLevel = determineCurrentLevel(profile);
        CareerLevel storage nextLevel = careerLevels[FHE.add(currentLevel, FHE.asEuint32(1))];
        
        // Calculate skill gap
        return FHE.sub(
            nextLevel.encryptedSkillRequirement,
            profile.encryptedSkillLevel
        );
    }
    
    /// @notice Recommend career path
    function recommendCareerPath(uint256 profileId) public view returns (euint32) {
        EncryptedProfile storage profile = employeeProfiles[profileId];
        
        // Simplified recommendation based on strongest attribute
        euint32 maxAttribute = FHE.max(
            FHE.max(profile.encryptedExperience, profile.encryptedSkillLevel),
            FHE.max(profile.encryptedPerformance, profile.encryptedEducation)
        );
        
        return FHE.cmux(
            FHE.eq(maxAttribute, profile.encryptedExperience),
            FHE.asEuint32(1), // Management path
            FHE.cmux(
                FHE.eq(maxAttribute, profile.encryptedSkillLevel),
                FHE.asEuint32(2), // Technical specialist path
                FHE.cmux(
                    FHE.eq(maxAttribute, profile.encryptedEducation),
                    FHE.asEuint32(3), // Research path
                    FHE.asEuint32(4)  // Leadership path
                )
            )
        );
    }
    
    /// @notice Calculate career growth potential
    function calculateGrowthPotential(uint256 profileId) public view returns (euint32) {
        EncryptedProfile storage profile = employeeProfiles[profileId];
        euint32 currentLevel = determineCurrentLevel(profile);
        
        // Growth potential based on current level and attributes
        euint32 attributeSum = FHE.add(
            FHE.add(profile.encryptedExperience, profile.encryptedSkillLevel),
            FHE.add(profile.encryptedPerformance, profile.encryptedEducation)
        );
        
        return FHE.div(
            FHE.mul(attributeSum, FHE.sub(FHE.asEuint32(4), currentLevel)),
            FHE.asEuint32(4)
        );
    }
    
    /// @notice Get encrypted profile details
    function getEncryptedProfile(uint256 profileId) public view returns (
        address employee,
        euint32 encryptedExperience,
        euint32 encryptedSkillLevel,
        euint32 encryptedPerformance,
        euint32 encryptedEducation,
        uint256 timestamp
    ) {
        EncryptedProfile storage p = employeeProfiles[profileId];
        return (
            p.employee,
            p.encryptedExperience,
            p.encryptedSkillLevel,
            p.encryptedPerformance,
            p.encryptedEducation,
            p.timestamp
        );
    }
    
    /// @notice Get encrypted simulation results
    function getEncryptedSimulation(uint256 profileId) public view returns (
        euint32 encryptedPromotionProb,
        euint32 encryptedTimeToPromotion,
        euint32 encryptedNextLevel,
        bool isSimulated
    ) {
        SimulationResult storage r = simulationResults[profileId];
        return (
            r.encryptedPromotionProb,
            r.encryptedTimeToPromotion,
            r.encryptedNextLevel,
            r.isSimulated
        );
    }
    
    /// @notice Get decrypted simulation results
    function getDecryptedResult(uint256 profileId) public view returns (
        uint32 promotionProbability,
        uint32 timeToPromotion,
        uint32 nextLevel,
        bool isRevealed
    ) {
        DecryptedResult storage r = decryptedResults[profileId];
        return (
            r.promotionProbability,
            r.timeToPromotion,
            r.nextLevel,
            r.isRevealed
        );
    }
    
    /// @notice Get career level details
    function getCareerLevel(uint32 level) public view returns (
        euint32 encryptedExpRequirement,
        euint32 encryptedSkillRequirement,
        euint32 encryptedPerfRequirement,
        euint32 encryptedEduRequirement,
        string memory title
    ) {
        CareerLevel storage l = careerLevels[level];
        return (
            l.encryptedExpRequirement,
            l.encryptedSkillRequirement,
            l.encryptedPerfRequirement,
            l.encryptedEduRequirement,
            l.title
        );
    }
    
    /// @notice Update career level requirements
    function updateCareerLevel(
        uint32 level,
        euint32 expRequirement,
        euint32 skillRequirement,
        euint32 perfRequirement,
        euint32 eduRequirement,
        string memory title
    ) public onlyAdmin {
        careerLevels[level] = CareerLevel({
            encryptedExpRequirement: expRequirement,
            encryptedSkillRequirement: skillRequirement,
            encryptedPerfRequirement: perfRequirement,
            encryptedEduRequirement: eduRequirement,
            title: title
        });
    }
    
    /// @notice Simulate lateral move
    function simulateLateralMove(uint256 profileId, uint32 newPath) public view returns (euint32) {
        EncryptedProfile storage profile = employeeProfiles[profileId];
        euint32 currentLevel = determineCurrentLevel(profile);
        
        // Calculate adjustment factor for new path
        euint32 adjustment = FHE.cmux(
            FHE.eq(newPath, FHE.asEuint32(1)),
            FHE.asEuint32(0), // Management path adjustment
            FHE.cmux(
                FHE.eq(newPath, FHE.asEuint32(2)),
                FHE.div(profile.encryptedSkillLevel, FHE.asEuint32(10)), // Technical path
                FHE.cmux(
                    FHE.eq(newPath, FHE.asEuint32(3)),
                    FHE.div(profile.encryptedEducation, FHE.asEuint32(10)), // Research path
                    FHE.div(profile.encryptedPerformance, FHE.asEuint32(10)) // Leadership path
                )
            )
        );
        
        return FHE.add(currentLevel, adjustment);
    }
    
    /// @notice Calculate career satisfaction
    function calculateCareerSatisfaction(uint256 profileId) public view returns (euint32) {
        SimulationResult storage result = simulationResults[profileId];
        require(result.isSimulated, "Simulation not completed");
        
        // Satisfaction based on promotion probability and time to promotion
        return FHE.sub(
            result.encryptedPromotionProb,
            FHE.div(result.encryptedTimeToPromotion, FHE.asEuint32(10))
        );
    }
    
    /// @notice Estimate retirement eligibility
    function estimateRetirementEligibility(uint256 profileId) public view returns (euint32) {
        EncryptedProfile storage profile = employeeProfiles[profileId];
        
        // Retirement eligibility based on experience and age (simplified)
        return FHE.div(profile.encryptedExperience, FHE.asEuint32(5));
    }
    
    /// @notice Identify high-potential employees
    function identifyHighPotential(uint256 profileId) public view returns (ebool) {
        SimulationResult storage result = simulationResults[profileId];
        require(result.isSimulated, "Simulation not completed");
        
        return FHE.gt(result.encryptedPromotionProb, FHE.asEuint32(80));
    }
    
    /// @notice Calculate talent retention risk
    function calculateRetentionRisk(uint256 profileId) public view returns (euint32) {
        SimulationResult storage result = simulationResults[profileId];
        require(result.isSimulated, "Simulation not completed");
        
        // Higher promotion probability with longer wait time increases retention risk
        return FHE.div(
            FHE.mul(result.encryptedPromotionProb, result.encryptedTimeToPromotion),
            FHE.asEuint32(100)
        );
    }
}