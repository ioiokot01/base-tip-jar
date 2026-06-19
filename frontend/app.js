// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Deployed TipJar on Base Sepolia (chainId 84532).
// https://sepolia.basescan.org/address/0x8f593359eF9F6152d993f0A2C23546872096E407
const CONTRACT_ADDRESS = "0x8f593359eF9F6152d993f0A2C23546872096E407";

const ABI = [
  "function tip(string message) external payable",
  "function withdraw() external",
  "function owner() view returns (address)",
  "function totalTips() view returns (uint256)",
  "function contractBalance() view returns (uint256)",
  "function getTips() view returns (tuple(address tipper, uint256 amount, string message, uint256 timestamp)[])",
  "function getLeaderboard() view returns (address[] addrs, uint256[] amounts)",
  "event Tipped(address indexed tipper, uint256 amount, string message, uint256 timestamp)",
];

// ---------------------------------------------------------------------------
// State + refs
// ---------------------------------------------------------------------------

let provider;
let signer;
let contract;
let account;
let allTips = []; // last loaded tips
let scope = "all"; // "all" | "mine"
let sortOrder = "newest"; // "newest" | "oldest"

const els = {
  connectBtn: document.getElementById("connectBtn"),
  account: document.getElementById("account"),
  totalTips: document.getElementById("totalTips"),
  balance: document.getElementById("balance"),
  amountInput: document.getElementById("amountInput"),
  messageInput: document.getElementById("messageInput"),
  charCount: document.getElementById("charCount"),
  tipBtn: document.getElementById("tipBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  status: document.getElementById("status"),
  leaderboard: document.getElementById("leaderboard"),
  emptyBoard: document.getElementById("emptyBoard"),
  tips: document.getElementById("tips"),
  ownerPanel: document.getElementById("ownerPanel"),
  withdrawBtn: document.getElementById("withdrawBtn"),
  tipControls: document.getElementById("tipControls"),
  emptyTips: document.getElementById("emptyTips"),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStatus(text, kind = "") {
  els.status.textContent = text;
  els.status.className = "status" + (kind ? " " + kind : "");
}

function short(address) {
  return address.slice(0, 6) + "…" + address.slice(-4);
}

function fmtEth(wei) {
  // Trim trailing zeros for nicer display.
  return parseFloat(ethers.formatEther(wei)).toString();
}

function formatTime(unixSeconds) {
  return new Date(Number(unixSeconds) * 1000).toLocaleString();
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

async function connect() {
  if (!window.ethereum) {
    setStatus("No wallet found. Install MetaMask or Coinbase Wallet.", "error");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = (await signer.getAddress()).toLowerCase();

    els.account.textContent = "Connected: " + short(account);
    els.account.classList.remove("hidden");
    els.connectBtn.textContent = "Connected";

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    els.amountInput.disabled = false;
    els.messageInput.disabled = false;
    els.tipBtn.disabled = false;
    els.refreshBtn.disabled = false;
    els.tipControls.classList.remove("hidden");

    await refresh();
    contract.on("Tipped", () => refresh());
  } catch (err) {
    setStatus(err.shortMessage || err.message || "Failed to connect.", "error");
  }
}

// ---------------------------------------------------------------------------
// Read + render
// ---------------------------------------------------------------------------

async function refresh() {
  if (!contract) return;
  setStatus("Loading…");
  try {
    const [total, balance, tips, board, owner] = await Promise.all([
      contract.totalTips(),
      contract.contractBalance(),
      contract.getTips(),
      contract.getLeaderboard(),
      contract.owner(),
    ]);

    els.totalTips.textContent = fmtEth(total) + " ETH";
    els.balance.textContent = fmtEth(balance) + " ETH";

    renderLeaderboard(board.addrs, board.amounts);
    allTips = tips;
    renderTips();

    // Show owner panel only to the owner.
    if (owner.toLowerCase() === account) {
      els.ownerPanel.classList.remove("hidden");
      els.withdrawBtn.disabled = balance === 0n;
    } else {
      els.ownerPanel.classList.add("hidden");
    }

    setStatus("");
  } catch (err) {
    setStatus(err.shortMessage || err.message || "Failed to load.", "error");
  }
}

function renderLeaderboard(addrs, amounts) {
  els.leaderboard.innerHTML = "";
  if (addrs.length === 0) {
    els.emptyBoard.classList.remove("hidden");
    return;
  }
  els.emptyBoard.classList.add("hidden");

  // Pair + sort by amount descending.
  const rows = addrs
    .map((addr, i) => ({ addr, amount: amounts[i] }))
    .sort((a, b) => (a.amount < b.amount ? 1 : a.amount > b.amount ? -1 : 0));

  rows.forEach((row) => {
    const li = document.createElement("li");
    const addr = document.createElement("span");
    addr.className = "lb-addr";
    addr.textContent = short(row.addr);
    const amt = document.createElement("span");
    amt.className = "lb-amount";
    amt.textContent = fmtEth(row.amount) + " ETH";
    li.append(addr, amt);
    els.leaderboard.appendChild(li);
  });
}

function renderTips() {
  els.tips.innerHTML = "";

  // Filter by scope, then order. allTips is in chain (oldest-first) order.
  let rows = allTips.map((tip, i) => ({ tip, i }));
  if (scope === "mine") {
    rows = rows.filter(({ tip }) => tip.tipper.toLowerCase() === account);
  }
  rows.sort((a, b) => (sortOrder === "newest" ? b.i - a.i : a.i - b.i));

  if (rows.length === 0) {
    els.emptyTips.textContent =
      scope === "mine" ? "You haven't tipped yet." : "No tips yet.";
    els.emptyTips.classList.remove("hidden");
    return;
  }
  els.emptyTips.classList.add("hidden");

  rows.forEach(({ tip }) => {
    const li = document.createElement("li");
    li.className = "tip-item";

    const meta = document.createElement("div");
    meta.className = "tip-meta";
    const left = document.createElement("span");
    left.innerHTML = `<span class="tip-amount">${fmtEth(
      tip.amount
    )} ETH</span> from ${short(tip.tipper)}`;
    const time = document.createElement("span");
    time.textContent = formatTime(tip.timestamp);
    meta.append(left, time);

    li.appendChild(meta);
    if (tip.message) {
      const msg = document.createElement("p");
      msg.className = "tip-message";
      msg.textContent = tip.message;
      li.appendChild(msg);
    }
    els.tips.appendChild(li);
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

async function sendTip() {
  const amountStr = els.amountInput.value.trim();
  const message = els.messageInput.value.trim();

  let value;
  try {
    value = ethers.parseEther(amountStr || "0");
  } catch {
    setStatus("Enter a valid amount.", "error");
    return;
  }
  if (value <= 0n) {
    setStatus("Tip must be greater than 0.", "error");
    return;
  }

  els.tipBtn.disabled = true;
  try {
    setStatus("Confirm the transaction in your wallet…");
    const tx = await contract.tip(message, { value });
    setStatus("Waiting for confirmation…");
    await tx.wait();
    els.amountInput.value = "";
    els.messageInput.value = "";
    updateCharCount();
    setStatus("Tip sent! 🎉", "ok");
    await refresh();
  } catch (err) {
    setStatus(err.shortMessage || err.message || "Transaction failed.", "error");
  } finally {
    els.tipBtn.disabled = false;
  }
}

async function withdraw() {
  els.withdrawBtn.disabled = true;
  try {
    setStatus("Confirm withdrawal in your wallet…");
    const tx = await contract.withdraw();
    setStatus("Waiting for confirmation…");
    await tx.wait();
    setStatus("Withdrawn! 💰", "ok");
    await refresh();
  } catch (err) {
    setStatus(err.shortMessage || err.message || "Withdraw failed.", "error");
    els.withdrawBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

function updateCharCount() {
  els.charCount.textContent = `${els.messageInput.value.length} / 280`;
}

els.connectBtn.addEventListener("click", connect);
els.tipBtn.addEventListener("click", sendTip);
els.refreshBtn.addEventListener("click", refresh);
els.withdrawBtn.addEventListener("click", withdraw);
els.messageInput.addEventListener("input", updateCharCount);

// Tip feed scope (all/mine) and sort (newest/oldest) — re-render without refetch.
els.tipControls.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.scope) scope = btn.dataset.scope;
    if (btn.dataset.sort) sortOrder = btn.dataset.sort;
    // Toggle active state within the button's own segment group.
    btn.parentElement
      .querySelectorAll(".seg-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    renderTips();
  });
});

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}
