# Simple tornado/bootstrap web app to read/watch/poll/study a Cradlepoint router.
#
# David Poole 
# davep@mbuf.com 20210519

import os
import time
import json
import threading
import collections
from urllib.parse import urlparse

import numpy as np
import tornado.ioloop
import tornado.web
import tornado.httpclient

import logfile

#hostname = "172.16.253.1"

class StatusEthernetPort:
    # capture the deltatime in reading the port status
    def __init__(self, port_number, maxlen=256):
        self.port = port_number

        # last value of /status/ethernet/[port_number]
        self.last = {}

        # array of dict of values from /status/ethernet/[port_number]
        self.samples = collections.deque(maxlen=maxlen)

    def update(self, port_dict, timestamp):
        self.last = dict(port_dict)
        self.last["timestamp"] = timestamp
        self.samples.append(self.last)
        print(f"port={self.port} last={self.last}")

#    def stats(self):
#        ndata = np.asarray(self.samples)
#        return { "last": self.last,
#                "min": ndata.min(),
#                "max" : ndata.max(),
#                "mean" : ndata.mean(),
#                "median" : np.median(ndata),
#                "std" : ndata.std() }

class StatusEthernet:
    # measuring /status/ethernet across time
    def __init__(self, hostname, ports_number_list):
        self.hostname = hostname
        self.ports = ports_number_list
        self.port_stats = { k:StatusEthernetPort(k) for k in ports_number_list }
        print(f"ports_number_list={ports_number_list} self.port_stats={self.port_stats}")

    def update(self, port_stats):
        # port_stats is a dict
        #   key: port number
        #   value: new deltatime sample
        print(f"update hostname={self.hostname} ports={self.ports} new={port_stats}")
        timestamp = time.time()
        for p in port_stats:
            print(f"update p={p}")
            self.port_stats[p['port']].update(p, timestamp)

    def get_csv(self):

        # XXX this is an abbreviated set of stats
        # build the CSV header 
        csv_header_str = "timestamp,port,link,link_speed,poe_voltage,poe_current"

#        iters = [iter(p) for p in self.port_stats)]



class LANStatusThread(threading.Thread):
    def __init__(self, stats_dict, maxlen=256):
        super().__init__(name="LANStatus")

        self.stats = collections.deque(maxlen=maxlen)

        self.statslock = threading.Lock()
        self.quit = threading.Event()

        # stats_dict is a dict from /status/lan/stats
        # save initial sample
        self.update(stats_dict)

        # build the CSV header safe (safe to do it now because the names don't
        # change @ run-time)
        self.csv_header_str = ",".join(self.stats[0].keys()) + "\n"

    def run(self):
        while not self.quit.is_set():
            # TODO obviously need better way to get the URL
            url = "172.16.22.1:80" 
            http = tornado.httpclient.HTTPClient()
            response = http.fetch(f"http://{url}/api/status/lan/stats", 
                                        auth_username="admin", 
                                        auth_password=os.getenv("CP_PASSWORD"))
            json = tornado.escape.json_decode(response.body)
            stats = json['data']
            print(f"lanstats stats={stats}")
            self.update(stats)
            time.sleep(5)

    def stop(self):
        # WARNING! will be called outside thread context
        self.quit.set()
        self.wait()

    def get_csv(self):
        # WARNING will be called outside thread context

        # build an array of arrays of stats
        csv_str = self.csv_header_str

        with self.statslock:
            stats_iter = iter(self.stats)
            for stats_dict in stats_iter:
                csv_str += ",".join([str(n) for n in stats_dict.values()]) + "\n"

        return csv_str

    def update(self, stats_dict):
        ts = time.time()
        d = dict(stats_dict)
        d["timestamp"] = time.time()

        with self.statslock:
            self.stats.append(d)


# dict of /status/ethernet sampling
# key: hostname
# value: StatusEthernet
# TODO make async/thread safe
ethernet_stats = {}

# thread poll on /status/lan/stats
lan_stats_thread = None

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")

class RouterHandler(tornado.web.RequestHandler):
    def get_args(self):
        router = self.get_argument("router")
        port = self.get_argument("port", default="80")
        return "%s:%s" % (router, port)

    async def http_get(self, url):
        http = tornado.httpclient.AsyncHTTPClient()
        try:
            response = await http.fetch(url, 
                                        auth_username="admin", 
                                        auth_password=os.getenv("CP_PASSWORD"))
        except tornado.httpclient.HTTPClientError as err:
            print(f"{dir(err)}")
            print(f"err={err} {err.code} {err.message}")
            header = {
                "title" : "Error %d" % err.code,
                "description" : "Error" }
            error = { 
                "code": err.code,
                "message": err.message }
            self.render("error.html", header=header, error=error)
            return

        json = tornado.escape.json_decode(response.body)
        return json['data']

    async def http_get_csv(self, url):
        http = tornado.httpclient.AsyncHTTPClient()
        response = await http.fetch(url, 
                                    auth_username="admin", 
                                    auth_password=os.getenv("CP_PASSWORD"))
        return response.body

