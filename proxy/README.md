# SSL Terminating Proxy for Google Compute Engine #

## Docker build: ##
```
# Build from root of project
docker build -t symboxtra/splitsound-signaling-server .
docker build -t symboxtra/splitsound-haproxy ./proxy
docker push symboxtra/splitsound-signaling-server
docker push symboxtra/splitsound-haproxy
```

## Docker Compose ##
```
# Repo setup
if [ ! -d $HOME/SplitSound-Signaling-Server ]; then
    git clone https://github.com/symboxtra/SplitSound-Signaling-Server
fi

# Startup w/ update
cd SplitSound-Signaling-Server
git pull origin master

docker-compose pull
docker-compose up -d
```

```
# Shutdown
docker-compose down
```


## Plain Docker ##

## Instance startup: ##
```
# Pull
docker pull symboxtra/splitsound-signaling-server
docker pull symboxtra/splitsound-haproxy

# Create user-defined network
docker network create --driver bridge splitsound-net

# Start signaling server
docker run -d --net=splitsound-net --name=sig1 symboxtra/splitsound-signaling-server

# Start proxy
# SSL cert is at /etc/ssl/private on the Compute instance
docker run -d --net=splitsound-net -p 80:80 -p 443:443 -v /etc/ssl/private:/etc/ssl/private --name=proxy1 symboxtra/splitsound-haproxy

# For local runs we need to mount our SSL cert wherever it is
# docker run -d --net=splitsound-net -p 80:80 -p 443:443 -v ${PWD}/proxy:/etc/ssl/private --name=proxy1 symboxtra/splitsound-haproxy
```

## Instance shutdown: ##
```
# Kill old containers
docker kill sig1
docker kill proxy1

# Remove network
docker network rm splitsound-net

# Destroy killed containers
# Prevents name clash at startup
docker system prune -f
```

## Process for goog.symboxtra.dynu.net cert: ##
1. Disable dynu.net DNS entry for goog
2. Run certbot and renew goog cert
3. Concatenate cert chain and private key (must be super user)
```
cd /etc/letsencrypt/archive/goog.symboxtra.dynu.net
cat fullchain.pem privkey.pem > goog.symboxtra.dynu.net.pem
chmod 600 goog.symboxtra.dynu.net
```
4. sftp to the Compute instance ```sftp -i ~/.ssh/goog.key.no goog```
5. Move the concatenated cert to ```/etc/ssl/private``` on the Compute instance