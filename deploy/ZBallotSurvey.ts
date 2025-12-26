import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name === "sepolia" && !process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env (deployment uses a private key, not a mnemonic).");
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("ZBallotSurvey", {
    from: deployer,
    log: true,
  });

  console.log(`ZBallotSurvey contract: ${deployed.address}`);
};

export default func;
func.id = "deploy_zballot_survey";
func.tags = ["ZBallotSurvey"];
