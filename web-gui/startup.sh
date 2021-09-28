#!/bin/sh
echo "WARNING: This script will install docker AND add it as an apt source."
echo ""
echo "If you do not want this, please press ctrl + C to cancel the script."
echo ""
echo "The script will start in 10 seconds."

sleep 10

echo "Running BYOB app setup..."

# Install Python if necessary
which python3 > /dev/null
status=$?

if test $status -ne 0
then
	echo "Installing Python 3.6..."
	apt-get install python3.6 -y

else
	echo "Confirmed Python is installed."
	
	# Installs Pip even if a Python installation is found because some users don't install pip
	
	sudo apt install python3-pip

fi

# Install Docker if necessary
which docker > /dev/null
status=$?

if test $status -ne 0
then
	echo "Installing Docker..."
	chmod +x get-docker.sh
	./get-docker.sh
	sudo usermod -aG docker $USER
	sudo chmod 666 /var/run/docker.sock
	
else
	echo "Confirmed Docker is installed."
	echo "If you run into issues generating a Windows payload, please uninstall docker and rerun this script"
fi

# Install Python packages
echo "Installing Python packages..."
python3 -m pip install CMake==3.18.4
python3 -m pip install -r requirements.txt

# Build Docker images
echo "Building Docker images - this will take a while, please be patient..."
cd docker-pyinstaller
sudo docker build -f Dockerfile-py3-amd64 -t nix-amd64 .
sudo docker build -f Dockerfile-py3-i386 -t nix-i386 .
sudo docker build -f Dockerfile-py3-win32 -t win-x32 .

read -p "To use some Byob features, you must reboot your system. If this is not your first time running this script, please answer no. Reboot now? [Y/n]: " agreeTo
#Reboots system if user answers Yes
case $agreeTo in
    y|Y|yes|Yes|YES)
    echo "Rebooting..."
    sleep 1
    sudo reboot now
    exit
    ;;
#Runs app if user answers No
    n|N|no|No|NO)
    cd ..
    echo "Running C2 server with locally hosted web app GUI...";
    echo "Navigate to http://127.0.0.1:5000 and set up your user to get started.";
    python3 run.py
    exit
    ;;
esac
