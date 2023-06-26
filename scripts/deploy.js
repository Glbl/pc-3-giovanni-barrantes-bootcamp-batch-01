require("dotenv").config();
const environment = require("hardhat");
const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require("../utils");

var MINTER_ROLE = getRole("MINTER_ROLE");
var BURNER_ROLE = getRole("BURNER_ROLE");

async function deployMumbai() {
  var relayerAddress = "0xdA86aB7A9FE94b663dd8897aC382Adb9693F83aD"; // modificar por el address del relayer defender del relayer
  var name = "Mi Primer NFT";
  var symbol = "MPRNFT";
  var nftContract = await deploySC("MiPrimerNft", [name, symbol]);
  var implementation = await printAddress("NFT", nftContract.address);

  // set up
  console.log("Setup NFT Mumbai : grantROLE:");
  await ex(nftContract, "grantRole", [MINTER_ROLE, relayerAddress], "GR");

  console.log("Verificaciones:");
  await verify(implementation, "MiPrimerNft", []);
}
async function deployPublicSale(tokenAddress) {

   var gnosis = { address: "gor:0x42827A1d8eB0FAf81e2421DA8961F3FCF4A1C7A5" };
  let publicSaleContract = await deploySC("PublicSale", []);
  let implementation = await printAddress("Token PublicSale :", publicSaleContract.address);

  console.log("SET UP Public Sale: ...");
  await ex(publicSaleContract, "setTokenAddress", [tokenAddress]);
  await ex(publicSaleContract, "setGnosisSafeWallet", [gnosis.address]);

  console.log("Verification: ...");
  await verify(implementation, "PublicSale");
}
async function deployGoerli() {
  let tokenMPTKAddress = await deployMPTKN();
  await deployPublicSale(tokenMPTKAddress);
  await deployUSDC();
}

// deployMumbai()
deployGoerli()
  //
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
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
