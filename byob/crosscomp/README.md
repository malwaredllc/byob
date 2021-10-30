## Introduction

The crosscomp or cross-compile module was crafted to enable the generation of payloads across multiple architectures at the same time, making creation of standalone executables for testing disparate systems easier to accomplish.

## Requirements

This script was generated to be run on Debian systems. (Plans to add RHEL later.)

Core requirements are Docker, QEMU, and Python; more granular items are within the build-environment script.

## Operating

### Notes
* 'cd' into the crosscomp folder (this file should be in there)
* Check the arch.targets file, and remove any target architectures you don't care about.
    * Add ones you do.
        * Limitation: Script doesn't account for Windows at this time. Could be pretty easily ported later.
    * The default architectures in arch.supported are the only ones I've tested, but so long as qemu has a static architecture file and docker has an image for it, then you should be able to map the architecture to the proper qemu binary. Match my syntax for ease.
    * If you're wondering how the qemu-$arch-static and docker containers function, or if you would like to extend supported functionality;
      * See https://ownyourbits.com/2018/06/13/transparently-running-binaries-from-any-architecture-in-linux-with-qemu-and-binfmt_misc/
      * And https://github.com/docker-library/official-images#architectures-other-than-amd64

### Steps
*Note: the build_environment.sh script is in progress for python3 support. Any help would be appreciated.*
1. Run the build-environment.sh script with sudo or as root.
    * This will probably take a while.
    * The script will install dependencies, then check and build necessary docker containers
2. After the script is finished, you will have a number of compile_* scripts matching arch.targets
3. Run the compile_$arch scripts with sudo;
    * `"sudo bash compile_$arch $byob_ip $byob_port $filename"`
    * These scripts mount the byob directory to run `client.py --freeze` against your target architecture with supplied arguments
4. Upon completion of freeze, your standalone binary will be dropped into 
    * `"$byob_home/dist/$filename.$arch"`
