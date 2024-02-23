## How To Build and Utilize Custom Modules

All custom modules should live in the modules folder


<br>
<br>
<br>


## Imports
All imports should be listed at the top of the file (dynamic parsing to build payloads can be difficult)

If you use functions from another included module, you should import them using the format:
    `from x import *`

    - The files are all concatenated so these import statements get removed in the final product


<br>
<br>
<br>


## Dynamic Programming Rules

**ALL CODE** (not imports) you write needs to be below a line reading: #main

    - The payload parser uses this to identify code blocks

**ALL MODULES** need a function named "run"

    - This is the entry point to EVERY MODULE and is necessary for dynamic programming. If you implement the function as a member function of the payload object, this formalism isn't necessary

They should take a single argument of a string (or no argumets if no params are needed)

    - You need to parse the string yourself. This is non-negotiable

They should return a string after they execute

    - This string is going to be printed on cmd server as user feedback. Please make it helpful. Returning tracebacks are strongly recommended, as there is no other way to implement error logging on the client's system

