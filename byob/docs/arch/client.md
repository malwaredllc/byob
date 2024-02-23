# Client's (Bot Software's) Architecture

If you would like a description of how the client payloads are built, please look at docs/build/client.md

This file only details the run function of the client object, ie how it recieves messages, how it processes messages, and how it executes malware

<br>
<br>


## Run Function (of Payload)

The function first sets up all the urls to download / upload materials (detailed in server arch)

The rest of this function is in a while True loop:

1) Checks if the client is in "active mode", if its not then loop until it is

2) Verifies that the connection is still valid (with a 1 second timeout)

    - If its not then delete the connection and exit

3) Get a task from the Session object (via the socket connection)
    
    - Parse this into a dictionary

4) Split the value of the key "task" from the task object into the 1st word (called cmd) and the rest of the string (called action)

5) Use the _get_command function to return a pointer to the function we want to execute
    - If the function exists in the payload object (core/payload.py), then return that pointer
    - If cmd exists in the global space (ie is the name of a custom module), return a pointer to the run function of that module. The run function is the entry point to every module and is what makes this dynamic programming possible
    - Otherwise, treat task["task"] as a shell command and return a function which executes the command and returns Standard Out as a string

6) The function pointer is executed, passing action in as the only argument
    - **NOTE:** All functions should return strings. These strings get printed to the user at the command and control server as feedback or for debugging

7) The result of the function is converted to a string and sent back to the command and control server to be processed by the Session's run loop

8) Loops to 1



