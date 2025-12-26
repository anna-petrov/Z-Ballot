// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Z-Ballot encrypted survey
/// @notice Collects encrypted answers and maintains encrypted per-option counts.
/// Users can request public results for a single question, making only that question's counts publicly decryptable.
contract ZBallotSurvey is ZamaEthereumConfig {
    uint8 public constant QUESTION_COUNT = 5;
    uint8 public constant MAX_OPTIONS = 4;

    // questionId => optionId => encrypted count
    euint32[MAX_OPTIONS][QUESTION_COUNT] private _counts;

    mapping(address => bool) private _hasSubmitted;
    uint32 private _totalSubmissions;

    event SurveySubmitted(address indexed voter);
    event QuestionResultsMadePublic(uint8 indexed questionId, address indexed requester);

    error AlreadySubmitted();
    error InvalidQuestionId(uint8 questionId);

    function optionCount(uint8 questionId) external pure returns (uint8) {
        return _optionCount(questionId);
    }

    function hasSubmitted(address user) external view returns (bool) {
        return _hasSubmitted[user];
    }

    function totalSubmissions() external view returns (uint32) {
        return _totalSubmissions;
    }

    function getEncryptedCounts(uint8 questionId) external view returns (euint32[MAX_OPTIONS] memory) {
        if (questionId >= QUESTION_COUNT) revert InvalidQuestionId(questionId);
        return _counts[questionId];
    }

    /// @notice Submit answers for all questions at once.
    /// @dev Answers are encrypted; on-chain logic updates only the selected option count for each question.
    function submitSurvey(
        externalEuint8 q0,
        externalEuint8 q1,
        externalEuint8 q2,
        externalEuint8 q3,
        externalEuint8 q4,
        bytes calldata inputProof
    ) external {
        if (_hasSubmitted[msg.sender]) revert AlreadySubmitted();

        euint8[QUESTION_COUNT] memory choices;
        choices[0] = FHE.fromExternal(q0, inputProof);
        choices[1] = FHE.fromExternal(q1, inputProof);
        choices[2] = FHE.fromExternal(q2, inputProof);
        choices[3] = FHE.fromExternal(q3, inputProof);
        choices[4] = FHE.fromExternal(q4, inputProof);

        for (uint8 questionId = 0; questionId < QUESTION_COUNT; questionId++) {
            _applyChoice(questionId, choices[questionId]);
        }

        _hasSubmitted[msg.sender] = true;
        unchecked {
            _totalSubmissions += 1;
        }

        emit SurveySubmitted(msg.sender);
    }

    /// @notice Make a single question's counts publicly decryptable.
    /// @dev This enables public decryption via the Relayer SDK. Only affects the specified question.
    function makeQuestionResultsPublic(uint8 questionId) external {
        uint8 options = _optionCount(questionId);
        for (uint8 optionId = 0; optionId < options; optionId++) {
            FHE.makePubliclyDecryptable(_counts[questionId][optionId]);
            FHE.allow(_counts[questionId][optionId], msg.sender);
        }

        emit QuestionResultsMadePublic(questionId, msg.sender);
    }

    function _applyChoice(uint8 questionId, euint8 choice) internal {
        uint8 options = _optionCount(questionId);
        euint32 one = FHE.asEuint32(1);
        euint32 zero = FHE.asEuint32(0);

        for (uint8 optionId = 0; optionId < options; optionId++) {
            ebool isSelected = FHE.eq(choice, FHE.asEuint8(optionId));
            euint32 delta = FHE.select(isSelected, one, zero);

            _counts[questionId][optionId] = FHE.add(_counts[questionId][optionId], delta);
            FHE.allowThis(_counts[questionId][optionId]);
        }
    }

    function _optionCount(uint8 questionId) internal pure returns (uint8) {
        if (questionId == 0) return 3;
        if (questionId == 1) return 4;
        if (questionId == 2) return 2;
        if (questionId == 3) return 3;
        if (questionId == 4) return 4;
        revert InvalidQuestionId(questionId);
    }
}
