# PyInstaller Docker Images

**cdrx/pyinstaller-linux** and **cdrx/pyinstaller-windows** are a pair of Docker containers to ease compiling Python applications to binaries / exe files.

Current PyInstaller version used: 3.6.

## Tags

`cdrx/pyinstaller-linux` and `cdrx/pyinstaller-windows` both have two tags, `:python2` and `:python3` which you can use depending on the requirements of your project. `:latest` points to `:python3`

The `:python2` tags run Python 2.7.

The `:python3` tag runs Python 3.7.

## Usage

There are two containers, one for Linux and one for Windows builds. The Windows builder runs Wine inside Ubuntu to emulate Windows in Docker.

To build your application, you need to mount your source code into the `/src/` volume.

The source code directory should have your `.spec` file that PyInstaller generates. If you don't have one, you'll need to run PyInstaller once locally to generate it.

If the `src` folder has a `requirements.txt` file, the packages will be installed into the environment before PyInstaller runs.

For example, in the folder that has your source code, `.spec` file and `requirements.txt`:

```
docker run -v "$(pwd):/src/" cdrx/pyinstaller-windows
```

will build your PyInstaller project into `dist/windows/`. The `.exe` file will have the same name as your `.spec` file.

```
docker run -v "$(pwd):/src/" cdrx/pyinstaller-linux
```

will build your PyInstaller project into `dist/linux/`. The binary will have the same name as your `.spec` file.

##### How do I install system libraries or dependencies that my Python packages need?

You'll need to supply a custom command to Docker to install system pacakges. Something like:

```
docker run -v "$(pwd):/src/" --entrypoint /bin/sh cdrx/pyinstaller-linux -c "apt-get update -y && apt-get install -y wget && /entrypoint.sh"
```

Replace `wget` with the dependencies / package(s) you need to install.

##### How do I generate a .spec file?

`docker run -v "$(pwd):/src/" cdrx/pyinstaller-linux "pyinstaller your-script.py"`

will generate a `spec` file for `your-script.py` in your current working directory. See the PyInstaller docs for more information.

##### How do I change the PyInstaller version used?

Add `pyinstaller=3.1.1` to your `requirements.txt`.

##### Is it possible to use a package mirror?

Yes, by supplying the `PYPI_URL` and `PYPI_INDEX_URL` environment variables that point to your PyPi mirror.

## Known Issues

None

## History

#### [1.0] - 2016-08-26
First release, works.

#### [1.1] - 2016-12-13
Added Python 3.4 on Windows, thanks to @bmustiata

#### [1.2] - 2016-12-13
Added Python 3.5 on Windows, thanks (again) to @bmustiata

#### [1.3] - 2017-01-23
Upgraded PyInstaller to version 3.2.1.
Thanks to @bmustiata for contributing:
 - Custom PyPi URLs
 - No longer need to supply a requirements.txt file if your project doesn't need it
 - PyInstaller can be called directly, for e.g to generate a spec file

#### [1.4] - 2017-01-26
Fixed bug with concatenated commands in entrypoint arguments, thanks to @alph4

#### [1.5] - 2017-09-29
Changed the default PyInstaller version to 3.3

#### [1.6] - 2017-11-06
Added Python 3.6 on Windows, thanks to @jameshilliard

#### [1.7] - 2018-10-02
Bumped Python version to 3.6 on Linux, thank you @itouch5000

#### [1.8] - 2019-01-15
Build using an older version of glibc to improve compatibility, thank you @itouch5000
Updated PyInstaller to version 3.4

#### [1.9] - 2020-01-14
Added a 32bit package, thank you @danielguardicore
Updated PyInstaller to version 3.6


## License

MIT
