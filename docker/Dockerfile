# OneOS Dockerfile
# OS: ubuntu 18.04
# NodeJS v10
# MongoDB 4.2

FROM ubuntu:18.04

ENV DEBIAN_FRONTEND=noninteractive

EXPOSE 1883
EXPOSE 3000
EXPOSE 27017

# install dependencies
RUN apt update
RUN apt install -y sudo curl wget git gnupg

# nodejs
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - && \
apt install -y nodejs && \
node --version

# mongodb for the file system
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add - && \
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list && \
apt update && \
apt install -y mongodb-org

RUN mkdir /data && mkdir /data/db

# ffmpeg for /dev/video0
RUN apt install -y ffmpeg

# Change directories and copy init scripts
WORKDIR "/root"

# download and install OneOS from github
RUN git clone https://github.com/DependableSystemsLab/OneOS && \
cd OneOS && \
npm install -g

# after build, run it in interactive mode and:
# 1. Initialize file system via `npm run reset-fs`
# 2. Finish configuring OneOS by entering `oneos`
