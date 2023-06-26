const { ethers } = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("defender-relay-client/lib/ethers");

exports.handler = async function (data) {
  // Eventos que vienen del sentinel
  // Este evento viene de Sepolia cuando el usuario participa en Airdrop
  const payload = data.request.body.events;

  // Inicializa Proveedor: en este caso es OZP
  const provider = new DefenderRelayProvider(data);

  // Se crea el signer quien será el msg.sender en los smart contracts
  const signer = new DefenderRelaySigner(data, provider, { speed: "fast" });

  // Filtrando solo eventos
  var onlyEvents = payload[0].matchReasons.filter((e) => e.type === "event");
  if (onlyEvents.length === 0) return;
//DeliverNft(address winnerAccount, uint256 nftId);
  // Filtrando solo MintInAnotherChain
  var event = onlyEvents.filter((ev) =>
    ev.signature.includes("DeliverNft")
  );
  // Mismos params que en el evento
  var { winnerAccount, nftId } = event[0].params;

  // Ejecutar 'mint' en Mumbai del contrato MiPrimerToken
  var miPrimerNFTAdd = "0x4a7a4a5F0304C9a68Cd8D333d8D8d90Aaae2f642";
  var tokenAbi = ["function safeMint(address to, uint256 id)"];
  var tokenContract = new ethers.Contract(miPrimerNFTAdd, tokenAbi, signer);
  var tx = await tokenContract.safeMint(winnerAccount, nftId);
  var res = await tx.wait();
  return res;
};