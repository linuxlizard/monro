# Simple tornado/bootstrap web app to read/watch/poll/study a Cradlepoint router.
#
# David Poole 
# davep@mbuf.com 20210519

import time

import numpy as np
import tornado.ioloop
import tornado.web

from cpnetem import webapi
import logfile

hostname = "172.16.253.1"

class EthernetPortStatistics:
    # capture the deltatime in reading the port status
    def __init__(self, port_number):
        self.port = port_number
        self.last = 0
        # note will grow without bound but this little program is only intended
        # to run for a short time anyway
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

# dict of of /status/ethernet sampling
# key: hostanme
# value: EthernetDeviceMeasure
# TODO make async/thread safe
ethernet_stats = {}

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")

class RouterHandler(tornado.web.RequestHandler):
    def get_conn(self):
        router = self.get_argument("router", default=hostname)
        port = self.get_argument("port", default="80")
        conn = webapi.WebAPI(hostname=router, scheme="http", port=port, verify=False)
        return conn

class ProductInfoHandler(RouterHandler):
    def get(self):
        conn = self.get_conn()
        product_info = conn.get("/api/status/product_info")
        print(product_info)
        self.render("product_info.html", 
            product_info = product_info )

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
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
