#ifndef URI_HPP
#define URI_HPP

bool parse_simple_uri(const std::string& uri, std::string& path, std::map<std::string, std::string>& url_args);

#endif

