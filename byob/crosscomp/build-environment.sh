#!/usr/bin/env bash

# log output
outfile="build.log"
# these architectures are names as referenced here:
# https://github.com/docker-library/official-images#architectures-other-than-amd64
# example here is for architectures on arm (RasPi, etc)
handled_architectures=$(cat "arch.targets" | grep -v ^# | tr '\n' ' ')
rebuild=false

feed_frame() {
    event_color="\x1B[1;$1m"
    event_icon="$2"
    event_info="${@:3}"
    echo "| |$event_color$event_icon\x1B[0m $event_color$event_info\x1B[0m"
}

feedback() {
    if [ $1 -ne 0 ]; then
        if [ $1 -eq 1 ]; then
            echo -e "$(feed_frame 93 '   !' $2)"
            echo -ne "$(feed_frame 93 '   !' 'Continue? [y/N]:')" && read -p " " choice
            case "$choice" in
                y|Y ) echo -n ;;
                * ) feedback 2 "Exiting";;
            esac
        elif [ $1 -eq 2 ]; then
            echo -e "$(feed_frame 91 ' <' $2)"
            exit 1
        elif [ $1 -eq 1337 ]; then
            echo -e "$(feed_frame 92 '   -' $2)"
        else
            echo -e "$(feed_frame $1 '   !' $2)"
        fi
    else
        echo -e "$(feed_frame 49 ' >' $2)"
    fi
}

fortheimpatient() {
    pid=$1
    status="   ... ${@:2}"
    echo -ne "  |$status\r"
    echo -n "| "
    inset=1
    spinner=(
        '⠋'
        '⠙'
        '⠹'
        '⠸'
        '⠼'
        '⠴'
        '⠦'
        '⠧'
        '⠇'
        '⠏'
    )
    while kill -0 $pid 2> /dev/null; do
        for state in ${spinner[@]}; do
            echo -ne "\b$state"
            sleep 0.05
        done
    done
    wait $pid
    retc=$?
    bkset=0
    bkspc=""
    while [ $bkset -le $inset ]; do
        bkspc="$bkspc\b"
        bkset=$((bkset + 1))
    done
    echo -ne "$bkspc"
    if [ $retc -ne 0 ]; then feedback 2 "$2 failed with errorcode: $retc -/- Check build.log for details."; fi
}

prechecks() {
    feedback 0 "Running pre-checks"
    if ! [ -f /etc/lsb-release ]; then feedback 2 "Cross-compilation only tested on Debian at this time. (lsb-release missing)"; fi
    if ! [ `whoami` == "root" ]; then feedback 2 "Run as root or with sudo for package installs."; fi
    if ! nslookup github.com 2>&1 >/dev/null; then feedback 2 "Check your internet connection, and DNS conf."; fi
    if [ "$handled_architectures" == "" ]; then feedback 2 "The arch.targets file must be present and contain at least one architecture."; fi
    if ! [ -f ../server.py -a -f ../client.py ]; then feedback 2 "Must run from within crosscomp directory in base byob folder."; fi
    for arg in "$@"; do
        if [ "$arg" == "--rebuild" ]; then 
            feedback 93 "REBUILD ENABLED: Removing previous docker BYOB containers in 3 seconds..."
            sleep 5
            rebuild=true
        fi
    done
    feedback 1337 "Passed all pre-checks"
    base_setup
}

base_setup() {
    base_pkg="git python python-pip python-virtualenv zlib1g-dev"
    echo "===========================" >> $outfile
    echo "STARTING INSTALL AT $(date)" >> $outfile
    feedback 0 "Updating system packages"
    apt-get update 2>&1 >> $outfile &
    fortheimpatient $! "Updating packages"
    feedback 1337 "Updating system packages completed"
    feedback 0 "Installing base requirements"
    for pkg in $base_pkg; do
        if ! dpkg -s $pkg 2> /dev/null 1>/dev/null; then
            apt-get install -y $pkg 2>&1 >> $outfile &
            fortheimpatient $! "Installing $pkg"
            feedback 1337 "Installed $pkg successfully"
        fi
    done
    feedback 1337 "Installing base requirements completed"
    venv_setup
}

venv_setup() {
    feedback 0 "Initializing virtual environment"
    virtualenv pyvenv 2>&1 >> $outfile &
    fortheimpatient $! "initializing"
    feedback 1337 "Virtual environment initialized"
    cd pyvenv
    . bin/activate
    python -m pip install -r ../../requirements.txt 2> $outfile >> $outfile &
    fortheimpatient $! "Updating venv packages"
    deactivate
    cd ../
    feedback 1337 "Virtual environment packages updated"
    # some things break on other architectures
    cat ../requirements.txt | egrep -v '^opencv' > pl_requirements.txt
    feedback 1337 "Installing virtual environment complete"
    lab_setup
}

