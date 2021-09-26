import sys
import csv
import functools

csv_filename = "oui.csv"

def read_csv(infilename):
    with open(infilename, "r") as infile:
        reader = csv.reader(infile)

        # skip the first line which should be the header
        header = next( reader)
        if header[0] != "Registry":
            raise ValueError("Invalid OUI CSV file \"%s\"" % infilename)

        yield from reader

@functools.lru_cache(maxsize=256)
def find(oui):
    reader = read_csv(csv_filename)

    for row in reader:
        if row[1] == oui:
            return row
    return None

def parse(macaddr):
    # search a macaddr for the OUI
    # handle : or - or nothing as separators

    # strip quotes so can be compatible with json input
    macaddr = macaddr.replace('"','').replace("'","").upper()
    
    if ":" in macaddr:
        macaddr = macaddr.replace(":","")
    elif "-" in macaddr:
        macaddr = macaddr.replace("-","")

    # TODO un-do private macaddr

    return macaddr[0:6]

def main():
    for macaddr in sys.argv[1:]:
        oui = parse(macaddr)
        info = find(oui)
        if not info:
            print("mac=\"%s\" unknown" % macaddr)
        else:
            print(info[2:])
    
if __name__ == '__main__':
    main()
