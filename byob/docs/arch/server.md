# Overview

The control server is just a basic prompt loop which takes input from the user, parses it, displays some results, and loops.

The command loop is made more complicated by 1 simple fact: **Not all the commands are executed on the given computer**
    
To run a command on the bots, you need to connect to the bot and then execute the command.

Connecting to the bot invisibly changes the users command loop from the general server command loop (ie the C2 object's run function) to that particular session's command loop (ie the Session object's run function)
   
- This interplay of different command loops, where function code is executed, and where it is stored is most of the complications in this code
    
- Understanding that the C2's run loop executes the Session's run loop, as a normal part of its run process is very key


<br>
<br>
<br>


## The C2 Server (The Main Server Object)

When the control server first boots it does a number of one time operations:

1) Creates a listener on the port specified with --port to handle new bot connections (this value is referred to as "port" going forward)
2) Creates a listener on port + 1 so the bots can remotely download malware, making their footprint less obvious
3) Creates a listener on port + 2 so the bots can remotely download python libraries
4) Creates a listener on port + 3 for the bots to exfiltrate files to
5) Creates a separate thread to listen on port for new connections, accept the connections, create an associated session object, and add these new connections to the list of sessions (C2.sessions)
6) Executes the C2's run function, which contains the terminal and execution loop

<br>

### C2's "run" Function (The Main Control Loop)

The following is contained inside a while True loop and executes as follows:

1) The program waits until the previously executed command stops
    - This program is stored in C2._active, which is a threading.Event and is waited on using the .wait() function
        - These are automatically created, you don't really need to worry about managing these
2) The user prompt is displayed and a command is listened for
3) If the "abort" signal is set, the program exits the loop and quits
    - I'm aware this is out of order, it is simply how the program was written
4) The input string from the user prompt is decomposed into the first word and all following words
    - The first word is referred to as cmd, the rest as action
5) If cmd exists as a key in the C2's self.commands dictionary, check if the value (which is of type dict) has a methods key
    - If it has a methods key, then that value is a function and that function is called
        - If action is not an empty string, it is passed in as a single string argument to the function
        - The method function returns a string, which is subsequently printed to the screen as user feedback
6) If cmd isn't in the commands dictionary, but is "cd", then change C2's current working directory
7) If neither 5 nor 6 is true, assume the command is bash code and execute it in a subprocess


**NOTE:** Connecting to a session is a command in C2's self.commands dictionary. When a new shell is created, the C2 loop runs a function which executes the run function of the session object associated with the connection. This causes the C2 loop to idle until the session exits, and then prints the results.


<br>
<br>
<br>

## The Session Object (The Bot Interface Object)

This object contains "all" the code to execute commands on the bots. 

The main loop is a console which strategically sends messages to and waits on messages from the bots, to hide the difference between code executing locally and on the bots.

Due to the implementation of printing to screen and to prevent code duplication, the Session object frequently accesses the symbol table to retrieve information from and execute member functions of the C2 object. I did not make this design choice, I am simply living with it.

The Session object can execute code on the bots AND on the control server. For a clear reference on which is which, see the help menu of the program (or C2's self.command dictionary)


<br>
<br>


### Session's "run" Function (The Session Control Loop)

The following is one large while True loop, executed in the scope of communicating with a single host

Once this loop exits, control is passed back to the C2 host and its run function is allowed to continue

Steps 3-6 show how a command is executed and what a valid "task" for the Session object looks like


1) Waits for all actively executing functions to exit
    - Also a threading.Event
2) Waits for a response from the bot, if one isn't given the the prompt is spoofed as a response
    - **This is a very important.** The session controller views every object as a response from a bot, regardless of if it actually came from the bot.
    - The message from the bot is a dict and is going to be called a **task** from here on out
3) If the task has a key called "task" with a value of "help", access the C2 controller to get the functionality to print the help menu and print the help menu
4) If the task has a key called "task" with a value of "prompt":
    1) The prompt is printed to screen
    2) The text is taken in from the user and split into the first word (called cmd) and the rest of the string (called action)
        - If the command exists in C2's command member variable and has a method value which is a callable function, then that function is called and the string action is passed in as the only argument
            - This function should return a string which is then printed to screen
        - Otherwise, the entire string is sent to the bot for execution
            - The result is NOT listened for as that happens at the beginning of this loop
5) If the task has a key called "result" then the value of that field is printed to the screen
6) If none of 3-6 executed: 
    - If the abort signal is sent, the program exits
    - If the task is the int zero, then the loop exist
    - Otherwise an error message is printed as the task was malformed

