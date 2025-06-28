// test_contract_event.js
const { JsonRpcProvider, Wallet, Contract, parseQuai, formatQuai } = require("quais");
const fs = require("fs");

async function loadWalletFromFile(walletPath, password) {
  try {
    const walletData = fs.readFileSync(walletPath, "utf8");
    const wallet = await Wallet.fromEncryptedJson(walletData, password);
    return wallet;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Wallet file not found: ${walletPath}`);
    } else if (error.message.includes("invalid password")) {
      throw new Error("Invalid password for wallet decryption");
    } else {
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }
}


async function main() {
  // Quai testnet RPC URL (updated to WebSocket as seen in logs)
  const rpcUrl = "https://rpc.orchard.quai.network";
  const provider = new JsonRpcProvider(rpcUrl, undefined, {
    // Quai requires pathing
    usePathing: true,
  });

  // Token Bridge contract address on Quai testnet
  const tokenBridgeAddress = "0x000C1396B8Ca86cE5d003156683dfC2680183983";

  // Assuming the user has a private key or wallet set up in .env or elsewhere
  // Replace with actual private key or use a wallet from Hardhat config
  let wallet = await loadWalletFromFile(
    "./wallet.json",
    ""
  );
  wallet = wallet.connect(provider);
  console.log("Address:", wallet.address);

  // ABI for Token Bridge contract (minimal for testing)
  const tokenBridgeAbi = [
    "function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) external payable returns (uint64 sequence)"
  ];

  // Connect to the Token Bridge contract
  const tokenBridge = new Contract(tokenBridgeAddress, tokenBridgeAbi, wallet);

  console.log("Step 1: Wrapping QUAI into WQUAI contract...");

  // Wrapped Native (WQUAI) contract address on Quai testnet
  const wQUAIAddress = "0x005c46f661Baef20671943f2b4c087Df3E7CEb13";
  
  // ABI for WQUAI contract (minimal for testing)
  const wQUAIAbi = [
    "function deposit() external payable",
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)"
  ];

  // Connect to the WQUAI contract
  const wQUAIContract = new Contract(wQUAIAddress, wQUAIAbi, wallet);

  // Deposit QUAI to wrap into WQUAI (adjust value as needed)
  const depositTx = await wQUAIContract.deposit({ value: parseQuai("1") }); // 1 QUAI
  console.log("Deposit transaction sent:", depositTx.hash);
  const depositReceipt = await depositTx.wait();
  console.log("Deposit confirmed in block:", depositReceipt.blockNumber);

  // Check WQUAI balance
  const wQUAIBalance = await wQUAIContract.balanceOf(wallet.address);
  console.log("WQUAI balance after deposit:", formatQuai(wQUAIBalance), "WQUAI");

  console.log("Step 2: Approving Token Bridge to spend WQUAI...");

  // Approve Token Bridge to spend WQUAI
  const approveTx = await wQUAIContract.approve(tokenBridgeAddress, parseQuai("1")); // 1 WQUAI
  console.log("Approve transaction sent:", approveTx.hash);
  const approveReceipt = await approveTx.wait();
  console.log("Approve confirmed in block:", approveReceipt.blockNumber);

  console.log("Step 3: Sending a test token transfer to Token Bridge to trigger an event...");

  // Send a test token transfer to trigger an event (adjust parameters as needed)
  const tx = await tokenBridge.transferTokens(
    wQUAIAddress, // token (WQUAI)
    parseQuai("1"), // amount (1 WQUAI)
    1, // recipientChain (Wormhole chain ID, 1 for Solana as an example)
    "0x0000000000000000000000000000000000000000000000000000000000000001", // recipient (dummy address for testing)
    0, // arbiterFee
    0 // nonce
  );

  console.log("Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Check for events (if any)
  if (receipt.events && receipt.events.length > 0) {
    console.log("Events emitted:", receipt.events);
  } else {
    console.log("No events found in the transaction receipt.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
