#ifndef CLIENT_H
#define CLIENT_H

#include <exception>

#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>

namespace beast = boost::beast;         // from <boost/beast.hpp>
namespace http = beast::http;           // from <boost/beast/http.hpp>

// https://www.boost.org/community/error_handling.html
struct NoPasswordException : std::runtime_error
{
	NoPasswordException() : std::runtime_error("Missing Password") { } 
};

struct TransactionFailedException : std::runtime_error
{
	TransactionFailedException() : std::runtime_error("api call failed") { }
	TransactionFailedException(const char* errmsg) : std::runtime_error(errmsg) { }
};

http::response<http::dynamic_body> http_get(std::string& host, std::string& port, std::string& target);

#endif
