FROM node:18-bullseye

# Install tools for mediasoup build
RUN apt-get update && apt-get install -y \
	build-essential \
	python3 \
	python3-pip \
	net-tools \
	iproute2 \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expone basic ports and rtcMin/rtcMax range
EXPOSE 3000
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["npm", "start"]
