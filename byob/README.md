# BYOB CLI
These instructions help you solve some of the most common problems that may arise during the installation and use of BYOB CLI. However, if something does not work despite everything, before opening an issue try to ask on the [Discord support server](https://discord.gg/M3435KFcWa)!

## How to install
To install BYOB CLI run the _setup.py_ file through your Python installation (Python3 is recommended): `python3 setup.py`. Done, it's that simple! However, there may be problems with your OS environment, and some cases are covered in the following sections.

### Linux
Problems that can occur when installing BYOB in a Unix environment are, for example, missing packages or tools required to build these packages. Of course, you need to install Python3, to run the code, and Pip, to install the packages. Some of these require _CMake_ to be installed, along with other system build tools. The following bash commands do essentially the same thing as the _setup.py_ file but should cover all possible failure scenarios. Suppose we are root users.

```bash
$ git clone https://github.com/malwaredllc/byob.git
$ cd byob/byob/
# First, Python3
$ apt install python3.6 # 3.7, 3.8, 3.9 should also work
# Pip and OpenCV are also required
$ apt install python3-pip python3-opencv 
# Tools to compile some packages like cryptonight and pyrx
$ apt install cmake build-essential python3-dev
# Upgrade Pip and install its tools
$ python3 -m pip install --upgrade pip setuptools wheel
# Finally, install all the requirements
$ python3 -m pip install -r requirements.txt
# Try if everything worked
$ python3 server.py --version
# Should print a float number (0.5, for example)
```

### macOS
macOS belongs to the Unix-BSD family, so there are not many differences from what is covered in the Linux section. Instead of apt, suppose to use [Brew](https://github.com/Homebrew/brew) as package manager.
```bash
$ git clone https://github.com/malwaredllc/byob.git
$ cd byob/byob/
# Update Brew formulas
$ brew update 
# Install latest Python3 version, along with Pip
$ brew install python
# Tools to compile some packages like cryptonight and pyrx
$ brew install cmake
# Upgrade Pip and install its tools
$ python3 -m pip install --upgrade pip setuptools wheel
# Finally, install all the requirements
$ python3 -m pip install -r requirements.txt
# Try if everything worked
$ python3 server.py --version
# Should print a float number (0.5, for example)
```

### Windows
Soon...

## How to use
To use BYOB, you need to setup a __Server__ and generate some __Clients__. The following instructions refer to a scenario where both are running on the same machine.

### Server
Three parameters can be passed to the _server.py_ file:
+ --host: server hostname or IP address (i.e. 127.0.0.1, example.dns.com...);
+ --port: on what port server should listen for incoming connection (i.e. 1337...);
+ --db: custom path to a SQLite database file (i.e. database.db);

If none of these are specified, the server will use default parameters: `python3 server.py`. 

Done, the server is now listening on `0.0.0.0:1337` and uses _database.db_ as DB file.

### Client
The _client.py_ requires three positional arguments, host, port, and modules:
+ host: server host address (hostname or IP address);
+ port: port number where the server is listening;
+ modules: the post-exploitation modules you want the payload to remotely import upon execution (default: all). Specifying only specific modules to import can lower memory footprint.


According to the server that is running on this machine, generate a client with the same parameters: `python3 client.py 127.0.0.1 1337`. This will generate a **dropper**, a **stager**, and a **payload**. Executing any of these to create a connection with the server will work, however, the dropper is just 1 line of code and remotely fetches everything it needs from the server, after the stager does some environment checks. For more detail, check the ["How it works"](https://byob.dev/docs) page on the official website.

For this demo, let's take directly the payload, located in _modules/clients/payloads/_: its filename is shown on screen, and it's something like _byob_xyz.py_. 

To execute: `python3 byob_xyz.py`. The client will connect to the server and... it's done!
