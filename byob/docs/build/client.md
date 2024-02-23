# Building a Client Payload

This section details how the file client.py works and how the payloads are constructed

## Build Process

1) There is an argparser at the beginning of this function which allows you to specify:

    > host: the server ip address. 1st arg
    > port: the server port number (base, not +1, +2, or +3. Those are auto calculated). 2nd arg
    > modules: the modules you'd like to add. All remaining (unflagged) args
    > --name: output file to store client code in
    > --icon: icon image of file
    > --pastebin: updaload payload to pastebin so that C2 doesn't have to host it
    > --encrypt: should you encrypt the payload?
    > --compress: should you compress it and make the payload python file which uncompresses itself and executes what is uncompressed
    > --freeze: Should you freeze the program into a static binary
    > --debug: Should you make the binary in debug mode


2) These arguments are passed in the _modules function, which returns an array of the paths to all the modules you'd like to include in the client code

    - core/util.py, core/security.py, core/payloads.py core/miner.py added to every payload. Their functionality is described below

3) _modules and the arguments are then passed into _imports, which opens all the files specified in modules and concatenates together all the import lines (stripped) and returns that array
    
    - **IMPORTANT:** The central payload file is created by concatenating all the code together. If you would like to import one file into another, please using the syntax `from x import *` and avoid any naming collisions with previously existing code.

4) _imports, _modules, and args are passed into hidden which gets all the package names imported in modules which are specified to be imported. Returns hidden array

5) All these results are passed into _payload which:
    1) Puts everything together into one large file
    2) Either
          - Writes the result to pastebin
          - Writes the result to a file
    3) Returns the URL where its hosted or payload file

6) All previous outputs are then passed into _stager which possibly encrypts and compresses the payload (in that ordered) and possibly uploads it to pastebin, depending on what the input flags are. This returns the pastebin url

7) All these outputs are then passed into _dropper, which base64 encodes the file, creates a wrapper to execute the base64 encoded file, and possibly compiles that into a static binary, if the --freeze flag is passed in

8) The whole function then returns the name of the dropper (to nowhere if used as a script)



## Core File Functionality


### core/util.py
    - This is honestly just a bunch of random util functions. Nothing much to say there

### core/security.py
    - Allows for encryption and obfuscation strategies of text sent to and from the bot

### core/payloads.py
    - This contains the Payload object which gets run on the bots

### core/miner.py
    - This contains a monero miner which executes when the "miner" function is called on bot

