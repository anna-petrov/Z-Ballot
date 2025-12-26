import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ZBallotSurvey, ZBallotSurvey__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ZBallotSurvey")) as ZBallotSurvey__factory;
  const contract = (await factory.deploy()) as ZBallotSurvey;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("ZBallotSurvey", function () {
  let signers: Signers;
  let contract: ZBallotSurvey;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, address: contractAddress } = await deployFixture());
  });

  it("initial state is empty", async function () {
    expect(await contract.totalSubmissions()).to.eq(0);
    expect(await contract.hasSubmitted(signers.alice.address)).to.eq(false);
    expect(await contract.optionCount(0)).to.eq(3);
    expect(await contract.optionCount(1)).to.eq(4);
    expect(await contract.optionCount(2)).to.eq(2);
    expect(await contract.optionCount(3)).to.eq(3);
    expect(await contract.optionCount(4)).to.eq(4);
  });

  it("accepts a single encrypted submission per address", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(1)
      .add8(3)
      .add8(0)
      .add8(2)
      .add8(1)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .submitSurvey(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.handles[4],
        encryptedInput.inputProof,
      ))
      .wait();

    expect(await contract.hasSubmitted(signers.alice.address)).to.eq(true);
    expect(await contract.totalSubmissions()).to.eq(1);

    await expect(
      contract
        .connect(signers.alice)
        .submitSurvey(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.handles[4],
          encryptedInput.inputProof,
        ),
    ).to.be.revertedWithCustomError(contract, "AlreadySubmitted");
  });

  it("updates encrypted counts and allows decryption after public request", async function () {
    // Alice votes: q0=0, q1=1, q2=0, q3=2, q4=3
    const aliceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(0)
      .add8(1)
      .add8(0)
      .add8(2)
      .add8(3)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .submitSurvey(
        aliceInput.handles[0],
        aliceInput.handles[1],
        aliceInput.handles[2],
        aliceInput.handles[3],
        aliceInput.handles[4],
        aliceInput.inputProof,
      ))
      .wait();

    // Bob votes: q0=2, q1=1, q2=1, q3=2, q4=0
    const bobInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(2)
      .add8(1)
      .add8(1)
      .add8(2)
      .add8(0)
      .encrypt();

    await (await contract
      .connect(signers.bob)
      .submitSurvey(
        bobInput.handles[0],
        bobInput.handles[1],
        bobInput.handles[2],
        bobInput.handles[3],
        bobInput.handles[4],
        bobInput.inputProof,
      ))
      .wait();

    // Request public results for question 1, expected option counts: [0,2,0,0]
    await (await contract.connect(signers.alice).makeQuestionResultsPublic(1)).wait();
    const encryptedCounts = await contract.getEncryptedCounts(1);

    const option1 = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCounts[1],
      contractAddress,
      signers.alice,
    );
    expect(option1).to.eq(2);

    const option0 = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCounts[0],
      contractAddress,
      signers.alice,
    );
    expect(option0).to.eq(0);
  });
});

