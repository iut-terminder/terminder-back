FROM node:16.19

LABEL maintainer="Amir Arsalan Yavari <arya48.yavari79@gmail.com>"
LABEL description="Docker image for terMinder application backend"
LABEL org.label-schema.vcs-url="https://github.com/iut-terminder/terminder-back"

RUN adduser --disabled-password --home /app --uid 8765 --gecos "terMinder" terminder  && \
    install -m 0740 -o terminder -g terminder -d /app \
    && chown -R terminder:terminder /app/ && umask 0037
USER terminder

WORKDIR /app
COPY --chmod=700 --chown=terminder:terminder package*.json ./
RUN npm install -f
COPY --chmod=700 --chown=terminder:terminder . .
EXPOSE 8765

ENTRYPOINT ["node", "main.js"]
