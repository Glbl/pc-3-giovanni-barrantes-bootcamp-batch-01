require("dotenv").config();

const env = require("hardhat");
const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require("../utils");

const MINTER_ROLE = getRole("MINTER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");



async function deployUSDC() {
  let usdcContract = await deploySCNoUp("USDCoin", []);
  console.log("Verificacion USDCoin: ");
  await verify(usdcContract.address, "USDCoin", []);
  return usdcContract.address;
}
async function deployMPTKN() {

  let tokenMPTK = await deploySC("MiPrimerToken", []);
  let implementation = await printAddress("MPTKN Token ERC20 :", tokenMPTK.address);
  console.log("Verificacion MPTKN: ");
  await verify(implementation, "MiPrimerToken", []);
  
  return tokenMPTK.address;
}

async function deployPublicSale(tokenAddress) {
  // Extraer el address del gnosis safe y pasarlo al contrato con un setter
  const gnosis = { address: "0xc03C3c0C622B7324D4a648F9eF02ceAf33862743" };
  let publicSaleContract = await deploySC("PublicSale", []);
  let implementation = await printAddress("Token PublicSale :", publicSaleContract.address);

  console.log("SET UP Public Sale: ...");
  await ex(publicSaleContract, "setTokenAddress", [tokenAddress]);
  await ex(publicSaleContract, "setGnosisSafeWallet", [gnosis.address]);

  console.log("Verificacion: ...");
  await verify(implementation, "PublicSale");
}
async function deployGoerli() {

  let tokenMPTKAddress = await deployMPTKN();
  await deployPublicSale(tokenMPTKAddress);
  await deployUSDC();

}


deployGoerli()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