class ProductInfoHandler(RouterHandler):
    async def get(self):
        url = self.get_args()
        http = tornado.httpclient.AsyncHTTPClient()
        response = await http.fetch(f"http://{url}/api/status/product_info", 
                                    auth_username="admin", 
                                    auth_password=os.getenv("CP_PASSWORD"))
        json = tornado.escape.json_decode(response.body)
        print(f"json={json}")
        product_info = json['data']
        self.render("product_info.html", 
            product_info = product_info )

class API_EthernetHandler(RouterHandler):
    async def get(self):
        self.set_header("Content-Type", "text/json")

        url = self.get_args()
        ethernet_stats = await self.http_get(f"http://{url}/api/status/ethernet")
        
        s = json.dumps(ethernet_stats)
        print(f"ethernet_stats={ethernet_stats}")
        self.write(s)

class API_LanHandler(RouterHandler):
    def get(self):
        self.set_header("Content-Type", "text/csv")
        self.write(lan_stats_thread.get_csv())

class API_APStatsHandler(RouterHandler):
    async def get(self):
        self.set_header("Content-Type", "text/csv")

        url = self.get_args()
        try:
            apstats = await self.http_get_csv(f"http://{url}/api/wlan/analytics/apstats")
        except tornado.httpclient.HTTPClientError as err:
            header = {
                "title" : "Error",
                "description" : "Error" }
            self.render("error.html", header=header)
            return

        print(f"apstats={apstats} {type(apstats)}")
        if type(apstats)==type({}) and "success" in apstats and not apstats["success"]:
            # something went wrong
            self.render("error.html")
            return

        self.write(apstats)

class API_StatusTreeHandler(RouterHandler):
    async def get(self, path):
        self.set_header("Content-Type", "text/json")

        # TODO error checking
        url = self.get_args()

        print(f"uri={self.request.uri}")
        print(f"path={self.request.path}")
        print(f"path={path}")

        status = await self.http_get_csv(f"http://{url}/api/status/{path}")

        self.write(status)

class LanHandler(RouterHandler):
    async def get(self):
        url = self.get_args()
        http = tornado.httpclient.AsyncHTTPClient()
        response = await http.fetch(f"http://{url}/api/status/lan/stats", 
                                    auth_username="admin", 
                                    auth_password=os.getenv("CP_PASSWORD"))
        json = tornado.escape.json_decode(response.body)
        stats = json['data']
        print(f"stats={stats}")
        self.render("lan.html", stats=stats)

class WiFiHandler(RouterHandler):
    async def get(self):
        url = self.get_args()

        http = tornado.httpclient.AsyncHTTPClient()
        try:
            response = await http.fetch(f"http://{url}/api/status/wlan/analytics", 
                                        auth_username="admin", 
                                        auth_password=os.getenv("CP_PASSWORD"))
        except tornado.httpclient.HTTPClientError as err:
            print(f"{dir(err)}")
            print(f"err={err} {err.code} {err.message}")
            header = {
                "title" : "Error %d" % err.code,
                "description" : "Error" }
            error = { 
                "code": err.code,
                "message": err.message }
            self.render("error.html", header=header, error=error)
            return

        json = tornado.escape.json_decode(response.body)
        analytics = json['data']
        timestamp = time.ctime(json['data']['timestamp'])

        for radio in analytics['radio']:
            radio['client_count'] = 0 
            for bss in radio['bss']:
                radio['client_count'] = radio['client_count'] + len(bss['clients'])

        header = {
            "title" : "WiFi Stats",
            "description" : "Router WiFi" }

        self.render("wifi.html", header=header, timestamp=timestamp, analytics=analytics)

class BSSHandler(RouterHandler):
    async def get(self):
        url = self.get_args()

        # TODO error checking
        bssid = self.get_argument("bssid")
        radio_name = self.get_argument("radio")

        analytics = await self.http_get(f"http://{url}/api/status/wlan/analytics" )

        # convert timestamp to happy human value
        timestamp = time.ctime(analytics['timestamp'])

        for radio in analytics['radio']:
            if radio['name'] == radio_name:
                break
        else:
            raise ValueError(radio_name)

        for bss in radio['bss']:
            if bss['bssid'] == bssid:
                break
        else:
            raise ValueError(bssid)

        urlfields = urlparse(self.request.uri)
        print(f"query={urlfields.query}")

        header = {
            "title" : "WiFi BSS Stats",
            "description" : "Router WiFi" }

        self.render("bss.html", header=header, timestamp=timestamp, bss=bss)

