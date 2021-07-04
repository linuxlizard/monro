all: http_server_sync test_client test_uri

netrc:netrc.cc
	g++ -g3 -Wall -pedantic -o netrc -std=c++17 netrc.cc -lstdc++ -lpthread -lboost_system -lboost_filesystem -lboost_regex -lstdc++fs

# some header-only libraries git cloned into ~/src/
# ../cpp-base64 == https://github.com/ReneNyffenegger/cpp-base64
# ../n-json == https://github.com/nlohmann/json
# ../inja == https://github.com/pantor/inja.git

test_client: test_client.o client_sync.o
	gcc -g -Wall -o test_client -std=c++17 -lstdc++ -lpthread  ../cpp-base64/base64-17.o $^

test_client.o: test_client.cc 
	gcc -g -Wall -o $@ -c $^ -I../cpp-base64 -I../n-json/include

http_server_sync: http_server_sync.o client_sync.o uri.o
	gcc -g -Wall -o http_server_sync -std=c++17 -lstdc++ -lpthread  ../cpp-base64/base64-17.o $^ -lm

http_server_sync.o: http_server_sync.cc client_sync.hpp
	gcc -g -Wall -Wextra -pedantic -o $@ -c $< -I../cpp-base64 -I../n-json/include -I../inja/include/inja

uri.o: uri.cc uri.hpp
	gcc -g -Wall -Wextra -pedantic -o $@ -c $< 

test_uri: test_uri.cc uri.hpp uri.o
	gcc -g -Wall -Wextra -o $@  $< -std=c++17 -lstdc++ uri.o

client_sync.o: client_sync.cc client_sync.hpp
	gcc -g -Wall -o $@ -c $< -I../cpp-base64 -I../n-json/include

clean:
	$(RM) *.o http_server_sync test_client test_uri
