#include <iostream>

#include <nlohmann/json.hpp>
#include "client_sync.hpp"

int main(int argc, char*argv[])
{
	if (argc != 4) {
		exit(EXIT_FAILURE);
	}

	std::string host { argv[1] };
	std::string port { argv[2] };
	std::string target { argv[3] };

	auto res = http_get(host, port, target);

	std::string s = boost::beast::buffers_to_string(res.body().data());

	nlohmann::json j = nlohmann::json::parse(s);
	if (j["success"] != true) {
		throw TransactionFailedException();
	}
	if ( j["data"] == nullptr) {
		throw TransactionFailedException("No data");
	}

	std::cout << j["data"].dump() << "\n";

	return EXIT_SUCCESS;
}

