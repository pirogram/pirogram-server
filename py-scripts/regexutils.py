#!/usr/bin/env python3

import sys
import json
import re

in_data = json.loads( sys.stdin.read())
out_data = {"regex": in_data["regex"], "texts": {}}

regex = re.compile(in_data["regex"])
for text in in_data["texts"]:
    if regex.search(text.strip()) is not None:
        out_data["texts"][text] = True
    else:
        out_data["texts"][text] = False

print( json.dumps(out_data))