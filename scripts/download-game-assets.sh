#!/usr/bin/env bash
# 从私有仓库 AGG233/sts2-analyzer-assets 下载游戏资源到 public/
set -euo pipefail

REPO="AGG233/sts2-analyzer-assets"
BRANCH="main"
TMPDIR=$(mktemp -d)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "正在从 ${REPO} 下载游戏资源..."

if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  echo "  使用 gh CLI..."
  gh repo clone "${REPO}" "${TMPDIR}" -- --depth 1 --branch "${BRANCH}" --quiet
else
  echo "  使用 git..."
  git clone --depth 1 --branch "${BRANCH}" "https://github.com/${REPO}.git" "${TMPDIR}" --quiet
fi

mkdir -p "${PROJECT_DIR}/public/cards" "${PROJECT_DIR}/public/spine"
cp -r "${TMPDIR}/cards/"* "${PROJECT_DIR}/public/cards/"
cp -r "${TMPDIR}/spine/"* "${PROJECT_DIR}/public/spine/"
rm -rf "${TMPDIR}"

echo "完成。资源已安装到 public/cards/ 和 public/spine/"