class ClientHandler(RouterHandler):
    async def get(self):
        url = self.get_args()

        # TODO error checking
        bssid = self.get_argument("bssid")
        radio_name = self.get_argument("radio")
        macaddr = self.get_argument("macaddr")

        print(f"ClientHandler get {radio_name} {bssid} {macaddr}")
        analytics = await self.http_get(f"http://{url}/api/status/wlan/analytics" )

        # convert timestamp to happy human value
        timestamp = time.ctime(analytics['timestamp'])

        print(f"analytics={analytics}")

        client_radio = [ radio for radio in analytics['radio'] for bss in radio['bss'] for client in bss['clients'] 
            if radio['name'] == radio_name and bss['bssid'] == bssid and client['macaddr'] == macaddr ]

        print(f"radio={client_radio}")

        client = client_radio[0]['bss'][0]['clients'][0]
        print(f"client={client}")

        header = {
            "title" : "WiFi Client Stats",
            "description" : "Router WiFi" }

        self.render("client.html", header=header, timestamp=timestamp, client=client)
        
class APStatsHandler(RouterHandler):
    async def get(self):
        url = self.get_args()
        http = tornado.httpclient.AsyncHTTPClient()
        try:
            response = await http.fetch(f"http://{url}/api/wlan/analytics/apstats", 
                                        auth_username="admin", 
                                        auth_password=os.getenv("CP_PASSWORD"))
        except tornado.httpclient.HTTPClientError as err:
            print(f"{dir(err)}")
            print(f"err={err} {err.code} {err.message}")
            header = {
                "title" : "Error %d" % err.code,
                "description" : "Error" }
            error = { 
                "code": err.code,
                "message": err.message }
            self.render("error.html", header=header, error=error)
            return

#        json = tornado.escape.json_decode(response.body)
#        stats = json['data']
        stats = {}
        print(f"stats={stats}")
        header = {
            "title" : "AP Stats",
            "description" : "WiFi Top Level Statistics" }

        self.render("apstats.html", header=header, stats=stats)

class StatusEthernetHandler(RouterHandler):
    # https://stackoverflow.com/questions/35254742/tornado-server-enable-cors-requests#35259440
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")

    async def get(self):
        url = self.get_args()

        # what router are we talking to?
        product_info = await self.http_get(f"http://{url}/api/status/product_info")

        # get the port status
        status = await self.http_get(f"http://{url}/api/status/ethernet")
        print(f"status={status}")

        port_numbers = [ d["port"] for d in status ]
        print(f"port_numbers={port_numbers}")

        # now get the timestamps
#        deltatimes = await self.http_get(f"http://{url}/api/status/event/ethernet")
#        print(f"deltatimes={deltatimes}")

        hostname = self.get_argument("router")

        # if we haven't seen this hostname before, add it to our global dict
        if hostname not in ethernet_stats:
            ethernet_stats[hostname] = StatusEthernet(hostname, port_numbers)
        ethernet_stats[hostname].update(status)

        self.render("ethernet.html", product_info=product_info, ports=status)

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/product_info", ProductInfoHandler),
        (r"/ethernet", StatusEthernetHandler),
        (r"/client", ClientHandler),
        (r"/lan", LanHandler),
        (r"/apstats", APStatsHandler),
        (r"/wifi", WiFiHandler),
        (r"/bss", BSSHandler),
        (r"/api/lan", API_LanHandler),
        (r"/api/ethernet", API_EthernetHandler),
        (r"/api/apstats", API_APStatsHandler),
        (r"/api/status/(.*)", API_StatusTreeHandler),
        (r"/css/(.*)", tornado.web.StaticFileHandler, {"path":"css"} ),
        (r"/js/(.*)", tornado.web.StaticFileHandler, {"path":"js"} ),
        ],
        debug=True,
#        static_path="./js",
    )

def init_lan_status_thread():
    global lan_stats_thread
    url = "172.16.22.1:80" 
    http = tornado.httpclient.HTTPClient()
    response = http.fetch(f"http://{url}/api/status/lan/stats", 
                                auth_username="admin", 
                                auth_password=os.getenv("CP_PASSWORD"))
    json = tornado.escape.json_decode(response.body)
    stats = json['data']
    print(f"lanstats stats={stats}")
    lan_stats_thread = LANStatusThread(stats)
    lan_stats_thread.start()

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)

#    init_lan_status_thread()

    tornado.ioloop.IOLoop.current().start()

# vim: ts=4:sts=4:et
