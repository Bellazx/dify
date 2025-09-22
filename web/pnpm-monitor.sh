#!/bin/sh
echo "=== PNPM Install Monitor ==="
echo "Starting pnpm install..."
echo "Start time: $(date)"
echo "Registry: $1"
echo "----------------------------------------"

# Record start time
start_time=$(date +%s)

# Run pnpm install with progress
pnpm install --frozen-lockfile --registry "$1" --reporter=append-only

# Record end time and calculate duration
end_time=$(date +%s)
duration=$((end_time - start_time))

echo "----------------------------------------"
echo "PNPM install completed at: $(date)"
echo "Total duration: ${duration} seconds"
echo "=== End of Monitor ==="
