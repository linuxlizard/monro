#include <iostream>
#include <regex>
//#include <boost/assert.hpp>

#include "uri.hpp"

bool parse_simple_uri(const std::string& uri, std::string& path, std::map<std::string, std::string>& url_args)
{
	std::smatch what;
	std::regex suri_regex { R"(^(/[a-z/_]+)(\?[a-z]+=[a-zA-Z0-9._]+(&[a-z]+=[a-zA-Z0-9._]+)*)?$)", std::regex::extended };

	if ( !std::regex_match(uri, what, suri_regex)) {
//		std::cerr << "no match\n";
		return false;
	}

	// already verified proper format so let's take a short cut to do dig out
	// each arg by using [?&]
	std::regex args_regex { R"([?&][a-z]+=[a-zA-Z0-9._]+)",
		std::regex::extended };

	auto args_begin = std::sregex_iterator(uri.begin(), uri.end(), args_regex);
	const std::sregex_iterator args_end;

	for ( ; args_begin != args_end ; ++args_begin) {
		const std::string s = args_begin->str();
		int pos = s.find('=');
		std::string key = s.substr(1,pos-1);
		std::string value = s.substr(pos+1);
		url_args[key] = value;
	}

	path = what[1];

#if 0
	for (auto cap : what) {
		std::cout << "group=" << cap << "\n";
		if (cap.matched) {
//			std::cout << cap.first << " " << cap.second << "\n";
			std::cout << cap.length() << "\n";
			for (auto iter=cap.first ; iter < cap.second ; iter++ ) {
//				std::cout << "\t" << *iter << "\n";
			}

		}
	}
#endif

	return true;
}

