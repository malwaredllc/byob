# Client's (Bot Software's) Architecture

If you would like a description of how the client payloads are built, please look at docs/build/client.md

This file details only the run function of the client object, ie how it recieves messages, how it processes messages, and how it executes malware



## Run Function (of Payload)

Sets up all the urls to download / upload materials (detailed in server arch)

The rest of this is going to be in a while True loop:

1) Checks if the client is in "active mode", if its not then loop until its true

2) Check to verify the connection is still valid (with a 1 second timeout)

    - If its not then delete the connection and exit

3) Get a task from the Session object (via the socket connection)
    
    - Parse this into a dictionary

4) Split the command into the 1st word (called cmd) and the rest of the string (called action)

5) Use the _get_command function to return a pointer to the function we want to execute
    - If the function exists in the payload object (core/payload.py), the return that pointer
    - If the command exists in the global space (ie is a custom module), return a pointer to the run function in that module. The run function is the entry point to every module and is what makes this dynamic programming possible
    - Otherwise, treat it as a bash command and return a function which executes the command and returns the string output of the command

6) The function pointer is executed, passing action in as the only argument
    - **NOTE:** All functions should return strings, as these get printed to the user of the command and control server as feedback or for debugging

7) The result of the function is converted to a string and sent back to the command and control server to be processed by the Session's run loop

8) Loops to 1



