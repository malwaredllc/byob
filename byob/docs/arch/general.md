# HIGH LEVEL

The 2 major components to this build are obviously the client and the server

**The server:** is found in server.py and is run on your bot master

    - The main server loop is found in the C2 object's run function. The C2 can execute commands purely on the control server and about incoming / previous connected sessions. The C2 run loop does not run anything on the bots

    - The C2 run loop can trigger the a Session's run loop, which allow the control server to execute commands on the bots. Switching into a session command loop has no visual distinction but is triggered with the command:

        `shell x`

    - The C2 run loop is re-entered once the Session run loops exits



**The client:** is build dynamically by the file client.py

    - There is no binary or example file in this repo, those must be built


    - The generated client payloads are meant to be executed on the bots themselves and can execute malware, import custom python code, import python modules, and execute bash code

