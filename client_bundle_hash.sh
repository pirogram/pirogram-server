#!/bin/bash

HASH=`shasum static/js/client_bundle.js | cut -d' ' -f1`
echo -n 'module.exports = {client_bundle_hash: "' > filehashes.js
echo -n "${HASH}" >> filehashes.js
echo '"};' >> filehashes.js