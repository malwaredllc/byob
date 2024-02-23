# High Level View of the Architecture

The 2 major components to this build are obviously the client and the server


<br>
<br>
<br>


**The server:** is found in server.py and is run on your bot master

- The main server loop is found in the C2 object's run function. The C2 can execute commands purely on the control server and about incoming / previously connected sessions. The C2 run loop does not run anything on the bots

- The C2 run loop can trigger the a Session's run loop, which allow the control server to execute commands on the bots. Switching into a session command loop has no visual distinction but is triggered with the command:

        `shell x`

- The C2 run loop pauses when entering a Session's run loop and resumes once the Session run loop exits


<br>
<br>
<br>


**The client:** is build dynamically by the file client.py

- There is no binary or example file in this repo, those must be built


- The generated client payloads are meant to be executed on the bots themselves and can execute malware, import custom python code, import python modules, and execute bash code

- The client listens for commands from a Session's run loop on an open socket, parses them, and executes those commands.
    - These functions can be placed in the payload object itself (in core/payload.py), imported from a custom module, or executed as bash code, if all else fails
    -  If you implement a custom module, place the code in the modules folder and, instead of a main statement, write a function named "run". These files are dynamically executed and this is the formalism for finding the entry point. 
    - All functions should take a single string argument and return a string
        -  The string argument will be the cli parameters (excluding the function name)
        -  The returned string will be printed as user feedback, so make them useful for debugging
