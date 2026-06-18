const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  anyValue,
} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("TipJar", function () {
  let tipJar;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const TipJar = await ethers.getContractFactory("TipJar");
    tipJar = await TipJar.deploy();
    await tipJar.waitForDeployment();
  });

  it("sets the deployer as owner", async function () {
    expect(await tipJar.owner()).to.equal(owner.address);
  });

  it("starts empty", async function () {
    expect(await tipJar.tipsCount()).to.equal(0n);
    expect(await tipJar.totalTips()).to.equal(0n);
    expect(await tipJar.contractBalance()).to.equal(0n);
  });

  it("records a tip and updates totals + balance", async function () {
    const amount = ethers.parseEther("0.5");
    await expect(
      tipJar.connect(alice).tip("thanks!", { value: amount })
    ).to.changeEtherBalance(tipJar, amount);

    expect(await tipJar.tipsCount()).to.equal(1n);
    expect(await tipJar.totalTips()).to.equal(amount);
    expect(await tipJar.totalTipped(alice.address)).to.equal(amount);
    expect(await tipJar.contractBalance()).to.equal(amount);

    const tips = await tipJar.getTips();
    expect(tips[0].tipper).to.equal(alice.address);
    expect(tips[0].amount).to.equal(amount);
    expect(tips[0].message).to.equal("thanks!");
  });

  it("emits a Tipped event", async function () {
    const amount = ethers.parseEther("0.1");
    await expect(tipJar.connect(alice).tip("gm", { value: amount }))
      .to.emit(tipJar, "Tipped")
      .withArgs(alice.address, amount, "gm", anyValue);
  });

  it("rejects a zero-value tip", async function () {
    await expect(
      tipJar.connect(alice).tip("free?", { value: 0 })
    ).to.be.revertedWith("TipJar: tip must be > 0");
  });

  it("rejects a message that is too long", async function () {
    await expect(
      tipJar.connect(alice).tip("x".repeat(281), {
        value: ethers.parseEther("0.1"),
      })
    ).to.be.revertedWith("TipJar: message too long");
  });

  it("accumulates multiple tips from the same address", async function () {
    await tipJar.connect(alice).tip("one", { value: ethers.parseEther("0.2") });
    await tipJar.connect(alice).tip("two", { value: ethers.parseEther("0.3") });

    expect(await tipJar.totalTipped(alice.address)).to.equal(
      ethers.parseEther("0.5")
    );

    // alice should appear only once in the leaderboard.
    const [addrs] = await tipJar.getLeaderboard();
    expect(addrs).to.have.lengthOf(1);
    expect(addrs[0]).to.equal(alice.address);
  });

  it("builds a leaderboard across multiple tippers", async function () {
    await tipJar.connect(alice).tip("a", { value: ethers.parseEther("1") });
    await tipJar.connect(bob).tip("b", { value: ethers.parseEther("2") });

    const [addrs, amounts] = await tipJar.getLeaderboard();
    expect(addrs).to.deep.equal([alice.address, bob.address]);
    expect(amounts).to.deep.equal([
      ethers.parseEther("1"),
      ethers.parseEther("2"),
    ]);
  });

  it("lets the owner withdraw the full balance", async function () {
    const amount = ethers.parseEther("1.5");
    await tipJar.connect(alice).tip("for you", { value: amount });

    await expect(tipJar.connect(owner).withdraw()).to.changeEtherBalances(
      [tipJar, owner],
      [-amount, amount]
    );
    expect(await tipJar.contractBalance()).to.equal(0n);
  });

  it("emits Withdrawn on withdraw", async function () {
    const amount = ethers.parseEther("0.4");
    await tipJar.connect(alice).tip("hi", { value: amount });
    await expect(tipJar.connect(owner).withdraw())
      .to.emit(tipJar, "Withdrawn")
      .withArgs(owner.address, amount);
  });

  it("blocks non-owners from withdrawing", async function () {
    await tipJar.connect(alice).tip("hi", { value: ethers.parseEther("0.4") });
    await expect(tipJar.connect(alice).withdraw()).to.be.revertedWith(
      "TipJar: not owner"
    );
  });

  it("reverts withdraw when there is nothing to withdraw", async function () {
    await expect(tipJar.connect(owner).withdraw()).to.be.revertedWith(
      "TipJar: nothing to withdraw"
    );
  });
});
