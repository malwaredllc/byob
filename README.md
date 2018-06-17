# BYOB (Build Your Own Botnet)
[![license](https://img.shields.io/badge/license-GPL--3.0-green.svg)](https://github.com/colental/byob/blob/master/LICENSE)

BYOB is an open-source project that provides a framework for security researchers 
and developers to build and operate a basic botnet to deepen their understanding
of the sophisticated malware that infects millions of devices every year and spawns
modern botnets, in order to improve their ability to develop counter-measures against 
these threats

The library contains 4 main parts:

### Server
   
   **`byob.server`**
   
   *Console based command & control server with a persistent database for
   managing the client's reverse TCP shell sessions, tracking tasks issued
   to each client, storing results of each client's completed tasks, as well
   as hosting the byob.remote package online for clients to access remotely*
   (`server.py -h/--help` for detailed usage information)

### Generator

   `byob.generator`

   *Generates unique, virtually undetectable droppers with staged payloads
   and a number of optional features can be added via intuitive command-line
   arguments* (`generator.py -h/--help` for detailed usage information)

### Core

   `byob.core`

   *Subpackage of 6 core modules used by the command & control server  and client generator*

   1) `byob.core.util`: miscellaneous utility functions that are used by many modules
   2) `byob.core.handlers`: base server class and various request handler classes
   3) `byob.core.security`: Diffie-Hellman Internet Key Exchange (RFC 2741) and 3 different types of encryption
   4) `byob.core.loader`: enables clients to remotely import any package/module/script from the server
   5) `byob.core.payload`: reverse TCP shell designed to remotely import dependencies, packages & modules
   6) `byob.core.generators`: functions which all dynamically generate code for the client generator

### Modules

   `byob.modules`

   *Subpackage containing 11 post-exploitation modules for clients to import remotely*

   1) `byob.modules.keylogger`: logs the user’s keystrokes & the window name entered
   2) `byob.modules.screenshot`: take a screenshot of current user’s desktop
   3) `byob.modules.webcam`: view a live stream or capture image/video from the webcam
   4) `byob.modules.ransom`: encrypt files & generate random BTC wallet for ransom payment
   5) `byob.modules.outlook`: read/search/upload emails from the local Outlook client
   6) `byob.modules.packetsniffer`: run a packet sniffer on the host network & upload .pcap file
   7) `byob.modules.persistence`: establish persistence on the host machine using 5 different methods
   8) `byob.modules.phone`: read/search/upload text messages from the client smartphone
   9) `byob.modules.escalate`: attempt UAC bypass to gain unauthorized administrator privileges
   10) `byob.modules.portscanner`: scan the local network for other online devices & open ports
   11) `byob.modules.process`: list/search/kill/monitor currently running processes on the host
