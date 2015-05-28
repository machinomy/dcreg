FROM ubuntu:14.04
MAINTAINER Sergey Ukustov "sergey@ukstv.me"

COPY . /tmp/dcreg
RUN apt-get -y update && \
    apt-get -y install npm && \
    cd /tmp/dcreg && \
    npm install -g && \
    update-alternatives --install /usr/bin/node node /usr/bin/nodejs 10

ENTRYPOINT ["dcreg"]