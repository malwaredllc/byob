<img src="https://raw.githubusercontent.com/malwaredllc/byob/master/byob/static/byob_logo_email-black.png" width="400px"></img>
# Build Your Own Botnet [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=BYOB%20(Build%20Your%20Own%20Botnet)&url=https://github.com/malwaredllc/byob&via=malwaredllc&hashtags=botnet,python,infosec,github)
[![license](https://img.shields.io/badge/license-GPL-brightgreen.svg)](https://github.com/malwaredllc/byob/blob/master/LICENSE)
[![version](https://img.shields.io/badge/version-1.0-lightgrey.svg)](https://github.com/malwaredllc/byob)
[![build](https://img.shields.io/travis/com/malwaredllc/byob/master.svg)](https://travis-ci.com/malwaredllc/byob.svg?branch=master)


Questions? [Join our Discord server](https://discord.com/channels/709150520446550097/709150520929026241)

__Disclaimer__: This project should be used for authorized testing or educational purposes only.

BYOB is an open-source project that provides a framework for security researchers and developers 
to build and operate a basic botnet to deepen their understanding of the sophisticated malware 
that infects millions of devices every year and spawns modern botnets, in order to improve their 
ability to develop counter-measures against these threats. 

It is designed to allow developers to easily implement their own code and add cool new
features *without* having to write a **RAT** (Remote Administration Tool) or a
**C2** (Command & Control server) from scratch.

*The RAT's key feature is that arbitrary code/files can be remotely loaded into memory
from the C2 and executed on the target machine without writing anything to the disk.*

Supports Python 2 & 3.

*BYOB now includes a powerful web GUI which makes it more accessible to new users. Check out https://buildyourownbotnet.com to see a preview, or follow [this guide](https://github.com/malwaredllc/byob/wiki) to get started! Key features include:*

## Dashboard
A control panel for your C2 server with a point-and-click interface for executing post-exploitation modules across your botnet. The dashboard includes a map of your bots across the globe, and hashrate trackers & graphs for those of you mining Monero.
![dashboard_preview](https://github.com/malwaredllc/byob-app-local/blob/master/buildyourownbotnet/assets/images/previews/preview-dashboard.png)

## Payload Generator
The payload generator uses black magic involving Docker containers & Wine servers to compile executable payloads for any platform/architecture you select.
![payload_generator_preview](https://github.com/malwaredllc/byob-app-local/blob/master/buildyourownbotnet/assets/images/previews/preview-payloads2.png)

## Terminal Emulator
The web app includes an in-browser terminal emulator so you can still have direct shell access even when using the GUI
![shell_preview](https://github.com/malwaredllc/byob-app-local/blob/master/buildyourownbotnet/assets/images/previews/preview-shell2.png)


### Donation

*By default BYOB will mine Monero in the background to support the developers. However, this can be disabled in the source code.*
________________________________________________________________________________________________

### Contact

__Website__: https://buildyourownbotnet.com

__Email__: security@malwared.com

__Twitter__: [![twitter](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/malwaredllc)
