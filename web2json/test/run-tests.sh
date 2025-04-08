#!/bin/bash

# Run all web2json tests
echo "🚀 Running web2json test suite"
echo "------------------------------"

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

# Make sure output directory exists
mkdir -p output

# Run the basic test
echo -e "\n📋 Running basic functionality test..."
pnpm tsx test/basic-test.ts

# Run the validation test
echo -e "\n📋 Running validation test..."
pnpm tsx test/validation-test.ts

# Run an example conversion
echo -e "\n📋 Running example conversion..."
pnpm dev --file datasets/dataset-comprehensive-html5-demo.html --output output

# Compare output with expected
echo -e "\n📋 Comparing with expected output..."
DIFF_OUTPUT=$(diff -q output/dataset-comprehensive-html5-demo.json datasets/dataset-comprehensive-html5-demo.json)
if [ $? -eq 0 ]; then
  echo "✅ Output matches expected JSON!"
else
  echo "⚠️  Output differs from expected JSON:"
  echo "$DIFF_OUTPUT"
fi

echo -e "\n✨ All tests completed!"