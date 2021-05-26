# Simple tornado/bootstrap web app to read/watch/poll/study a Cradlepoint router.
#
# David Poole 
# davep@mbuf.com 20210519

import os
import time
import threading
import collections

import numpy as np
import tornado.ioloop
import tornado.web
import tornado.httpclient

from cpnetem import webapi
import logfile

hostname = "172.16.253.1"

class EthernetPortStatistics:
    # capture the deltatime in reading the port status
    def __init__(self, port_number):
        self.port = port_number
        self.last = 0
        # XXX note will grow without bound but this little program is only
        # intended to run for a short time anyway
        self.samples = []

    def update(self, n):
        self.last = n
        self.samples.append(n)
        print(f"port={self.port} last={self.last} samples={self.samples}")

    def stats(self):
        ndata = np.asarray(self.samples)
        return { "last": self.last,
                "min": ndata.min(),
                "max" : ndata.max(),
                "mean" : ndata.mean(),
                "median" : np.median(ndata),
                "std" : ndata.std() }

class EthernetDeviceMeasure:
    def __init__(self, hostname, ports_number_list):
        self.hostname = hostname
        self.ports = ports_number_list
        self.port_stats = { k:EthernetPortStatistics(k) for k in ports_number_list }
        print(f"ports_number_list={ports_number_list} self.port_stats={self.port_stats}")

    def update(self, port_stats):
        # port_stats is a dict
        #   key: port number
        #   value: new deltatime sample
        print(f"update hostname={self.hostname} ports={self.ports} new={port_stats}")
        for p in port_stats:
            print(f"update p={p}")
            self.port_stats[p['port']].update(p['deltatime'])

    @property
    def stats(self):
        return { k:self.port_stats[k].stats() for k in self.ports }


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
# value: EthernetDeviceMeasure
# TODO make async/thread safe
ethernet_stats = {}

# thread poll on /status/lan/stats
lan_stats_thread = None

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")

class ClientHandler(tornado.web.RequestHandler):
    async def get(self):
        print("ClientHandler get")
        http = tornado.httpclient.AsyncHTTPClient()
        response = await http.fetch("http://172.16.253.1/api/status/wlan", 
                                    auth_username="admin", 
                                    auth_password=os.getenv("CP_PASSWORD"))
        json = tornado.escape.json_decode(response.body)
        print(f"json={json}")
#        self.write("Fetched " + str(len(json["entries"])) + " entries "
#                   "from the FriendFeed API")
        self.write("Hello, world")
        
class RouterHandler(tornado.web.RequestHandler):
    def get_args(self):
        router = self.get_argument("router", default=hostname)
        port = self.get_argument("port", default="80")
        return "%s:%s" % (router, port)

    def get_conn(self):
        router = self.get_argument("router", default=hostname)
        port = self.get_argument("port", default="80")
        conn = webapi.WebAPI(hostname=router, scheme="http", port=port, verify=False)
        return conn

class ProductInfoHandler(RouterHandler):
    async def get(self):
#        conn = self.get_conn()
#        product_info = conn.get("/api/status/product_info")
#        print(product_info)
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

class APILanHandler(RouterHandler):
    def get(self):
        self.set_header("Content-Type", "text/csv")
        self.write(lan_stats_thread.get_csv())

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

class StatusEthernetHandler(RouterHandler):
    def get(self):
        conn = self.get_conn()

        # who are we talking to?
        product_info = conn.get("/api/status/product_info")
        print(f"product={product_info}")

        # get the port status
        status = conn.get("/api/status/ethernet")
        print(f"status={status}")
        port_numbers = [ d["port"] for d in status ]
        print(f"port_numbers={port_numbers}")

        # now get the timestamps
        deltatimes = conn.get("/api/status/event/ethernet")
        
        print(f"deltatimes={deltatimes}")
        if hostname not in ethernet_stats:
            ethernet_stats[hostname] = EthernetDeviceMeasure(hostname, port_numbers)
        ethernet_stats[hostname].update(deltatimes)

        print(f"stats={ethernet_stats[hostname].stats}")
        self.render("ethernet.html", product_info=product_info, ports=status, stats=ethernet_stats[hostname].stats )

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/product_info", ProductInfoHandler),
        (r"/ethernet", StatusEthernetHandler),
        (r"/client", ClientHandler),
        (r"/lan", LanHandler),
        (r"/api/lan", APILanHandler),
#        (r"/lan.js", tornado.web.StaticFileHandler, {"path":"."} ),
        ],
        debug=True,
        static_path="./js",
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

    init_lan_status_thread()

    tornado.ioloop.IOLoop.current().start()

# vim: ts=4:sts=4:et