lab_setup() {
    lab_pkg="docker.io qemu qemu-user-static qemu-user binfmt-support"
    feedback 0 "Installing compilation requirements"
    for pkg in $lab_pkg; do
        if ! dpkg -s $pkg 2> /dev/null 1>/dev/null; then
            apt-get install -y $pkg 2>&1 >> $outfile &
            fortheimpatient $! "Installing $pkg"
            feedback 1337 "Installed $pkg successfully"
        fi
    done
    docker run --rm --privileged multiarch/qemu-user-static:register 2> $outfile >> $outfile
    feedback 1337 "Setup docker qemu registers successfully"
    feedback 1337 "Installing compilation requirements completed"
    make_containers
}

make_containers() {
    cwd=$(pwd)
    project=$(echo $cwd | sed 's/\/crosscomp$//')
    nixreqs=$(cat pl_requirements.txt | base64 -w 0)

    feedback 0 "Setting up cross-compilation containers (may take a while)"
    if ! [ -d ./build ]; then mkdir build; fi
    for xc_dockimg in $handled_architectures; do
        makeloader=true
        xc_arch_str=$(echo $xc_dockimg | tr '/' '-')
        xc_arch=$(echo $xc_dockimg | cut -d '/' -f 1)
        # check limited support
        map_binfmt=""
        for s_arch in `cat arch.supported`; do
            sa=$(echo $s_arch | cut -d ';' -f 1)
            if [ "$xc_dockimg" == "$sa" ]; then
                map_binfmt=$(echo $s_arch | cut -d ';' -f 2)
            fi
        done
        docker image ls | grep "$xc_dockimg" | grep "BYOB" 2> /dev/null 1> /dev/null
        rcCheck=$?
        if [ $rcCheck -eq 0 -a $rebuild == false ]; then
            feedback 1337 "Setup $xc_arch previously, skipping [use --rebuild to override]"
        elif [ "$map_binfmt" != "" ]; then
            archoutfile="$xc_arch_str.$outfile"
            if [ $rebuild ]; then
                cid=$(docker image ls | grep "$xc_dockimg" | grep "BYOB" | awk '{print $3}')
                docker image rm -f $cid 2> $archoutfile >> $archoutfile
            fi
            cp $map_binfmt ./build/
            str_binfmt=$(echo $map_binfmt | egrep -o 'qemu-.*-static$')
            cat << EOF > "./build/$xc_arch_str.Dockerfile"
FROM $xc_dockimg
COPY $str_binfmt $map_binfmt
CMD ls ./ /usr/bin
RUN /usr/bin/apt-get update
RUN /usr/bin/apt-get install -y python python-pip zlib1g-dev
RUN mkdir /byob
RUN echo $nixreqs | base64 -d > /byob/build_requirements.txt
WORKDIR /byob
RUN pip install -r build_requirements.txt
EOF
            docker build -t "$xc_dockimg:BYOB" -f "./build/$xc_arch_str.Dockerfile" ./build 2> $archoutfile >> $archoutfile &
            while pgrep docker 2>&1 > /dev/null; do if ps aux | grep "docker" | grep "build" 2> /dev/null 1> /dev/null; then sleep 1; else break; fi; done &
            fortheimpatient $! "Setup $xc_dockimg"
            docker image ls "$xc_dockimg:BYOB" | grep BYOB
            rcCheck=$?
            if [ $rcCheck -eq 0 ]; then
                feedback 1337 "Setup $xc_dockimg successfully"
            else
                feedback 2 "Setup $xc_dockimg failed. Missing dependency or qemu binfmt map issue."
            fi
        else
            makeloader=false
            feedback 93 "Architecture $xc_dockimg is not in the supported list."
        fi
        if $makeloader; then
            cat << EOF > "compile_$xc_arch_str.sh"
#!/usr/bin/env bash
if [ "\$1" == "" -o "\$2" == "" ]; then echo "Must include at least host and port, example:"; echo "    sudo compile_<architecture>.sh name.example.com 80 [executable_name]"; exit 1; fi
si_host="\$1"
si_port="\$2"
bin_target="\$3"
if [ "\$bin_target" == "" ]; then bin_target=\$(date +%s); fi
docker run -it --rm -v $project:/byob $xc_dockimg:BYOB /bin/bash -c "cd /byob; python client.py --freeze --name \${bin_target}.${xc_arch} \$si_host \$si_port; rm -f ./\${bin_target}*;"
EOF
        chmod u+x "compile_$xc_arch_str.sh"
        fi
    done
    feedback 1337 "Setting up cross-compilation containers completed"

    finalize
}

finalize() {
    echo "ENDING INSTALL AT $(date)" >> $outfile
    echo "===========================" >> $outfile
}

prechecks $@
