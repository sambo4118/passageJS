#!/usr/bin/env bash
set -euo pipefail

SUGARCUBE_VERSION="2.37.3"
FORMAT_DIR=".tweego/storyformats/sugarcube-2"
FORMAT_FILE="${FORMAT_DIR}/format.js"

if [[ -f "${FORMAT_FILE}" ]]; then
  echo "SugarCube format already available at ${FORMAT_FILE}"
  exit 0
fi

mkdir -p "${FORMAT_DIR}"

TMP_DIR="$(mktemp -d)"
ZIP_URL="https://github.com/tmedwards/sugarcube-2/releases/download/v${SUGARCUBE_VERSION}/sugarcube-${SUGARCUBE_VERSION}-for-twine-2.1-local.zip"

echo "Downloading SugarCube ${SUGARCUBE_VERSION}"
curl -fsSL "${ZIP_URL}" -o "${TMP_DIR}/sugarcube.zip"
unzip -o "${TMP_DIR}/sugarcube.zip" -d "${TMP_DIR}" >/dev/null

SOURCE_FORMAT_FILE="$(find "${TMP_DIR}" -type f -name format.js | head -n 1)"
if [[ -z "${SOURCE_FORMAT_FILE}" ]]; then
  echo "Could not locate SugarCube format.js"
  exit 1
fi

cp "${SOURCE_FORMAT_FILE}" "${FORMAT_FILE}"
rm -rf "${TMP_DIR}"

echo "Installed SugarCube format to ${FORMAT_FILE}"