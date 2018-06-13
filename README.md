# BYOB (Build Your Own Botnet)
[![license](https://img.shields.io/badge/license-GPL--3.0-green.svg)](https://github.com/colental/byob/blob/master/LICENSE)

BYOB is an open-source project that provides a framework for security researchers 
and developers to build and operate a basic botnet to deepen their understanding
of the sophisticated malware that infects millions of devices every year and spawns
modern botnets, in order to improve their ability to develop counter-measures against 
these threats

The library contains 5 main parts:

1) __byob.generator__

   *generates unique, virtually undetectable droppers with staged payloads
   and a number of optional features can be added via intuitive command-line
   arguments* (`client.py -h/--help` for detailed usage information)

2) __byob.server__

   *console based command & control server with a persistent database for
   managing the client's reverse TCP shell sessions, tracking tasks issued
   to each client, storing results of each client's completed tasks, as well
   as hosting the byob.remote package online for clients to access remotely*

3) __byob.core__

   *subpackage of 6 core modules used by the command & control server  and client generator*

   - `byob.core.util`: *miscellaneous utility functions that are used by many modules*
   - `byob.core.handlers`: *base server class and various request handler classes* 
   - `byob.core.security`: 
     - __RFC-2741__ Diffie-Hellman Internet Key Exchange (secure encryption key even over monitored networks)
     - __AES-256__ in authenticated OCB mode (*requirements*: `PyCrypto` & `pycryptodome`) 
     - __AES-256__ in CBC mode with HMAC-SHA256 authentication (*requirements*: `PyCrypto`)
     - __XOR-128__ stream cipher that uses only builtin python keywords (*requirements*: none)

   - `byob.core.loader`: *enables clients to remotely import any package/module/script from the server
     by requesting the code from the server, loading the code in-memory, where
     it can be directly imported into the currently running process, without 
     writing anything to the disk (not even temporary files - zero IO system calls)*

   - `byob.core.payload`: *reverse TCP shell designed to remotely import post-exploitation modules from
     server, along with any packages/dependencies), complete tasks issued by
     the server, and handles connections & communication at the socket-level*

   - `byob.core.generators`: *module containing functions which all generate code by using the arguments
     given to complete templates of varying size and complexity, and then output
     the code snippets generated as raw text*

4) __byob.modules__

   *subpackage containing 11 post-exploitation modules for clients to import remotely*

   - `byob.modules.keylogger`: *logs the user’s keystrokes & the window name entered*
   - `byob.modules.screenshot`: *take a screenshot of current user’s desktop*
   - `byob.modules.webcam`: *view a live stream or capture image/video from the webcam*
   - `byob.modules.ransom`: *encrypt files & generate random BTC wallet for ransom payment*
   - `byob.modules.outlook`: *read/search/upload emails from the local Outlook client*
   - `byob.modules.packetsniffer`: *run a packet sniffer on the host network & upload .pcap file*
   - `byob.modules.persistence`: *establish persistence on the host machine using 5 different methods*
      - launch agent   (*Mac OS X*)
      - scheduled task (*Windows*)
      - startup file   (*Windows*)
      - registry key   (*Windows*)
      - crontab job    (*Linux*)
   - `byob.modules.phone`: *read/search/upload text messages from the client smartphone*
   - `byob.modules.escalate`: *attempt UAC bypass to gain unauthorized administrator privileges*
   - `byob.modules.portscanner`: *scan the local network for other online devices & open ports*
   - `byob.modules.process`: *list/search/kill/monitor currently running processes on the host*

5) __byob.trojans__
   
   *package containing the are hosted locally by the server (rather than uploaded to Pastebin to be hosted there 
   anonymously) for the client stagers to load & execute on the target host machines*
