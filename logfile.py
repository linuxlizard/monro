# Parse a text logfile looking for matching strings
# David Poole davep@mbuf.com 20210518

import re
from enum import Enum

re_exp = re.compile("portStatusHook deltatime=(\d+)")
re_num = re.compile(", (\d+)]")

def read_logfile(infilename):
    # parse /tmp/minicom.cap 
    # search for portStatusHook log lines
    lines = []
    with open(infilename,"rb") as infile:
        # seek to end of file; looking for last chunk of lines in file with our
        # logs containing the timings
        infile.seek(-2048, 2)
        while True:
            line = infile.readline()
            if len(line) == 0:
                # end of file
                break
            if b"portStatusHook" in line:
                lines.append(line.decode("utf8").strip())

    return lines

def parse_logfile_portstatus(infilename, port_numbers):
    # parse logfile looking for my portStatusHook 
    # e.g., 
    # portStatusHook path=['status', 'ethernet', 9]
    # portStatusHook deltatime=486667

    line_list = read_logfile(infilename)
    print(line_list)
    print(port_numbers)

    # this function modifies this list so make a copy of port_numbers
    port_numbers = list(port_numbers)    

    timestamps = {}
    # start at the bottom of list, continue upwards until all port numbers have been found
    line_list.reverse()
    ts = 0
    port = -1
    for line in line_list:
        # look for deltatime first then the path.
        # capture the path to find the port number
        if "deltatime" in line:
            ts = int(line[line.index("=")+1:])
            print(f"ts={ts}")
        elif "path=" in line:
            port = re_num.search(line)
            if not port:
                raise ValueError("Missing port number in line=%r" % line)
            port = int(port.group(1))
            if ts == 0:
                raise ValueError(infilename + " format error")
            
            print(f"port={port} port_numbers={port_numbers}")
            if port != port_numbers[-1]:
                raise ValueError("out of sequence: %d != %d" % (port, port_numbers[-1]))
            port_numbers.pop()
            timestamps[port] = ts
            ts = 0
        else:
            raise ValueError("Bad line: " + line)

        if len(port_numbers) == 0:
            # have found all we need to find
            break
    return timestamps

def main():
    # testing
    port_counters = {0: None, 1: None, 2: None, 3: None, 4: None, 5: None, 6: None, 7: None, 8: None, 9: None}
    port_numbers = list(port_counters.keys())
    timestamps = parse_logfile_portstatus("/tmp/minicom.cap", port_numbers)
    print(f"timestamps={timestamps}")

if __name__ == '__main__':
    main()

