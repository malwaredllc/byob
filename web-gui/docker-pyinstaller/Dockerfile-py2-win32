FROM ubuntu:18.04

ENV DEBIAN_FRONTEND noninteractive

ARG WINE_VERSION=winehq-stable
ARG PYTHON_VERSION=2.7.18
# PyInstaller 3.6 is last version to support python2
ARG PYINSTALLER_VERSION=3.6

# we need wine for this all to work, so we'll use the PPA
RUN set -x \
    && dpkg --add-architecture i386 \
    && apt-get update -qy \
    && apt-get install --no-install-recommends -qfy -o APT::Immediate-Configure=false libssl-dev:i386 ca-certificates gpg-agent rename apt-transport-https software-properties-common winbind cabextract wget curl zip unzip xvfb xdotool x11-utils xterm \
    # && wget -nc https://dl.winehq.org/wine-builds/winehq.key \
    # && apt-key add winehq.key \
    # && apt update -qy \
    # && apt-add-repository 'https://dl.winehq.org/wine-builds/ubuntu/' \
    # && apt-get update -qy \
    # && apt-get install --install-recommends -qfy $WINE_VERSION \
    && wget -nv https://download.opensuse.org/repositories/Emulators:/Wine:/Debian/xUbuntu_18.04/Release.key -O Release.key \
    && apt-key add - < Release.key \
    && apt-add-repository 'deb https://download.opensuse.org/repositories/Emulators:/Wine:/Debian/xUbuntu_18.04/ ./' \
    && apt-get update -qy \
    && apt install --install-recommends -qfy $WINE_VERSION \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && wget -nv https://raw.githubusercontent.com/Winetricks/winetricks/master/src/winetricks \
    && chmod +x winetricks \
    && mv winetricks /usr/local/bin

# wine-gecko
RUN mkdir -p /usr/share/wine/gecko
RUN curl -o /usr/share/wine/gecko/wine_gecko-2.47-x86.msi http://dl.winehq.org/wine/wine-gecko/2.47/wine_gecko-2.47-x86.msi

# wine settings
ENV WINEARCH win32
ENV WINEDEBUG fixme-all
ENV WINEPREFIX /wine

### The following didn't work as expected. Left them here for future reference

# ARG DISPLAY=:99
# ENV DISPLAY=${DISPLAY}
# RUN echo "DISPLAY: ${DISPLAY}"

# xvfb settings
ENV DISPLAY :0
RUN set -x \
    && echo 'Xvfb $DISPLAY -screen 0 1024x768x24 &' >> /root/.bashrc
# RUN set -x \
#     && ( Xvfb :0 -screen 0 1024x768x16 & ) \
#     && sleep 5

# windows 10 environment
RUN set -x \
    && winetricks -q win10

# PYPI repository location
ENV PYPI_URL=https://pypi.python.org/
# PYPI index location
ENV PYPI_INDEX_URL=https://pypi.python.org/simple

# install python inside wine
RUN set -x \
    && wget -nv https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION.msi \
    && wine msiexec /qn /i python-$PYTHON_VERSION.msi \
    && rm python-$PYTHON_VERSION.msi \
    && wget -nv https://download.microsoft.com/download/7/9/6/796EF2E4-801B-4FC4-AB28-B59FBF6D907B/VCForPython27.msi \
    && wine msiexec /qn /i VCForPython27.msi \
    && rm VCForPython27.msi \
    && sed -i 's/_windows_cert_stores = .*/_windows_cert_stores = ("ROOT",)/' "/wine/drive_c/Python27/Lib/ssl.py" \
    && echo 'wine '\''C:\Python27\python.exe'\'' "$@"' > /usr/bin/python \
    && echo 'wine '\''C:\Python27\Scripts\easy_install.exe'\'' "$@"' > /usr/bin/easy_install \
    && echo 'wine '\''C:\Python27\Scripts\pip.exe'\'' "$@"' > /usr/bin/pip \
    && echo 'wine '\''C:\Python27\Scripts\pyinstaller.exe'\'' "$@"' > /usr/bin/pyinstaller \
    && chmod +x /usr/bin/* \
    && echo 'assoc .py=PythonScript' | wine cmd \
    && echo 'ftype PythonScript=c:\Python27\python.exe "%1" %*' | wine cmd \
    && while pgrep wineserver >/dev/null; do echo "Waiting for wineserver"; sleep 1; done \
    && rm -rf /tmp/.wine-*

# install pyinstaller
RUN /usr/bin/pip install pyinstaller==$PYINSTALLER_VERSION

# put the src folder inside wine
RUN mkdir /src/ && ln -s /src /wine/drive_c/src
VOLUME /src/
WORKDIR /wine/drive_c/src/
RUN mkdir -p /wine/drive_c/tmp

COPY entrypoint-windows.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
