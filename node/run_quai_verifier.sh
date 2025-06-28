#!/bin/bash

# Script to run the EVM transfer verifier for Quai testnet

# Configuration for Quai testnet
RPC_URL="wss://rpc.orchard.quai.network/cyprus1"
CORE_CONTRACT="0x0059550bAb63eb452495827F125988369f7e06de"
TOKEN_CONTRACT="0x000C1396B8Ca86cE5d003156683dfC2680183983"
# Wrapped native contract address for Quai testnet (equivalent to BRIDGE_INIT_WETH)
WRAPPED_NATIVE_CONTRACT="0x005c46f661Baef20671943f2b4c087Df3E7CEb13"
PRUNE_HEIGHT_DELTA=10

# Ensure the guardiand binary is built, which includes the transfer-verifier subcommand
BINARY_DIR="./build/bin"
BINARY="$BINARY_DIR/guardiand"

# Check if binary directory exists, if not, create it
if [ ! -d "$BINARY_DIR" ]; then
    echo "Binary directory not found, creating $BINARY_DIR..."
    mkdir -p $BINARY_DIR
    if [ $? -ne 0 ]; then
        echo "Failed to create binary directory. Please create it manually and rerun this script."
        exit 1
    fi
fi

# Check if binary exists, if not, attempt to build it
if [ -f "$BINARY" ]; then
    echo "Existing binary found at $BINARY, removing to force a rebuild..."
    rm -f $BINARY
    if [ $? -ne 0 ]; then
        echo "Failed to remove existing binary. Please remove it manually and rerun this script."
        exit 1
    fi
fi

# Attempt to build the guardiand binary
echo "Attempting to build the guardiand binary..."
echo "Navigating to the root directory to build the project..."
cd /Users/jonathan/wormhole || { echo "Failed to navigate to root directory. Please check the path."; exit 1; }
echo "Running make node to build guardiand..."
make node
if [ $? -ne 0 ]; then
    echo "Failed to build the guardiand binary. Please build it manually using the following steps:"
    echo "1. Navigate to the root directory: cd /Users/jonathan/wormhole"
    echo "2. Build the binary: make node"
    echo "3. Rerun this script."
    exit 1
fi
echo "Build successful."

# Run the verifier with Quai configuration using guardiand transfer-verifier subcommand
echo "Starting EVM transfer verifier for Quai testnet..."
$BINARY transfer-verifier evm \
    --rpcUrl "$RPC_URL" \
    --coreContract "$CORE_CONTRACT" \
    --tokenContract "$TOKEN_CONTRACT" \
    --wrappedNativeContract "$WRAPPED_NATIVE_CONTRACT" \
    --pruneHeightDelta $PRUNE_HEIGHT_DELTA \
    --logLevel debug

if [ $? -eq 0 ]; then
    echo "Verifier started successfully."
else
    echo "Failed to start verifier. Please check your Go environment, dependencies, or ensure the binary is compatible with your system."
    echo "You can try building and running manually with the following steps:"
    echo "1. Navigate to the root directory: cd /Users/jonathan/wormhole"
    echo "2. Build the binary: make node"
    echo "3. Run the verifier: $BINARY transfer-verifier evm --rpcUrl $RPC_URL --coreContract $CORE_CONTRACT --tokenContract $TOKEN_CONTRACT --wrappedNativeContract $WRAPPED_NATIVE_CONTRACT --pruneHeightDelta $PRUNE_HEIGHT_DELTA --logLevel debug"
    exit 1
fi
