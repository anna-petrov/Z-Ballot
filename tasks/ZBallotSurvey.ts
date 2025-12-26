import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import fs from "node:fs";
import path from "node:path";

function parseUInt(value: string, name: string, { min, max }: { min: number; max: number }) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Argument --${name} must be an integer in [${min}, ${max}]`);
  }
  return parsed;
}

task("survey:address", "Prints the ZBallotSurvey address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;
  const deployment = await deployments.get("ZBallotSurvey");
  console.log("ZBallotSurvey address is " + deployment.address);
});

task("survey:vote", "Submits an encrypted vote for all 5 questions")
  .addOptionalParam("address", "Optionally specify the ZBallotSurvey contract address")
  .addOptionalParam("q0", "Question 0 option (0..3)", "0")
  .addOptionalParam("q1", "Question 1 option (0..3)", "0")
  .addOptionalParam("q2", "Question 2 option (0..3)", "0")
  .addOptionalParam("q3", "Question 3 option (0..3)", "0")
  .addOptionalParam("q4", "Question 4 option (0..3)", "0")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ZBallotSurvey");
    console.log(`ZBallotSurvey: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const voter = signers[0];

    const q0 = parseUInt(taskArguments.q0, "q0", { min: 0, max: 3 });
    const q1 = parseUInt(taskArguments.q1, "q1", { min: 0, max: 3 });
    const q2 = parseUInt(taskArguments.q2, "q2", { min: 0, max: 3 });
    const q3 = parseUInt(taskArguments.q3, "q3", { min: 0, max: 3 });
    const q4 = parseUInt(taskArguments.q4, "q4", { min: 0, max: 3 });

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, voter.address)
      .add8(q0)
      .add8(q1)
      .add8(q2)
      .add8(q3)
      .add8(q4)
      .encrypt();

    const contract = await ethers.getContractAt("ZBallotSurvey", deployment.address);
    const tx = await contract
      .connect(voter)
      .submitSurvey(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.handles[4],
        encryptedInput.inputProof,
      );
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("survey:decrypt-question", "Decrypts per-option counts for a question (requires requesting results first)")
  .addOptionalParam("address", "Optionally specify the ZBallotSurvey contract address")
  .addParam("question", "Question id (0..4)")
  .addOptionalParam("makepublic", "Call makeQuestionResultsPublic(question) first (true/false)", "true")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ZBallotSurvey");
    console.log(`ZBallotSurvey: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const requester = signers[0];

    const questionId = parseUInt(taskArguments.question, "question", { min: 0, max: 4 });
    const makePublic = (taskArguments.makepublic as string).toLowerCase() !== "false";

    const contract = await ethers.getContractAt("ZBallotSurvey", deployment.address);
    if (makePublic) {
      const tx = await contract.connect(requester).makeQuestionResultsPublic(questionId);
      console.log(`Wait for tx:${tx.hash}...`);
      await tx.wait();
    }

    const optionCount: number = Number(await contract.optionCount(questionId));
    const encryptedCounts = await contract.getEncryptedCounts(questionId);

    const clearCounts: number[] = [];
    for (let i = 0; i < optionCount; i++) {
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedCounts[i],
        deployment.address,
        requester,
      );
      clearCounts.push(Number(decrypted));
    }

    console.log(`Question ${questionId} counts: [${clearCounts.join(", ")}]`);
  });

task("survey:sync-frontend-abi", "Writes contract address + ABI to home/src/config/contracts.ts from deployments/sepolia")
  .addOptionalParam("deployment", "Path to deployment json", "deployments/sepolia/ZBallotSurvey.json")
  .setAction(async function (taskArguments: TaskArguments, _hre) {
    const deploymentPath = String(taskArguments.deployment);
    const resolved = path.resolve(process.cwd(), deploymentPath);
    const raw = fs.readFileSync(resolved, "utf8");
    const json = JSON.parse(raw) as { address: string; abi: unknown };

    if (!json.address || !json.abi) {
      throw new Error(`Invalid deployment file: ${deploymentPath}`);
    }

    const outPath = path.resolve(process.cwd(), "home/src/config/contracts.ts");
    const content = `export const SURVEY_CONTRACT_ADDRESS = '${json.address}';

export const SURVEY_CONTRACT_ABI = ${JSON.stringify(json.abi, null, 2)} as const;
`;
    fs.writeFileSync(outPath, content, "utf8");
    console.log(`Wrote ${outPath}`);
  });

