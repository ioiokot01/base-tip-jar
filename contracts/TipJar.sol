// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TipJar
/// @notice Anyone can send (tip) ETH with an optional message. The contract
///         keeps a running leaderboard of how much each address has tipped,
///         and only the owner can withdraw the collected funds.
contract TipJar {
    /// @notice One tip record.
    struct Tip {
        address tipper;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    /// @notice The address allowed to withdraw funds (set to the deployer).
    address public immutable owner;

    /// @notice Maximum allowed message length (bytes).
    uint256 public constant MAX_MESSAGE_LENGTH = 280;

    /// @dev Every tip, in order.
    Tip[] private tips;

    /// @notice Lifetime total of all tips received (in wei).
    uint256 public totalTips;

    /// @notice Total tipped by each address (in wei).
    mapping(address => uint256) public totalTipped;

    /// @dev Unique tippers, for building the leaderboard.
    address[] private tippers;
    mapping(address => bool) private hasTipped;

    event Tipped(
        address indexed tipper,
        uint256 amount,
        string message,
        uint256 timestamp
    );
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "TipJar: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Send a tip with an optional message. Must include some ETH.
    function tip(string calldata message) external payable {
        require(msg.value > 0, "TipJar: tip must be > 0");
        require(
            bytes(message).length <= MAX_MESSAGE_LENGTH,
            "TipJar: message too long"
        );

        tips.push(
            Tip({
                tipper: msg.sender,
                amount: msg.value,
                message: message,
                timestamp: block.timestamp
            })
        );

        if (!hasTipped[msg.sender]) {
            hasTipped[msg.sender] = true;
            tippers.push(msg.sender);
        }

        totalTipped[msg.sender] += msg.value;
        totalTips += msg.value;

        emit Tipped(msg.sender, msg.value, message, block.timestamp);
    }

    /// @notice Withdraw the entire balance to the owner.
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "TipJar: nothing to withdraw");

        // Use call (recommended over transfer) and check success.
        (bool ok, ) = payable(owner).call{value: balance}("");
        require(ok, "TipJar: withdraw failed");

        emit Withdrawn(owner, balance);
    }

    /// @notice Current ETH held by the contract (wei).
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Number of tips recorded.
    function tipsCount() external view returns (uint256) {
        return tips.length;
    }

    /// @notice All tip records.
    function getTips() external view returns (Tip[] memory) {
        return tips;
    }

    /// @notice Leaderboard data: parallel arrays of unique tippers and their
    ///         total tipped amounts. Sorting is left to the caller (frontend)
    ///         to keep gas bounded.
    function getLeaderboard()
        external
        view
        returns (address[] memory addrs, uint256[] memory amounts)
    {
        uint256 n = tippers.length;
        addrs = new address[](n);
        amounts = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            addrs[i] = tippers[i];
            amounts[i] = totalTipped[tippers[i]];
        }
    }
}
