#include <iostream>
#include <map>

#include "uri.hpp"

int main(int argc, char *argv[])
{
	for (int i=1 ; i<argc ; i++) {
		std::string path;
		std::map<std::string, std::string> args;
		if (parse_simple_uri(argv[i], path, args)) {

			std::cout << "path=" << path << "\n";
			for (auto k : args) {
				std::cout << k.first << "=" << k.second << "\n";
			}

			args.clear();
		}
		else { 
			std::cerr << "no match\n";
		}
	}

	return 0;
}


