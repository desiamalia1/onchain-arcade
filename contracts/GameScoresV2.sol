// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title  GameScoresV2 - multi-game on-chain leaderboard with auto-forwarded dev fees
/// @notice 5 games pre-registered (2048, Rocket Runner, Snake, Flappy, Memory).
///         Each submitScore auto-forwards the fee to the hardcoded dev address.
///         Owner can register more games anytime via registerGame().
/// @dev    Built with OpenZeppelin Ownable2Step + ReentrancyGuard + Pausable.
contract GameScoresV2 is Ownable2Step, ReentrancyGuard, Pausable {
    // ============ Constants ============

    /// @notice Default submission fee: 0.0001 ETH.
    uint256 public constant DEFAULT_FEE = 0.0001 ether;

    /// @notice Hardcoded developer address (auto-forwarded fee receiver).
    address public constant DEV_RECEIVER = 0x6b62122ABE518446561d3B6E58227F46214737dF;

    // ============ Types ============

    struct Game {
        string  name;
        bool    enabled;
        uint256 maxScore;       // 0 = no cap
        uint256 submissionFee;  // 0 = use DEFAULT_FEE
        uint256 cooldown;       // seconds between submissions per address
    }

    struct Entry {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    // ============ Storage ============

    /// @notice Backup pool for fees if direct transfer to DEV_RECEIVER fails.
    uint256 public pendingFees;

    /// @notice Auto-incrementing id for next registered game.
    uint256 public nextGameId;

    mapping(uint256 => Game)    private _games;
    mapping(uint256 => Entry[]) private _scores;

    mapping(uint256 => mapping(address => uint256)) public bestScore;
    mapping(uint256 => mapping(address => uint256)) public submissionCount;
    mapping(uint256 => mapping(address => uint256)) public lastSubmission;

    // ============ Events ============

    event GameRegistered(uint256 indexed gameId, string name);
    event GameUpdated(uint256 indexed gameId, bool enabled, uint256 maxScore, uint256 submissionFee, uint256 cooldown);
    event ScoreSubmitted(uint256 indexed gameId, address indexed player, uint256 score, uint256 entryId);
    event FeeForwarded(address indexed to, uint256 amount);
    event FeeAccrued(uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ============ Errors ============

    error GameNotFound();
    error GameDisabled();
    error InsufficientFee();
    error ScoreTooLow();
    error ScoreExceedsMax();
    error CooldownActive(uint256 retryAt);
    error TransferFailed();
    error EmptyName();

    // ============ Constructor ============

    /// @param initialOwner Address that will own the contract (admin).
    constructor(address initialOwner) Ownable(initialOwner) {
        // Seed 5 launch games.
        _registerGame("2048",          0, 0, 0);
        _registerGame("Rocket Runner", 0, 0, 0);
        _registerGame("Snake",         0, 0, 0);
        _registerGame("Flappy",        0, 0, 0);
        _registerGame("Memory",        0, 0, 0);
    }

    // ============ Admin: game registry ============

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

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ Player: submit score ============

    /// @notice Submit a score and pay the per-game fee. Fee is auto-forwarded to DEV_RECEIVER.
    /// @dev    If forwarding fails (e.g. receiver is a reverting contract), fee is held in
    ///         pendingFees and can be withdrawn later via withdrawFees().
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

        uint256 fee = g.submissionFee == 0 ? DEFAULT_FEE : g.submissionFee;
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

        emit ScoreSubmitted(gameId, msg.sender, score, entryId);

        // Auto-forward full msg.value to dev. Fallback to pendingFees on failure.
        (bool ok, ) = payable(DEV_RECEIVER).call{value: msg.value, gas: 30000}("");
        if (ok) {
            emit FeeForwarded(DEV_RECEIVER, msg.value);
        } else {
            pendingFees += msg.value;
            emit FeeAccrued(msg.value);
        }
    }

    // ============ Anyone: drain pendingFees to DEV_RECEIVER ============

    /// @notice Sends pendingFees (if any) to DEV_RECEIVER. Anyone may call.
    function withdrawFees() external nonReentrant returns (uint256 amount) {
        amount = pendingFees;
        if (amount == 0) return 0;
        pendingFees = 0;

        (bool ok, ) = payable(DEV_RECEIVER).call{value: amount}("");
        if (!ok) {
            pendingFees = amount;
            revert TransferFailed();
        }
        emit FeesWithdrawn(DEV_RECEIVER, amount);
    }

    // ============ Views ============

    function feeFor(uint256 gameId) public view returns (uint256) {
        if (gameId >= nextGameId) revert GameNotFound();
        uint256 f = _games[gameId].submissionFee;
        return f == 0 ? DEFAULT_FEE : f;
    }

    /// @notice Backwards-compat alias used by some frontends.
    function defaultFee() external pure returns (uint256) {
        return DEFAULT_FEE;
    }

    /// @notice Backwards-compat alias used by some frontends.
    function feeReceiver() external pure returns (address) {
        return DEV_RECEIVER;
    }

    function getGame(uint256 gameId) external view returns (Game memory) {
        if (gameId >= nextGameId) revert GameNotFound();
        return _games[gameId];
    }

    function getAllGames() external view returns (Game[] memory list) {
        list = new Game[](nextGameId);
        for (uint256 i = 0; i < nextGameId; i++) {
            list[i] = _games[i];
        }
    }

    function totalScores(uint256 gameId) external view returns (uint256) {
        return _scores[gameId].length;
    }

    function getRecentScores(uint256 gameId, uint256 n) external view returns (Entry[] memory out) {
        Entry[] storage list = _scores[gameId];
        uint256 len = list.length;
        if (n > len) n = len;
        out = new Entry[](n);
        for (uint256 i = 0; i < n; i++) {
            out[i] = list[len - 1 - i];
        }
    }

    /// @notice Top n scores (highest first). O(n*m). Keep n small (<=50).
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
