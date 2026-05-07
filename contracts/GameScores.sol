// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title GameScores — secure, extensible multi-game on-chain leaderboard
/// @notice Owner can register new games at any time after deployment. Each game has
///         its own enabled flag, optional max-score cap, custom fee, and submission
///         cooldown. Fees use the pull-payment pattern (call `withdrawFees`).
/// @dev    Built with OpenZeppelin Ownable2Step + ReentrancyGuard + Pausable.
contract GameScores is Ownable2Step, ReentrancyGuard, Pausable {
    // ============ Types ============

    struct Game {
        string  name;
        bool    enabled;
        uint256 maxScore;       // 0 = no cap
        uint256 submissionFee;  // 0 = use defaultFee
        uint256 cooldown;       // seconds between submissions per address; 0 = none
    }

    struct Entry {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    // ============ Storage ============

    /// @notice Default submission fee used when a game has fee == 0.
    uint256 public defaultFee;

    /// @notice Address that receives accumulated fees on withdraw.
    address public feeReceiver;

    /// @notice Total accumulated, withdrawable fees (pull pattern).
    uint256 public pendingFees;

    /// @notice Auto-incrementing id for next game registration.
    uint256 public nextGameId;

    /// @dev gameId => game config.
    mapping(uint256 => Game) private _games;

    /// @dev gameId => list of all submissions.
    mapping(uint256 => Entry[]) private _scores;

    /// @notice Best score per (game, player).
    mapping(uint256 => mapping(address => uint256)) public bestScore;
    /// @notice Submission count per (game, player).
    mapping(uint256 => mapping(address => uint256)) public submissionCount;
    /// @notice Last submission timestamp per (game, player). Used for cooldown.
    mapping(uint256 => mapping(address => uint256)) public lastSubmission;

    // ============ Events ============

    event GameRegistered(uint256 indexed gameId, string name);
    event GameUpdated(uint256 indexed gameId, bool enabled, uint256 maxScore, uint256 submissionFee, uint256 cooldown);
    event ScoreSubmitted(uint256 indexed gameId, address indexed player, uint256 score, uint256 entryId);
    event DefaultFeeUpdated(uint256 newFee);
    event FeeReceiverUpdated(address indexed newReceiver);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ============ Errors ============

    error GameNotFound();
    error GameDisabled();
    error InsufficientFee();
    error ScoreTooLow();
    error ScoreExceedsMax();
    error CooldownActive(uint256 retryAt);
    error TransferFailed();
    error InvalidAddress();
    error EmptyName();

    // ============ Constructor ============

    /// @param initialOwner    Address that will own the contract (admin).
    /// @param initialReceiver Address that will receive withdrawn fees.
    constructor(address initialOwner, address initialReceiver) Ownable(initialOwner) {
        if (initialReceiver == address(0)) revert InvalidAddress();
        feeReceiver = initialReceiver;
        defaultFee = 0.0001 ether;

        // Seed with the four launch games.
        _registerGame("2048", 0, 0, 0);
        _registerGame("Rocket Runner", 0, 0, 0);
        _registerGame("Snake", 0, 0, 0);
        _registerGame("Flappy", 0, 0, 0);

        emit DefaultFeeUpdated(defaultFee);
        emit FeeReceiverUpdated(initialReceiver);
    }

    // ============ Admin: game registry ============

    /// @notice Register a new game. Only owner.
    /// @return id The new gameId.
    function registerGame(
        string calldata name,
        uint256 maxScore,
        uint256 submissionFee,
        uint256 cooldown
    ) external onlyOwner returns (uint256 id) {
        return _registerGame(name, maxScore, submissionFee, cooldown);
    }

    function _registerGame(
        string memory name,
        uint256 maxScore,
        uint256 submissionFee,
        uint256 cooldown
    ) internal returns (uint256 id) {
        if (bytes(name).length == 0) revert EmptyName();
        id = nextGameId++;
        _games[id] = Game({
            name: name,
            enabled: true,
            maxScore: maxScore,
            submissionFee: submissionFee,
            cooldown: cooldown
        });
        emit GameRegistered(id, name);
        emit GameUpdated(id, true, maxScore, submissionFee, cooldown);
    }

    /// @notice Update an existing game's config. Only owner.
    function updateGame(
        uint256 gameId,
        bool enabled,
        uint256 maxScore,
        uint256 submissionFee,
        uint256 cooldown
    ) external onlyOwner {
        if (gameId >= nextGameId) revert GameNotFound();
        Game storage g = _games[gameId];
        g.enabled = enabled;
        g.maxScore = maxScore;
        g.submissionFee = submissionFee;
        g.cooldown = cooldown;
        emit GameUpdated(gameId, enabled, maxScore, submissionFee, cooldown);
    }

    // ============ Admin: fees & ops ============

    function setDefaultFee(uint256 newFee) external onlyOwner {
        defaultFee = newFee;
        emit DefaultFeeUpdated(newFee);
    }

    function setFeeReceiver(address newReceiver) external onlyOwner {
        if (newReceiver == address(0)) revert InvalidAddress();
        feeReceiver = newReceiver;
        emit FeeReceiverUpdated(newReceiver);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ Player: submit score ============

    /// @notice Submit a score for a registered game. Pays at least `feeFor(gameId)`.
    /// @dev    Pull-payment: fees accumulate in `pendingFees`. Use `withdrawFees`.
    function submitScore(uint256 gameId, uint256 score)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (gameId >= nextGameId) revert GameNotFound();
        Game storage g = _games[gameId];
        if (!g.enabled) revert GameDisabled();
        if (score == 0) revert ScoreTooLow();
        if (g.maxScore != 0 && score > g.maxScore) revert ScoreExceedsMax();

        uint256 fee = g.submissionFee == 0 ? defaultFee : g.submissionFee;
        if (msg.value < fee) revert InsufficientFee();

        if (g.cooldown != 0) {
            uint256 readyAt = lastSubmission[gameId][msg.sender] + g.cooldown;
            if (block.timestamp < readyAt) revert CooldownActive(readyAt);
        }
        lastSubmission[gameId][msg.sender] = block.timestamp;

        Entry[] storage list = _scores[gameId];
        list.push(Entry({ player: msg.sender, score: score, timestamp: block.timestamp }));
        uint256 entryId = list.length - 1;

        submissionCount[gameId][msg.sender] += 1;
        if (score > bestScore[gameId][msg.sender]) {
            bestScore[gameId][msg.sender] = score;
        }

        // Accept full msg.value as fee (no auto-refund).
        pendingFees += msg.value;

        emit ScoreSubmitted(gameId, msg.sender, score, entryId);
    }

    // ============ Anyone: withdraw fees to feeReceiver ============

    /// @notice Push pendingFees out to the configured `feeReceiver`. Reentrancy-safe.
    /// @dev    Anyone may call (gas-payer); funds always go to `feeReceiver`.
    function withdrawFees() external nonReentrant returns (uint256 amount) {
        amount = pendingFees;
        if (amount == 0) return 0;
        pendingFees = 0;

        (bool ok, ) = payable(feeReceiver).call{value: amount}("");
        if (!ok) {
            // Revert state on failure so funds are not lost.
            pendingFees = amount;
            revert TransferFailed();
        }
        emit FeesWithdrawn(feeReceiver, amount);
    }

    // ============ Views ============

    function feeFor(uint256 gameId) public view returns (uint256) {
        if (gameId >= nextGameId) revert GameNotFound();
        uint256 f = _games[gameId].submissionFee;
        return f == 0 ? defaultFee : f;
    }

    function getGame(uint256 gameId) external view returns (Game memory) {
        if (gameId >= nextGameId) revert GameNotFound();
        return _games[gameId];
    }

    /// @notice Returns all games in registration order. Useful for dynamic frontends.
    function getAllGames() external view returns (Game[] memory list) {
        list = new Game[](nextGameId);
        for (uint256 i = 0; i < nextGameId; i++) {
            list[i] = _games[i];
        }
    }

    function totalScores(uint256 gameId) external view returns (uint256) {
        return _scores[gameId].length;
    }

    /// @notice Most recent `n` submissions for a game (newest first).
    function getRecentScores(uint256 gameId, uint256 n) external view returns (Entry[] memory out) {
        Entry[] storage list = _scores[gameId];
        uint256 len = list.length;
        if (n > len) n = len;
        out = new Entry[](n);
        for (uint256 i = 0; i < n; i++) {
            out[i] = list[len - 1 - i];
        }
    }

    /// @notice Top `n` scores for a game (highest first). O(n*m). Keep n small (<=50).
    /// @dev    Off-chain indexers (The Graph, Ponder) recommended for >5k entries.
    function getTopScores(uint256 gameId, uint256 n) external view returns (Entry[] memory out) {
        Entry[] storage list = _scores[gameId];
        uint256 len = list.length;
        if (n > len) n = len;
        out = new Entry[](n);
        bool[] memory used = new bool[](len);

        for (uint256 i = 0; i < n; i++) {
            uint256 bestIdx = 0;
            uint256 bestVal = 0;
            bool found = false;
            for (uint256 j = 0; j < len; j++) {
                if (used[j]) continue;
                if (!found || list[j].score > bestVal) {
                    bestVal = list[j].score;
                    bestIdx = j;
                    found = true;
                }
            }
            if (!found) break;
            used[bestIdx] = true;
            out[i] = list[bestIdx];
        }
    }
}
