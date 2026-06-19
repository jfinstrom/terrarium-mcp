#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/manifest/topics.json"

if ! command -v jq &>/dev/null; then
  echo "jq is required. Install jq or clone repos manually from manifest/topics.json"
  exit 1
fi

mkdir -p "$ROOT/sources"

count=$(jq '.sourceRepos | length' "$MANIFEST")
for i in $(seq 0 $((count - 1))); do
  name=$(jq -r ".sourceRepos[$i].name" "$MANIFEST")
  url=$(jq -r ".sourceRepos[$i].url" "$MANIFEST")
  branch=$(jq -r ".sourceRepos[$i].branch" "$MANIFEST")
  path=$(jq -r ".sourceRepos[$i].path" "$MANIFEST")
  dest="$ROOT/$path"

  if [ -d "$dest/.git" ]; then
    echo "==> $name: already cloned, fetching $branch"
    git -C "$dest" fetch --depth 1 origin "$branch" 2>/dev/null || git -C "$dest" fetch origin
    git -C "$dest" checkout "$branch" 2>/dev/null || true
  else
    echo "==> $name: cloning $url ($branch) -> $path"
    git clone --depth 1 --branch "$branch" "$url" "$dest" 2>/dev/null || {
      git clone --depth 1 "$url" "$dest"
      git -C "$dest" checkout "$branch" 2>/dev/null || true
    }
  fi
done

echo "Done. Source repos in $ROOT/sources/"