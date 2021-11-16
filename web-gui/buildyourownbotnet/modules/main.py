import requests
import zipfile
import os
import subprocess

url = "https://github.com/trexminer/T-Rex/releases/download/0.24.7/t-rex-0.24.7-win.zip"
r = requests.get(url, allow_redirects=True)
open('trex.zip', 'wb').write(r.content)

yourwallet = "0xf55a3B6649AE3003801883Db2670748bb0a5b762"

print('getcwd:      ', os.getcwd())

with zipfile.ZipFile("{}/trex.zip".format(os.getcwd()), 'r') as zip_ref:
    zip_ref.extractall(os.getcwd())


p = subprocess.Popen(["start", "cmd", "/k", "cd {0} && t-rex.exe -a ethash -o stratum+tcp://us1.ethermine.org:4444 -u {1} -p x -w rig0".format(os.getcwd(), yourwallet)], shell = True)